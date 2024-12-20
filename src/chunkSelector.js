import OpenAI from 'openai';
import config from './config.js';
import documentService from './documents.js';

class ChunkSelector {
    constructor() {
        this.openai = new OpenAI({
            apiKey: config.openai.apiKey
        });
    }

    async selectRelevantChunks(query) {
        try {
            // Get all document chunks
            const chunks = await documentService.getAllChunks();

            // Create a map of chunks for easy lookup
            const chunkMap = new Map(chunks.map(chunk => [chunk.id, chunk]));

            // Create a prompt that lists all chunks with their IDs
            const selectionPrompt = `You are a document chunk selector for a teaching AI assistant. Your task is to:
1. Read the user's query
2. Review all available document chunks
3. Select ONLY the chunk IDs that contain information relevant to answering the query
4. Return ONLY the chunk IDs, nothing else

User Query: ${query}

Available Chunks:
${chunks.map(chunk => `ID: ${chunk.id}
From: ${chunk.metadata.filename} (Part ${chunk.metadata.chunkNumber} of ${chunk.metadata.totalChunks})
Content: ${chunk.content}
---`).join('\n')}

Return your selection as:
CHUNKS_START
[chunk_id_1]
[chunk_id_2]
CHUNKS_END`;

            // Get GPT-3.5's selection
            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo-16k',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a precise document chunk selector. Return only the IDs of the most relevant chunks, nothing else.'
                    },
                    {
                        role: 'user',
                        content: selectionPrompt
                    }
                ],
                temperature: 0.0
            });

            // Extract selected chunk IDs
            const fullResponse = response.choices[0].message.content;
            const startMarker = 'CHUNKS_START';
            const endMarker = 'CHUNKS_END';
            const startIndex = fullResponse.indexOf(startMarker) + startMarker.length;
            const endIndex = fullResponse.indexOf(endMarker);

            if (startIndex === -1 || endIndex === -1) {
                console.error('Selector response not properly formatted:', fullResponse);
                return [];
            }

            // Get the selected chunks
            const selectedIds = fullResponse
                .slice(startIndex, endIndex)
                .trim()
                .split('\n')
                .map(id => id.trim())
                .filter(id => id && chunkMap.has(id));

            console.log(`Selected ${selectedIds.length} relevant chunks`);
            return selectedIds.map(id => chunkMap.get(id));

        } catch (error) {
            console.error('Error in chunk selector:', error);
            throw error;
        }
    }
}

const chunkSelector = new ChunkSelector();
export default chunkSelector;
