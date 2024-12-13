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

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize express app
const app = express();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: config.documents.maxFileSize
    }
});

// Middleware
app.use(compression()); // Compress responses
app.use(cors({
    origin: config.server.corsOrigin,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', config.security.apiKeyHeader]
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter); // Apply rate limiting to API routes only

// API Key middleware
const validateApiKey = (req, res, next) => {
    const apiKey = req.header(config.security.apiKeyHeader);

    if (config.security.requiredApiKey && apiKey !== config.security.requiredApiKey) {
        return res.status(401).json({ error: 'Invalid API key' });
    }

    next();
};

// Root path - serve the chat interface
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Chat endpoint
app.post('/api/chat', validateApiKey, upload.single('image'), async (req, res) => {
    try {
        const query = req.body.query;
        const includeContext = req.body.includeContext !== false;
        let imageData = null;

        // Handle image if provided
        if (req.file && req.file.mimetype.startsWith('image/')) {
            imageData = {
                type: req.file.mimetype,
                data: req.file.buffer.toString('base64')
            };
        }
        // Handle image reference if provided
        else if (req.body.imageId) {
            try {
                imageData = await documentService.getImageData(req.body.imageId);
            } catch (error) {
                console.warn('Failed to get image data:', error);
                // Continue without image if not found
            }
        }

        // Validate query
        const validatedQuery = claudeService.validateQuery(query);

        // Process query with optional image
        const response = await claudeService.processQuery(validatedQuery, imageData, includeContext);

        res.json(response);
    } catch (error) {
        const errorResponse = claudeService.handleError(error);
        res.status(errorResponse.code).json(errorResponse);
    }
});

// Document upload endpoint
app.post('/api/documents', validateApiKey, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const result = await documentService.processDocument(req.file);
        res.json(result);
    } catch (error) {
        const errorResponse = documentService.handleError(error);
        res.status(errorResponse.code).json(errorResponse);
    }
});

// Document search endpoint
app.get('/api/documents/search', validateApiKey, async (req, res) => {
    try {
        const { query } = req.query;
        const results = await documentService.searchDocuments(query);
        res.json(results);
    } catch (error) {
        const errorResponse = documentService.handleError(error);
        res.status(errorResponse.code).json(errorResponse);
    }
});

// Get specific document
app.get('/api/documents/:id', validateApiKey, async (req, res) => {
    try {
        const document = await documentService.getDocument(req.params.id);
        res.json(document);
    } catch (error) {
        const errorResponse = documentService.handleError(error);
        res.status(errorResponse.code).json(errorResponse);
    }
});

// Get conversation history
app.get('/api/conversations', validateApiKey, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const history = await claudeService.getHistory(limit);
        res.json(history);
    } catch (error) {
        const errorResponse = claudeService.handleError(error);
        res.status(errorResponse.code).json(errorResponse);
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: true,
        message: 'An unexpected error occurred',
        code: 500
    });
});

// Initialize database connection and start server
const startServer = async () => {
    try {
        await db.connect();

        // Use Render's PORT environment variable (defaults to 10000)
        const port = process.env.PORT || 10000;

        app.listen(port, '0.0.0.0', () => {
            console.log(`Server running on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle process termination
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    await db.cleanup();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down gracefully...');
    await db.cleanup();
    process.exit(0);
});

// Start the server
startServer();
