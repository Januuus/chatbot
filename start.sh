#!/bin/bash

# Make scripts executable
chmod +x wait-for-db.sh

# Wait for database and initialize schema
./wait-for-db.sh

# Check if database initialization was successful
if [ $? -eq 0 ]; then
    echo "Starting application..."
    # Start the application
    if [ "$NODE_ENV" = "production" ]; then
        node src/server.js
    else
        nodemon src/server.js
    fi
else
    echo "Failed to initialize database. Exiting..."
    exit 1
fi
