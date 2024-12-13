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
        port: process.env.DB_PORT || 3306 // MySQL port
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
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
        allowedTypes: [
            // Documents
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            // Images
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif'
        ],
        chunkSize: parseInt(process.env.CHUNK_SIZE) || 1000 // characters per chunk
    },

    // Rate limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX) || 100 // limit each IP to 100 requests per windowMs
    },

    // Security
    security: {
        apiKeyHeader: 'X-API-Key',
        requiredApiKey: process.env.REQUIRED_API_KEY
    }
};

// Validate required environment variables
const requiredEnvVars = ['CLAUDE_API_KEY', 'DB_PASSWORD'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missingEnvVars.join(', ')}`);
}

// Export configuration object
export default config;
