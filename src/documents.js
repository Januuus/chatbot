import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import config from './config.js';
import db from './db.js';

class DocumentService {
    /**
     * Validates file before processing
     */
    validateFile(file) {
        if (!file) {
            throw new Error('No file provided');
        }

        const allowedTypes = [
            // Documents
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            // Images
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif'
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            throw new Error('File type not supported');
        }

        if (file.size > config.documents.maxFileSize) {
            throw new Error(`File size exceeds limit of ${config.documents.maxFileSize / 1024 / 1024}MB`);
        }

        return true;
    }

    /**
     * Extracts text from documents (not images)
     */
    async extractText(file) {
        try {
            switch (file.mimetype) {
                case 'application/pdf':
                    const pdfData = await pdfParse(file.buffer);
                    return pdfData.text;

                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                    const result = await mammoth.extractRawText({ buffer: file.buffer });
                    return result.value;

                case 'text/plain':
                    return file.buffer.toString('utf-8');

                default:
                    return ''; // For images, we don't extract text
            }
        } catch (error) {
            console.error('Text extraction error:', error);
            throw new Error(`Failed to extract text from ${file.originalname}`);
        }
    }

    /**
     * Splits text into manageable chunks
     */
    createChunks(text, chunkSize = config.documents.chunkSize) {
        if (!text) return [];

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
    }

    /**
     * Processes and stores a document or image
     */
    async processDocument(file) {
        try {
            this.validateFile(file);

            const documentId = uuidv4();
            const isImage = file.mimetype.startsWith('image/');

            // For images, we store the base64 data for Claude to process
            const base64Data = file.buffer.toString('base64');

            // For documents, we extract text
            const text = isImage ? '' : await this.extractText(file);
            const chunks = this.createChunks(text);

            // Save to database
            await db.saveDocument(
                documentId,
                file.originalname,
                text,
                file.mimetype,
                file.size,
                isImage ? base64Data : null // Store base64 only for images
            );

            // Save chunks for documents (not images)
            if (!isImage && chunks.length > 0) {
                await db.saveDocumentChunks(documentId, chunks);
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
                data: document.original_content // base64 data
            };
        } catch (error) {
            console.error('Get image error:', error);
            throw new Error(`Failed to retrieve image: ${error.message}`);
        }
    }

    /**
     * Searches documents based on query
     */
    async searchDocuments(query) {
        try {
            if (!query || typeof query !== 'string') {
                throw new Error('Invalid search query');
            }

            return await db.searchDocuments(query);
        } catch (error) {
            console.error('Document search error:', error);
            throw new Error('Failed to search documents');
        }
    }

    /**
     * Gets a specific document
     */
    async getDocument(id) {
        try {
            if (!id) {
                throw new Error('Document ID is required');
            }

            const document = await db.getDocument(id);
            if (!document) {
                throw new Error('Document not found');
            }

            return document;
        } catch (error) {
            console.error('Get document error:', error);
            throw new Error(`Failed to retrieve document: ${error.message}`);
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
