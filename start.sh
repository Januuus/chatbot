#!/bin/bash

echo "Initializing database..."
node init-db.js

echo "Processing training documents..."
node process-training.js

echo "Starting server..."
node src/server.js
