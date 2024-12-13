import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import config from './config.js';
import db from './db.js';

class ClaudeService {
    constructor() {
        if (!config.claude.apiKey) {
            console.error('Claude API key is not configured');
        }
        this.client = new Anthropic({
            apiKey: config.claude.apiKey
        });
    }

    /**
     * Validates the query before processing
     */
    validateQuery(query) {
        console.log('Validating query:', query);

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
     * Processes a chat query with optional image
     */
    async processQuery(query, imageData = null, includeContext = true) {
        try {
            console.log('Processing query:', query);
            console.log('Image data present:', !!imageData);

            const conversationId = uuidv4();

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

            const systemMessage = `You are a helpful AI assistant. Please format your responses with proper structure:

1. Use clear paragraphs with line breaks between them
2. For lists, use proper numbering or bullet points
3. Start each main point on a new line
4. Use appropriate spacing for readability
5. Keep responses clear and well-organized

When providing structured information like lesson plans or step-by-step instructions, format them with:
- Clear headings
- Numbered steps
- Bullet points for sub-items
- Line breaks between sections`;

            console.log('Sending request to Claude API');
            const response = await this.client.messages.create({
                model: config.claude.model,
                max_tokens: config.claude.maxTokens,
                temperature: config.claude.temperature,
                messages: messages,
                system: systemMessage
            });

            console.log('Received response from Claude API');

            // Save conversation to database
            try {
                await db.saveConversation(
                    conversationId,
                    query,
                    response.content[0].text,
                    imageData ? 'true' : 'false',
                    response.usage?.output_tokens || 0
                );
            } catch (dbError) {
                console.error('Failed to save conversation:', dbError);
                // Continue even if saving to database fails
            }

            return {
                id: conversationId,
                response: response.content[0].text,
                hasImage: !!imageData,
                usage: response.usage
            };

        } catch (error) {
            console.error('Error in processQuery:', error);

            if (error instanceof Anthropic.APIError) {
                throw new Error(`Claude API Error: ${error.message}`);
            }

            throw error;
        }
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
