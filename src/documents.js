import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.js';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure PDF.js for Node environment
const pdfjsWorker = path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.js');
if (typeof window === 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

class DocumentService {
    constructor() {
        this.allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif'
        ];
        this.chunkSize = 2000; // characters per chunk
        this.overlap = 200;    // overlap between chunks
    }

    async processDocument(file) {
        try {
            console.log(`Processing document: ${file.originalname}`);

            // Validate file type
            if (!this.allowedTypes.includes(file.mimetype)) {
                throw new Error(`Unsupported file type: ${file.mimetype}`);
            }

            // Generate unique ID for the document
            const documentId = uuidv4();

            // Extract text content based on file type
            let content = '';
            if (file.mimetype === 'text/plain') {
                content = file.buffer.toString('utf8');
            } else if (file.mimetype === 'application/pdf') {
                content = await this.extractTextFromPDF(file.buffer);
                console.log(`Extracted ${content.length} characters from PDF`);
            } else if (file.mimetype.startsWith('image/')) {
                content = `Image file: ${file.originalname}`;
            }

            if (file.isTrainingDoc) {
                // For training documents, split into chunks
                const chunks = this.splitIntoChunks(content);
                console.log(`Split ${file.originalname} into ${chunks.length} chunks`);

                // Save document record
                await db.saveDocument(
                    documentId,
                    file.originalname,
                    content,
                    file.mimetype,
                    file.size,
                    true // isTrainingDoc
                );

                // Save chunks
                for (let i = 0; i < chunks.length; i++) {
                    const chunkId = uuidv4();
                    await db.saveDocumentChunk(
                        chunkId,
                        documentId,
                        i,
                        chunks[i],
                        {
                            filename: file.originalname,
                            chunkNumber: i + 1,
                            totalChunks: chunks.length,
                            isTrainingDoc: true
                        }
                    );
                }

                return {
                    id: documentId,
                    filename: file.originalname,
                    chunks: chunks.length,
                    status: 'success'
                };

            } else {
                // For user uploads, save as a single document
                await db.saveDocument(
                    documentId,
                    file.originalname,
                    content,
                    file.mimetype,
                    file.size,
                    false // not a training doc
                );

                return {
                    id: documentId,
                    filename: file.originalname,
                    status: 'success'
                };
            }

        } catch (error) {
            console.error('Document processing error:', error);
            throw new Error(`Failed to process document: ${error.message}`);
        }
    }

    async extractTextFromPDF(buffer) {
        try {
            // Load the PDF document
            const data = new Uint8Array(buffer);
            const loadingTask = pdfjs.getDocument({ data });
            const pdf = await loadingTask.promise;

            let text = '';
            // Extract text from each page
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const strings = content.items.map(item => item.str);
                text += strings.join(' ') + '\n';
            }

            return text;
        } catch (error) {
            console.error('PDF extraction error:', error);
            throw error; // Throw error to handle it in processDocument
        }
    }

    splitIntoChunks(content) {
        const chunks = [];
        const sentences = content.split(/[.!?]+\s+/); // Split by sentence boundaries
        let currentChunk = '';

        for (const sentence of sentences) {
            // If adding this sentence would exceed chunk size
            if (currentChunk.length + sentence.length > this.chunkSize) {
                // Save current chunk
                chunks.push(currentChunk.trim());
                // Start new chunk with overlap from previous chunk
                const words = currentChunk.split(' ');
                currentChunk = words.slice(-this.overlap).join(' ') + ' ' + sentence;
            } else {
                // Add sentence to current chunk
                currentChunk += (currentChunk ? ' ' : '') + sentence;
            }
        }

        // Add final chunk if not empty
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    async searchDocuments(searchTerm, limit = 10) {
        try {
            if (!searchTerm) {
                throw new Error('Search term is required');
            }

            return await db.searchDocuments(searchTerm, limit);
        } catch (error) {
            console.error('Document search error:', error);
            throw error;
        }
    }

    async getDocument(id) {
        try {
            if (!id) {
                throw new Error('Document ID is required');
            }

            return await db.getDocument(id);
        } catch (error) {
            console.error('Get document error:', error);
            throw error;
        }
    }

    async getAllTrainingChunks() {
        try {
            return await db.getAllDocumentChunks(true); // Only get training chunks
        } catch (error) {
            console.error('Get chunks error:', error);
            throw error;
        }
    }
}

const documentService = new DocumentService();
export default documentService;
