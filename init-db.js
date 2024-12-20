import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './src/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabase() {
    console.log('Starting database initialization...');

    try {
        // Connect using configured database credentials
        const connection = await mysql.createConnection({
            host: config.database.host,
            user: config.database.user,
            password: config.database.password,
            database: config.database.database,
            port: config.database.port,
            multipleStatements: true
        });

        console.log('Connected to database...');

        // Read and execute schema
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema...');
        await connection.query(schema);
        console.log('Schema executed successfully');

        await connection.end();
        console.log('Database initialization completed successfully');

    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
}

// Run initialization
initializeDatabase().catch(console.error);
