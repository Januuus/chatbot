import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import config from './config.js';
import db from './db.js';

class ClaudeService {
    constructor() {
        this.client = new Anthropic({
            apiKey: config.claude.apiKey
        });
    }

    /**
     * Builds context from relevant documents
     */
    async buildContext(query) {
        try {
            const relevantChunks = await db.getRelevantDocumentChunks(query);
            if (!relevantChunks.length) return '';

            const context = relevantChunks.map(chunk =>
                `From document "${chunk.document_name}":\n${chunk.content}`
            ).join('\n\n');

            return context;
        } catch (error) {
            console.error('Error building context:', error);
            return '';
        }
    }

    /**
     * Creates the system message with context
     */
    createSystemMessage(context) {
        return `You are a helpful AI assistant with access to specific documents. 
Your responses should be:
1. Accurate and based on the provided context
2. Clear and concise
3. Professional in tone

When referencing information, cite the source document.
If you're unsure or don't have enough context, say so.

${context ? `Here's the relevant context from the documents:\n\n${context}` :
                'No specific document context provided for this query.'}`;
    }

    /**
     * Processes a chat query with optional image
     */
    async processQuery(query, imageData = null, includeContext = true) {
        try {
            const conversationId = uuidv4();
            let context = '';

            if (includeContext) {
                context = await this.buildContext(query);
            }

            // Prepare messages array
            const messages = [{
                role: 'user',
                content: []
            }];

            // Add text content
            messages[0].content.push({
                type: 'text',
                text: query
            });

            // Add image content if provided
            if (imageData) {
                messages[0].content.push({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: imageData.type,
                        data: imageData.data
                    }
                });
            }

            const response = await this.client.messages.create({
                model: config.claude.model,
                max_tokens: config.claude.maxTokens,
                temperature: config.claude.temperature,
                system: this.createSystemMessage(context),
                messages: messages
            });

            // Save conversation to database
            await db.saveConversation(
                conversationId,
                query,
                response.content[0].text,
                context ? 'true' : 'false',
                response.usage?.output_tokens || 0
            );

            return {
                id: conversationId,
                response: response.content[0].text,
                hasContext: Boolean(context),
                hasImage: Boolean(imageData),
                usage: response.usage
            };

        } catch (error) {
            console.error('Error processing query:', error);

            if (error instanceof Anthropic.APIError) {
                throw new Error(`Claude API Error: ${error.message}`);
            }

            throw new Error('Failed to process query');
        }
    }

    /**
     * Validates the query before processing
     */
    validateQuery(query) {
        if (!query || typeof query !== 'string') {
            throw new Error('Invalid query format');
        }

        if (query.trim().length === 0) {
            throw new Error('Query cannot be empty');
        }

        if (query.length > 4000) {
            throw new Error('Query too long. Maximum length is 4000 characters');
        }

        return query.trim();
    }

    /**
     * Gets conversation history
     */
    async getHistory(limit = 10) {
        try {
            return await db.getConversationHistory(limit);
        } catch (error) {
            console.error('Error fetching conversation history:', error);
            throw new Error('Failed to fetch conversation history');
        }
    }

    /**
     * Handles errors in a consistent way
     */
    handleError(error) {
        console.error('Claude Service Error:', error);

        return {
            error: true,
            message: error.message || 'An unexpected error occurred',
            code: error.status || 500
        };
    }
}

// Create and export a single instance
const claudeService = new ClaudeService();
export default claudeService;
