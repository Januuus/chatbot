import mysql from 'mysql2/promise';
import config from './config.js';

class Database {
    constructor() {
        this.pool = null;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.retryDelay = 5000; // 5 seconds
    }

    async connect() {
        try {
            if (!this.pool) {
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

    async saveDocument(id, filename, content, mimeType, fileSize, isTrainingDoc = false) {
        const sql = `
            INSERT INTO documents (id, filename, content, mime_type, file_size, is_training_doc)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            content = VALUES(content),
            mime_type = VALUES(mime_type),
            file_size = VALUES(file_size),
            is_training_doc = VALUES(is_training_doc),
            updated_at = CURRENT_TIMESTAMP
        `;
        return this.query(sql, [id, filename, content, mimeType, fileSize, isTrainingDoc]);
    }

    async saveDocumentChunk(id, documentId, chunkIndex, content, metadata) {
        const sql = `
            INSERT INTO document_chunks (id, document_id, chunk_index, content, metadata)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            content = VALUES(content),
            metadata = VALUES(metadata)
        `;
        return this.query(sql, [id, documentId, chunkIndex, content, JSON.stringify(metadata)]);
    }

    async getDocument(id) {
        const sql = `
            SELECT * FROM documents
            WHERE id = ?
        `;
        const results = await this.query(sql, [id]);
        return results[0];
    }

    async getAllDocumentChunks(trainingOnly = false) {
        const sql = `
            SELECT c.*, d.filename
            FROM document_chunks c
            JOIN documents d ON c.document_id = d.id
            ${trainingOnly ? 'WHERE d.is_training_doc = true' : ''}
            ORDER BY d.filename, c.chunk_index
        `;
        return this.query(sql);
    }

    async searchDocuments(searchTerm, limit = 10) {
        const sql = `
            SELECT id, filename, mime_type, file_size, created_at, is_training_doc
            FROM documents
            WHERE MATCH(content) AGAINST(? IN NATURAL LANGUAGE MODE)
            LIMIT ?
        `;
        return this.query(sql, [searchTerm, limit]);
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
