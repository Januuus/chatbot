-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS claude_chatbot;
USE claude_chatbot;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS document_chunks;
DROP TABLE IF EXISTS chat_history;
DROP TABLE IF EXISTS documents;

-- Documents table to store processed files
CREATE TABLE documents (
    id VARCHAR(36) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    content LONGTEXT,
    mime_type VARCHAR(100),
    file_size BIGINT,
    is_training_doc BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    embedding JSON,
    metadata JSON
);

-- Create index for faster text search
CREATE FULLTEXT INDEX idx_document_content ON documents(content);

-- Document chunks for training documents
CREATE TABLE document_chunks (
    id VARCHAR(36) PRIMARY KEY,
    document_id VARCHAR(36) NOT NULL,
    chunk_index INT NOT NULL,
    content LONGTEXT NOT NULL,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    INDEX idx_document_chunks (document_id, chunk_index)
);

-- Chat history table
CREATE TABLE chat_history (
    id VARCHAR(36) PRIMARY KEY,
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON
);
