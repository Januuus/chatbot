import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import config from './config.js';
import db from './db.js';

class DocumentService {
    /**
     * Validates file before processing
     */
    validateFile(file) {
        console.log('Validating file:', file.originalname, file.mimetype, file.size);

        if (!file) {
            throw new Error('No file provided');
        }

        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif'
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            throw new Error(`File type ${file.mimetype} not supported`);
        }

        if (file.size > config.documents.maxFileSize) {
            throw new Error(`File size exceeds limit of ${config.documents.maxFileSize / 1024 / 1024}MB`);
        }

        return true;
    }

    /**
     * Extracts text from documents
     */
    async extractText(file) {
        console.log('Extracting text from:', file.originalname, file.mimetype);

        try {
            switch (file.mimetype) {
                case 'application/pdf':
                    try {
                        // Add options to handle problematic PDFs
                        const options = {
                            max: 0, // no page limit
                            version: 'v2.0.550'
                        };
                        const pdfData = await pdfParse(file.buffer, options);
                        console.log('PDF processed successfully');
                        return pdfData.text || 'No text content found in PDF';
                    } catch (pdfError) {
                        console.error('PDF processing error:', pdfError);
                        throw new Error(`Failed to process PDF: ${pdfError.message}`);
                    }

                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                    try {
                        const result = await mammoth.extractRawText({ buffer: file.buffer });
                        return result.value || 'No text content found in DOCX';
                    } catch (docxError) {
                        console.error('DOCX processing error:', docxError);
                        throw new Error(`Failed to process DOCX: ${docxError.message}`);
                    }

                case 'text/plain':
                    return file.buffer.toString('utf-8');

                default:
                    return ''; // For images, we don't extract text
            }
        } catch (error) {
            console.error('Text extraction error:', error);
            throw new Error(`Failed to extract text: ${error.message}`);
        }
    }

    /**
     * Splits text into manageable chunks
     */
    createChunks(text, chunkSize = config.documents.chunkSize) {
        if (!text) return [];

        try {
            const chunks = [];
            const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
            let currentChunk = '';

            for (const sentence of sentences) {
                if ((currentChunk + sentence).length <= chunkSize) {
                    currentChunk += sentence;
                } else {
                    if (currentChunk) chunks.push(currentChunk.trim());
                    currentChunk = sentence;
                }
            }

            if (currentChunk) chunks.push(currentChunk.trim());
            return chunks;
        } catch (error) {
            console.error('Error creating chunks:', error);
            return [text]; // Return full text as single chunk if chunking fails
        }
    }

    /**
     * Processes and stores a document
     */
    async processDocument(file) {
        console.log('Processing document:', file.originalname);

        try {
            this.validateFile(file);

            const documentId = uuidv4();
            const isImage = file.mimetype.startsWith('image/');

            // For images, store the base64 data
            const base64Data = isImage ? file.buffer.toString('base64') : null;

            // For documents, extract text
            let text = '';
            if (!isImage) {
                try {
                    text = await this.extractText(file);
                    if (!text) {
                        throw new Error('No text content could be extracted');
                    }
                } catch (extractError) {
                    console.error('Text extraction failed:', extractError);
                    throw new Error(`Failed to extract text: ${extractError.message}`);
                }
            }

            const chunks = this.createChunks(text);

            // Save to database
            try {
                await db.saveDocument(
                    documentId,
                    file.originalname,
                    text,
                    file.mimetype,
                    file.size,
                    isImage ? base64Data : null
                );

                // Save chunks for documents
                if (!isImage && chunks.length > 0) {
                    await db.saveDocumentChunks(documentId, chunks);
                }
            } catch (dbError) {
                console.error('Database error:', dbError);
                throw new Error(`Failed to save to database: ${dbError.message}`);
            }

            return {
                id: documentId,
                name: file.originalname,
                type: file.mimetype,
                size: file.size,
                chunks: chunks.length,
                isImage
            };

        } catch (error) {
            console.error('Document processing error:', error);
            throw new Error(`Failed to process document: ${error.message}`);
        }
    }

    /**
     * Gets image data for Claude processing
     */
    async getImageData(id) {
        try {
            const document = await db.getDocument(id);
            if (!document || !document.type.startsWith('image/')) {
                throw new Error('Image not found or invalid type');
            }

            return {
                type: document.type,
                data: document.original_content
            };
        } catch (error) {
            console.error('Get image error:', error);
            throw new Error(`Failed to retrieve image: ${error.message}`);
        }
    }

    /**
     * Handles errors in a consistent way
     */
    handleError(error) {
        console.error('Document Service Error:', error);

        return {
            error: true,
            message: error.message || 'An unexpected error occurred',
            code: error.status || 500
        };
    }
}

// Create and export a single instance
const documentService = new DocumentService();
export default documentService;
