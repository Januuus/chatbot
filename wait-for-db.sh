#!/bin/bash

echo "Waiting for database to be ready..."

# Maximum number of attempts
max_attempts=30
attempt_num=1

while [ $attempt_num -le $max_attempts ]; do
    echo "Attempt $attempt_num of $max_attempts..."
    
    # Try to connect to MySQL
    if mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT 1" &> /dev/null; then
        echo "Database is ready!"
        exit 0
    fi
    
    echo "Database not ready yet..."
    sleep 2
    attempt_num=$(( attempt_num + 1 ))
done

echo "Database connection failed after $max_attempts attempts."
exit 1
