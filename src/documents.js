import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    }

    async processDocument(file) {
        try {
            console.log(`Processing document: ${file.originalname}`);

            // Validate file type
            if (!this.allowedTypes.includes(file.mimetype)) {
                throw new Error(`Unsupported file type: ${file.mimetype}`);
            }

            // Generate unique ID
            const documentId = uuidv4();

            // Extract text content based on file type
            let content = '';
            if (file.mimetype === 'text/plain') {
                content = file.buffer.toString('utf8');
            } else if (file.mimetype === 'application/pdf') {
                content = await this.extractTextFromPDF(file.buffer);
            } else if (file.mimetype.startsWith('image/')) {
                // For images, we'll just store metadata
                content = `Image file: ${file.originalname}`;
            }

            // Save to database
            await db.saveDocument(
                documentId,
                file.originalname || 'unnamed',
                content || '',
                file.mimetype || 'application/octet-stream',
                file.size || 0
            );

            return {
                id: documentId,
                filename: file.originalname,
                status: 'success'
            };

        } catch (error) {
            console.error('Document processing error:', error);
            throw new Error(`Failed to process document: ${error.message}`);
        }
    }

    async extractTextFromPDF(buffer) {
        try {
            // Simple text extraction for now
            // You might want to use a proper PDF parsing library
            return buffer.toString('utf8');
        } catch (error) {
            console.error('PDF extraction error:', error);
            return '';
        }
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
}

const documentService = new DocumentService();
export default documentService;
