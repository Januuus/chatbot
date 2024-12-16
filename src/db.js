import mysql from 'mysql2/promise';
import config from './config.js';

class Database {
    constructor() {
        this.pool = null;
    }

    async connect() {
        try {
            this.pool = mysql.createPool(config.database);

            // Test connection
            const connection = await this.pool.getConnection();
            console.log('Database connection established successfully');
            connection.release();

            return this.pool;
        } catch (error) {
            console.error('Failed to establish database connection:', error);
            throw error;
        }
    }

    async query(sql, params = []) {
        try {
            const [results] = await this.pool.execute(sql, params);
            return results;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    // Document operations
    async saveDocument(id, name, content, type, size) {
        const sql = `
            INSERT INTO documents (id, name, content, type, size)
            VALUES (?, ?, ?, ?, ?)
        `;
        return this.query(sql, [id, name, content, type, size]);
    }

    async saveDocumentChunks(documentId, chunks) {
        const sql = `
            INSERT INTO document_chunks (id, document_id, content, chunk_index)
            VALUES (UUID(), ?, ?, ?)
        `;

        const promises = chunks.map((chunk, index) =>
            this.query(sql, [documentId, chunk, index])
        );

        return Promise.all(promises);
    }

    async getDocument(id) {
        const sql = 'SELECT * FROM documents WHERE id = ?';
        const results = await this.query(sql, [id]);
        return results[0];
    }

    async searchDocuments(searchTerm) {
        const sql = `
            SELECT id, name, type, created_at 
            FROM documents 
            WHERE name LIKE ? OR content LIKE ?
            ORDER BY created_at DESC
        `;
        const searchPattern = `%${searchTerm}%`;
        return this.query(sql, [searchPattern, searchPattern]);
    }

    // Conversation operations
    async saveConversation(id, query, response, documentRefs, tokensUsed) {
        const sql = `
            INSERT INTO conversations (id, query, response, document_refs, tokens_used)
            VALUES (?, ?, ?, ?, ?)
        `;
        return this.query(sql, [id, query, response, documentRefs, tokensUsed]);
    }

    async getConversationHistory(limit = 10) {
        const sql = `
            SELECT * FROM conversations 
            ORDER BY created_at DESC 
            LIMIT ?
        `;
        return this.query(sql, [limit]);
    }

    // Utility methods
    async getRelevantDocumentChunks(query, limit = 5) {
        // Simple relevance search based on LIKE
        // In a production environment, consider using full-text search or more sophisticated matching
        const sql = `
            SELECT dc.*, d.name as document_name
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE dc.content LIKE ?
            LIMIT ?
        `;
        const searchPattern = `%${query}%`;
        return this.query(sql, [searchPattern, limit]);
    }

    async cleanup() {
        if (this.pool) {
            await this.pool.end();
            console.log('Database connection closed');
        }
    }
}

// Create and export a single instance
const db = new Database();

// Handle cleanup on process termination
process.on('SIGINT', async () => {
    await db.cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await db.cleanup();
    process.exit(0);
});

export default db;
