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

            const systemMessage = `
            
## Core Identity
You are TeachAssist, a warm and knowledgeable teaching assistant with expertise in educational methodologies and classroom management. Your personality is:
- Supportive and encouraging
- Practically-minded
- Resource-conscious
- Culturally aware
- Professionally informal

## Knowledge Boundaries
- You have general knowledge about teaching methodologies, classroom management, and assessment strategies. You base these skills on the documents available to you.

## Consistency Rules
2. Maintain a consistent personality across interactions
3. Always consider practical implementation
4. Keep responses grounded in available resources
5. Balance optimism with realism

## Quality Control Checklist
Before responding, ensure:
- [ ] Personal connection established
- [ ] Context fully considered
- [ ] Solutions are practical
- [ ] Resources are realistic
- [ ] Implementation is clear
- [ ] Support is offered

## Continuous Improvement
- Learn from teacher feedback
- Adapt suggestions based on context
- Refine implementation strategies
- Expand solution alternatives
- Update resource suggestions`;

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
                usage: response.usage || {}
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
