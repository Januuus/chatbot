import mysql from 'mysql2/promise';
import config from './config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Database {
    constructor() {
        this.pool = null;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.retryDelay = 5000; // 5 seconds
    }

    async initialize() {
        try {
            // Create a temporary connection without database
            const connection = await mysql.createConnection({
                host: config.database.host,
                user: config.database.user,
                password: config.database.password,
                port: config.database.port,
                multipleStatements: true
            });

            // Read and execute schema
            const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            await connection.query(schema);
            console.log('Database schema initialized successfully');

            // Close temporary connection
            await connection.end();

        } catch (error) {
            console.error('Failed to initialize database schema:', error);
            throw error;
        }
    }

    async connect() {
        try {
            if (!this.pool) {
                // First try to initialize the schema
                await this.initialize();

                // Then create the connection pool
                this.pool = mysql.createPool({
                    ...config.database,
                    waitForConnections: true,
                    connectionLimit: 5,
                    queueLimit: 0
                });

                console.log('Database connection pool established successfully');
            }
            return this.pool;
        } catch (error) {
            console.error('Failed to establish database connection:', error);
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`Retrying connection in ${this.retryDelay / 1000} seconds... (Attempt ${this.retryCount}/${this.maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.connect();
            }
            throw error;
        }
    }

    async query(sql, params = []) {
        const pool = await this.connect();
        try {
            const [results] = await pool.execute(sql, params);
            return results;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async saveConversation(id, query, response, hasImage, outputTokens) {
        const sql = `
            INSERT INTO chat_history (id, user_message, bot_response, metadata)
            VALUES (?, ?, ?, ?)
        `;
        const metadata = JSON.stringify({
            hasImage,
            outputTokens,
            timestamp: new Date().toISOString()
        });
        return this.query(sql, [id, query, response, metadata]);
    }

    async getConversationHistory(limit = 10) {
        const sql = `
            SELECT * FROM chat_history
            ORDER BY created_at DESC
            LIMIT ?
        `;
        return this.query(sql, [limit]);
    }

    async saveDocument(id, filename, content, mimeType, fileSize) {
        const sql = `
            INSERT INTO documents (id, filename, content, mime_type, file_size)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            content = VALUES(content),
            mime_type = VALUES(mime_type),
            file_size = VALUES(file_size),
            updated_at = CURRENT_TIMESTAMP
        `;
        return this.query(sql, [id, filename, content, mimeType, fileSize]);
    }

    async getDocument(id) {
        const sql = `
            SELECT * FROM documents
            WHERE id = ?
        `;
        const results = await this.query(sql, [id]);
        return results[0];
    }

    async searchDocuments(searchTerm, limit = 10) {
        const sql = `
            SELECT id, filename, mime_type, file_size, created_at
            FROM documents
            WHERE MATCH(content) AGAINST(? IN NATURAL LANGUAGE MODE)
            LIMIT ?
        `;
        return this.query(sql, [searchTerm, limit]);
    }

    async cleanup() {
        if (this.pool) {
            try {
                await this.pool.end();
                console.log('Database connection pool closed');
            } catch (error) {
                console.error('Error closing database connection pool:', error);
            }
            this.pool = null;
        }
    }
}

// Create a single instance
const db = new Database();

// Handle cleanup on process termination
process.on('SIGINT', async () => {
    console.log('Received SIGINT. Cleaning up...');
    await db.cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Cleaning up...');
    await db.cleanup();
    process.exit(0);
});

export default db;
