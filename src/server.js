import express from 'express';
import cors from 'cors';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

import config from './config.js';
import db from './db.js';
import claudeService from './claude.js';
import documentService from './documents.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize express app
const app = express();

// Configure multer for file uploads with error handling
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: config.documents.maxFileSize
    },
    fileFilter: (req, file, cb) => {
        console.log('Processing file:', file.originalname, file.mimetype);
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
            return cb(new Error(`File type ${file.mimetype} not supported`), false);
        }
        cb(null, true);
    }
}).single('file');

// Custom error handling for multer
const handleUpload = (req, res, next) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(400).json({
                error: true,
                message: `File upload error: ${err.message}`
            });
        } else if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({
                error: true,
                message: err.message
            });
        }
        next();
    });
};

// Middleware
app.use(compression());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Debug middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    console.log('Headers:', req.headers);
    next();
});

// API Key middleware
const validateApiKey = (req, res, next) => {
    const apiKey = req.header('X-API-Key');
    console.log('Validating API Key');

    if (!apiKey || apiKey !== config.security.requiredApiKey) {
        console.log('API Key validation failed');
        return res.status(401).json({
            error: true,
            message: 'Invalid or missing API key'
        });
    }

    next();
};

// Root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Chat endpoint with file handling
app.post('/api/chat', validateApiKey, handleUpload, async (req, res) => {
    try {
        console.log('Processing chat request');
        const query = req.body.query;

        if (!query) {
            return res.status(400).json({
                error: true,
                message: 'Query is required'
            });
        }

        let fileContent = '';
        if (req.file) {
            try {
                console.log('Processing uploaded file');
                const result = await documentService.processDocument(req.file);
                fileContent = `Content from uploaded file "${req.file.originalname}":\n\n`;

                // Get document content from database
                const doc = await db.getDocument(result.id);
                if (doc && doc.content) {
                    fileContent += doc.content;
                }
            } catch (fileError) {
                console.error('File processing error:', fileError);
                return res.status(400).json({
                    error: true,
                    message: `File processing error: ${fileError.message}`
                });
            }
        }

        // Combine query with file content
        const fullQuery = fileContent ? `${query}\n\nContext from uploaded file:\n${fileContent}` : query;

        const response = await claudeService.processQuery(fullQuery);
        res.json(response);

    } catch (error) {
        console.error('Chat endpoint error:', error);
        res.status(500).json({
            error: true,
            message: `Error processing request: ${error.message}`
        });
    }
});

// Document upload endpoint
app.post('/api/documents', validateApiKey, handleUpload, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const result = await documentService.processDocument(req.file);
        res.json(result);
    } catch (error) {
        console.error('Document upload error:', error);
        res.status(500).json({
            error: true,
            message: `Error uploading document: ${error.message}`
        });
    }
});

// Document search endpoint
app.get('/api/documents/search', validateApiKey, async (req, res) => {
    try {
        const { query } = req.query;
        const results = await documentService.searchDocuments(query);
        res.json(results);
    } catch (error) {
        console.error('Document search error:', error);
        res.status(500).json({
            error: true,
            message: `Error searching documents: ${error.message}`
        });
    }
});

// Get specific document
app.get('/api/documents/:id', validateApiKey, async (req, res) => {
    try {
        const document = await documentService.getDocument(req.params.id);
        res.json(document);
    } catch (error) {
        console.error('Get document error:', error);
        res.status(500).json({
            error: true,
            message: `Error retrieving document: ${error.message}`
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: true,
        message: 'An unexpected error occurred',
        details: err.message
    });
});

// Initialize database connection and start server
const startServer = async () => {
    try {
        await db.connect();

        const port = process.env.PORT || 10000;

        app.listen(port, '0.0.0.0', () => {
            console.log(`Server running on port ${port}`);
            console.log('Required API Key:', config.security.requiredApiKey);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer().catch(console.error);
