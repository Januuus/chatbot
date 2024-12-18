import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import config from './src/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabase() {
    console.log('Initializing database...');

    let connection;
    try {
        // Create connection without database specified
        connection = await mysql.createConnection({
            host: config.database.host,
            user: config.database.user,
            password: config.database.password,
            multipleStatements: true // Enable multiple statements
        });

        // Read schema file
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Execute schema
        console.log('Creating database and tables...');
        await connection.query(schema);
        console.log('Database initialized successfully');

    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    } finally {
        if (connection) {
            try {
                await connection.end();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
}

// Run initialization
console.log('Starting database initialization...');
initializeDatabase().then(() => {
    console.log('Database initialization complete');
}).catch(error => {
    console.error('Database initialization failed:', error);
    process.exit(1);
});
