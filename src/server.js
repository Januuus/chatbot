import express from 'express';
import cors from 'cors';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import config from './config.js';
import db from './db.js';
import claudeService from './claude.js';
import documentService from './documents.js';
import chunkSelector from './chunkSelector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Process training documents from training-docs folder
async function processTrainingDocuments() {
    console.log('Processing training documents...');
    try {
        const trainingPath = path.join(__dirname, '..', 'training-docs');
        if (fs.existsSync(trainingPath)) {
            const files = fs.readdirSync(trainingPath);
            for (const file of files) {
                const filePath = path.join(trainingPath, file);
                const fileBuffer = fs.readFileSync(filePath);
                const fileObj = {
                    originalname: file,
                    buffer: fileBuffer,
                    mimetype: file.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
                    isTrainingDoc: true // Mark as training document
                };
                await documentService.processDocument(fileObj);
                console.log(`Processed training document: ${file}`);
            }
            console.log('Training documents processed successfully');
        }
    } catch (error) {
        console.error('Failed to process training documents:', error);
        // Continue even if processing fails
    }
}

// Initialize express app
const app = express();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: config.documents.maxFileSize
    }
}).any(); // Accept any files

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
        console.log('Files:', req.files);
        console.log('Body:', req.body);

        const query = req.body.query;
        if (!query) {
            return res.status(400).json({
                error: true,
                message: 'Query is required'
            });
        }

        // First, get relevant chunks from training documents
        const relevantChunks = await chunkSelector.selectRelevantChunks(query);
        console.log(`Selected ${relevantChunks.length} relevant chunks from training docs`);

        // Format training chunks
        const trainingContent = relevantChunks.map(chunk =>
            `From ${chunk.metadata.filename} (Part ${chunk.metadata.chunkNumber}/${chunk.metadata.totalChunks}):\n${chunk.content}`
        ).join('\n\n');

        // Handle user-uploaded files
        let processedContent = '';
        let imageData = null;

        if (req.files && req.files.length > 0) {
            try {
                for (const file of req.files) {
                    console.log('Processing uploaded file:', file.originalname, file.mimetype);

                    if (file.mimetype.startsWith('image/')) {
                        // Use the first image for Claude's vision capability
                        if (!imageData) {
                            imageData = {
                                type: file.mimetype,
                                data: file.buffer.toString('base64')
                            };
                            console.log('Image data prepared for Claude');
                        }
                    } else {
                        // Process other uploaded files
                        const result = await documentService.processDocument({
                            ...file,
                            isTrainingDoc: false // Mark as not a training document
                        });
                        const doc = await db.getDocument(result.id);
                        if (doc && doc.content) {
                            processedContent += `\n\nContent from uploaded file ${file.originalname}:\n${doc.content}`;
                        }
                    }
                }
            } catch (fileError) {
                console.error('File processing error:', fileError);
                return res.status(400).json({
                    error: true,
                    message: `File processing error: ${fileError.message}`
                });
            }
        }

        // Combine everything for Claude
        let fullQuery = query;
        if (trainingContent) {
            fullQuery += `\n\nRelevant context from teaching materials:\n${trainingContent}`;
        }
        if (processedContent) {
            fullQuery += `\n\nContent from uploaded files:${processedContent}`;
        }

        console.log('Sending to Claude:', {
            query: fullQuery,
            hasImage: !!imageData,
            numTrainingChunks: relevantChunks.length,
            hasUploadedContent: !!processedContent
        });

        // Send to Claude with image if present
        const response = await claudeService.processQuery(fullQuery, imageData);
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
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const results = await Promise.all(
            req.files.map(file => documentService.processDocument({
                ...file,
                isTrainingDoc: false // Mark as not a training document
            }))
        );

        res.json(results);
    } catch (error) {
        console.error('Document upload error:', error);
        res.status(500).json({
            error: true,
            message: `Error uploading documents: ${error.message}`
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
        // Connect to database (this will also initialize schema)
        await db.connect();

        // Process training documents
        await processTrainingDocuments();

        const port = process.env.PORT || 3000;

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
