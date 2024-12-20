#!/bin/bash

# Maximum number of retries
max_retries=30
# Delay between retries in seconds
retry_delay=5

echo "Waiting for database connection..."

# Counter for retry attempts
counter=0

while [ $counter -lt $max_retries ]; do
    # Try to connect to the database
    node -e "
        const mysql = require('mysql2/promise');
        const config = require('./src/config.js').default;
        
        async function checkConnection() {
            try {
                const connection = await mysql.createConnection({
                    host: config.database.host,
                    user: config.database.user,
                    password: config.database.password,
                    database: config.database.database,
                    port: config.database.port
                });
                
                await connection.query('SELECT 1');
                await connection.end();
                console.log('Database connection successful');
                process.exit(0);
            } catch (error) {
                console.error('Database connection failed:', error.message);
                process.exit(1);
            }
        }
        
        checkConnection();
    "

    # Check if the connection was successful
    if [ $? -eq 0 ]; then
        echo "Database is ready!"
        
        # Initialize database schema
        echo "Initializing database schema..."
        node init-db.js
        
        if [ $? -eq 0 ]; then
            echo "Database schema initialized successfully"
            exit 0
        else
            echo "Failed to initialize database schema"
            exit 1
        fi
    fi

    # Increment counter and wait before retry
    counter=$((counter + 1))
    echo "Attempt $counter of $max_retries failed. Retrying in $retry_delay seconds..."
    sleep $retry_delay
done

echo "Failed to connect to database after $max_retries attempts"
exit 1
