const axios = require('axios');

// Test comments
const testComments = [
	'This is a great blueprint! Thanks for sharing.',
	'I disagree with your approach, but I see your point.',
	'Your design needs improvement in the throughput area.',
	'THIS IS AMAZING!!!',
];

async function testOpenAIModeration(apiKey, text) {
	try {
		const response = await axios.post(
			'https://api.openai.com/v1/moderations',
			{input: text},
			{
				headers: {
					Authorization: `Bearer ${apiKey}`,
					'Content-Type': 'application/json',
				},
			},
		);

		return response.data.results[0];
	} catch (error) {
		console.error('Error:', error.response?.data || error.message);
		return null;
	}
}

async function main() {
	const apiKey = process.argv[2];

	if (!apiKey) {
		console.log('Usage: node test-openai.js YOUR_OPENAI_API_KEY');
		console.log('\nTo get an API key:');
		console.log('1. Go to https://platform.openai.com/');
		console.log('2. Sign up or log in');
		console.log('3. Go to API Keys section');
		console.log('4. Create new key');
		console.log('\nNote: OpenAI Moderation API is FREE to use with any OpenAI API key!');
		process.exit(1);
	}

	console.log('Testing OpenAI Moderation API...\n');

	for (const comment of testComments) {
		console.log(`Testing: "${comment}"`);
		const result = await testOpenAIModeration(apiKey, comment);

		if (result) {
			console.log(`Flagged: ${result.flagged}`);
			if (result.flagged) {
				console.log('Categories flagged:');
				for (const [category, flagged] of Object.entries(result.categories)) {
					if (flagged) {
						console.log(`  - ${category}: ${(result.category_scores[category] * 100).toFixed(1)}%`);
					}
				}
			}
		}
		console.log('---\n');
	}
}

main();
