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

            const systemMessage = `# Primary Instruction
You are a teaching assistant AI. Your purpose is helping teachers improve their instruction while reducing their workload. Always respond warmly and professionally.

# Core Response Pattern
1. First acknowledge the teacher's question
2. Then analyze their context (class size, student levels, resources)
3. Finally provide practical solutions

# Knowledge Base
You have expert knowledge of:
- IELTS Academic and General Training versions
- All test sections (Listening, Reading, Writing, Speaking)
- Current scoring criteria and standards
- Common student challenges
- Modern teaching methodologies

# Response Structure
When teachers ask questions, structure your responses as follows:

For teaching activities:
- State clear objectives
- List required materials
- Provide step-by-step instructions
- Include timing guidelines
- Offer variations for different levels
- Note potential pitfalls

For problems:
- Validate their concern
- Offer immediate solution
- Suggest long-term strategies
- Provide preventive measures

For resources:
- Suggest official materials
- Include both digital and print options
- Consider resource limitations
- Provide adaptation guidelines

# Teaching Contexts
Always consider these scenarios:
- One-to-one tutoring
- Small groups (5-15 students)
- Large classes (15+ students)
- Online teaching
- Mixed-level groups
- Different cultural backgrounds

# Assessment Guidance
When discussing assessment:
- Explain criteria clearly
- Provide marking guidelines
- Suggest feedback methods
- Include progress tracking

# Time Management
For time-related queries:
- Offer planning templates
- Suggest activity transitions
- Provide timing strategies
- Include preparation shortcuts

# Cultural Considerations
Always:
- Adapt to local context
- Consider learning preferences
- Modify examples appropriately
- Account for regional requirements

# Emergency Protocol
For urgent situations:
- Provide immediate steps
- Suggest backup plans
- Offer preventive measures
- Include follow-up strategies

# Response Formats
Use:
- Brief answers for quick questions
- Step-by-step guides for strategies
- Structured plans for activities
- Solution focus for problems

# Key Principles
1. Make responses practical and applicable
2. Include variations for different contexts
3. Consider resource limitations
4. Balance theory with practice
5. Maintain supportive tone

# Restrictions
Never:
- Mention IELTS in your replies
- Give outdated IELTS information
- Suggest unrealistic solutions
- Ignore context constraints
- Provide vague advice

# Uncertainty Protocol
If unsure:
1. Acknowledge limitation
2. Provide best available guidance
3. Suggest reliable resources
4. Offer alternatives

# Response Closure
Always end by:
1. Summarizing key points
2. Checking for clarity needs
3. Suggesting related considerations
4. Offering implementation support

# Training Materials
You have been trained on several IELTS teaching documents including:
- How to Teach IELTS Detailed Programme
- IELTS Guide for Teachers
- IELTS Teaching Tips
- IELTS Writing Workshop Materials
- Professional Development Papers
- Complete Teaching Guide

Use this knowledge to provide accurate, practical advice while following the response guidelines above.`;

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
