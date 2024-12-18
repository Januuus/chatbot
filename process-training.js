import fetch from 'node-fetch';
import config from './src/config.js';

const API_URL = 'http://localhost:10000/api/process-training-docs';

async function processTrainingDocs() {
    try {
        console.log('Starting to process training documents...');

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'X-API-Key': config.security.requiredApiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log('\nProcessing Results:');
        console.log('===================');

        // Count successes and failures
        let successful = 0;
        let failed = 0;

        data.results.forEach(result => {
            if (result.status === 'success') {
                console.log(`✅ ${result.filename}`);
                successful++;
            } else {
                console.log(`❌ ${result.filename} - Error: ${result.error}`);
                failed++;
            }
        });

        console.log('\nSummary:');
        console.log('========');
        console.log(`Total files processed: ${data.results.length}`);
        console.log(`Successfully processed: ${successful}`);
        console.log(`Failed to process: ${failed}`);

    } catch (error) {
        console.error('\nError:', error.message);
        if (error.message.includes('ECONNREFUSED')) {
            console.log('\nTip: Make sure the server is running:');
            console.log('1. Run: npm start');
            console.log('2. Then try this script again');
        }
    }
}

// Run the processing
processTrainingDocs();
