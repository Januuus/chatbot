import dotenv from 'dotenv';
dotenv.config();

const config = {
    // Server configuration
    server: {
        nodeEnv: process.env.NODE_ENV || 'development',
        corsOrigin: process.env.CORS_ORIGIN || '*'
    },

    // Database configuration
    database: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'chatbot',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'claude_chatbot',
        port: parseInt(process.env.DB_PORT) || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
    },

    // Claude API configuration
    claude: {
        apiKey: process.env.CLAUDE_API_KEY,
        model: process.env.MODEL || 'claude-3-sonnet-20240229',
        maxTokens: parseInt(process.env.MAX_TOKENS) || 4096,
        temperature: parseFloat(process.env.TEMPERATURE) || 0.7
    },

    // OpenAI API configuration (for chunk selection)
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo-16k',
        maxTokens: 1000,
        temperature: 0.0  // Keep it focused for chunk selection
    },

    // Document processing
    documents: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
        chunkSize: parseInt(process.env.CHUNK_SIZE) || 2000,
        allowedTypes: [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif'
        ]
    },

    // Security
    security: {
        apiKeyHeader: 'X-API-Key',
        requiredApiKey: process.env.REQUIRED_API_KEY
    }
};

// Validate required environment variables
const requiredVars = {
    'CLAUDE_API_KEY': config.claude.apiKey,
    'OPENAI_API_KEY': config.openai.apiKey,
    'DB_PASSWORD': config.database.password,
    'REQUIRED_API_KEY': config.security.requiredApiKey
};

const missingVars = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

if (missingVars.length > 0) {
    throw new Error(
        `Missing required environment variables:\n${missingVars.map(v => `- ${v}`).join('\n')}\n` +
        'Please ensure all required variables are set in your environment or .env file.'
    );
}

// Log non-sensitive configuration on startup
console.log('Configuration loaded:', {
    nodeEnv: config.server.nodeEnv,
    corsOrigin: config.server.corsOrigin,
    dbHost: config.database.host,
    apiKeyHeader: config.security.apiKeyHeader,
    model: config.claude.model,
    openaiModel: config.openai.model,
    chunkSize: config.documents.chunkSize
});

export default config;
