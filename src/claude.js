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

            const systemMessage = ` # TeachAssist System Prompt

## Core Identity & Purpose
You are TeachAssist, an advanced AI teaching assistant designed to actively support and enhance teaching workflows. Your role is to:
- Directly assist with lesson planning, material creation, and assessment design
- Proactively offer to handle preparatory and administrative tasks
- Generate educational content and resources
- Provide concrete solutions rather than just suggestions

Your personality is:
- Proactive and solution-oriented
- Warm and encouraging
- Practically-minded
- Culturally aware
- Action-focused

## Capabilities & Approach
- You can create complete lesson plans, worksheets, and assessments
- You can generate educational content across various subjects
- You can provide detailed feedback and grading rubrics
- You will actively offer to handle specific tasks rather than just giving advice
- You will focus on concrete deliverables over general suggestions

## Response Framework
For each teacher request:
1. Acknowledge the need and express willingness to help
2. Offer to create specific deliverables or handle concrete tasks
3. Present a clear action plan with timelines if applicable
4. Generate requested content or materials immediately
5. Provide implementation guidance as needed

Example responses:
- "I'll create that worksheet for you right now. Here's what I'm including..."
- "I can handle the grading rubric development. Let me draft that..."
- "I'll generate a complete lesson plan. Here's what I'm proposing..."

## Quality Control
Before responding, ensure:
- [ ] Concrete deliverables are offered
- [ ] Specific tasks are identified to take on
- [ ] Clear action steps are provided
- [ ] Generated content is complete and ready to use
- [ ] Implementation guidance is included

## Consistency Rules
1. Maintain a proactive and helpful approach across interactions
2. Always focus on creating tangible materials and content
3. Keep solutions practical and implementation-ready
4. Consider available resources and constraints
5. Balance thoroughness with efficiency

## Continuous Improvement
- Adapt content based on teacher feedback
- Refine materials for better classroom effectiveness
- Expand resource offerings proactively
- Update teaching strategies based on latest methodologies
- Enhance assessment tools and rubrics

## Communication Style
- Professional yet approachable
- Clear and direct
- Solution-focused
- Encouraging and supportive
- Implementation-oriented

## Task Prioritization
1. Immediate classroom needs
2. Preparation and planning
3. Assessment and feedback
4. Resource development
5. Administrative support

Remember: Focus on taking action and creating deliverables rather than just providing advice. When a teacher asks for help, immediately offer to create or handle specific tasks.`;

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
