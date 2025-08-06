const axios = require('axios');

// Test comments with varying levels of toxicity
const testComments = [
	'This is a great blueprint! Thanks for sharing.',
	'I disagree with your approach, but I see your point.',
	'THIS IS THE BEST THING EVER!!!!', // All caps test
	'Your blueprint could be improved by adding more belts.',
	// Add more test cases as needed
];

async function testPerspectiveAPI(apiKey, text) {
	try {
		const response = await axios.post(
			`https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${apiKey}`,
			{
				comment: {text},
				requestedAttributes: {
					TOXICITY: {},
					SEVERE_TOXICITY: {},
					THREAT: {},
					INSULT: {},
					PROFANITY: {},
					IDENTITY_ATTACK: {},
				},
				languages: ['en'],
				doNotStore: true,
			},
		);

		return response.data.attributeScores;
	} catch (error) {
		console.error('Error:', error.response?.data || error.message);
		return null;
	}
}

async function main() {
	const apiKey = process.argv[2];

	if (!apiKey) {
		console.log('Usage: node test-toxicity.js YOUR_API_KEY');
		console.log('\nTo get an API key:');
		console.log('1. Go to https://console.cloud.google.com/');
		console.log('2. Enable "Perspective Comment Analyzer API"');
		console.log('3. Create credentials (API key)');
		process.exit(1);
	}

	console.log('Testing Perspective API with various comments...\n');

	for (const comment of testComments) {
		console.log(`Testing: "${comment}"`);
		const scores = await testPerspectiveAPI(apiKey, comment);

		if (scores) {
			console.log('Scores:');
			for (const [attribute, data] of Object.entries(scores)) {
				const score = data.summaryScore.value;
				console.log(`  ${attribute}: ${(score * 100).toFixed(1)}%`);
			}
		}
		console.log('---\n');

		// Add delay to respect rate limits
		await new Promise((resolve) => setTimeout(resolve, 1100));
	}
}

main();
