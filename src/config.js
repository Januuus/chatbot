import dotenv from 'dotenv';
dotenv.config();

export const config = {
    // Server configuration
    server: {
        nodeEnv: process.env.NODE_ENV || 'development',
        corsOrigin: process.env.CORS_ORIGIN || '*'
    },

    // Database configuration
    database: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'claude_chatbot',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        port: process.env.DB_PORT || 3306
    },

    // Claude API configuration
    claude: {
        apiKey: process.env.CLAUDE_API_KEY,
        model: 'claude-3-sonnet-20240229',
        maxTokens: parseInt(process.env.MAX_TOKENS) || 4096,
        temperature: parseFloat(process.env.TEMPERATURE) || 0.7
    },

    // Document processing
    documents: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
        allowedTypes: [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif'
        ],
        chunkSize: parseInt(process.env.CHUNK_SIZE) || 1000
    },

    // Rate limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX) || 100
    },

    // Security
    security: {
        apiKeyHeader: 'X-API-Key',
        requiredApiKey: process.env.REQUIRED_API_KEY || 'd657a91c9708a863991e0eaf95a5c718' // Match the frontend API key
    }
};

// Log configuration on startup
console.log('Configuration loaded:', {
    nodeEnv: config.server.nodeEnv,
    corsOrigin: config.server.corsOrigin,
    dbHost: config.database.host,
    apiKeyHeader: config.security.apiKeyHeader,
    requiredApiKey: config.security.requiredApiKey
});

export default config;
