import axios from 'axios';

interface OpenAIModerationResponse {
	id: string;
	model: string;
	results: Array<{
		flagged: boolean;
		categories: {
			sexual: boolean;
			hate: boolean;
			harassment: boolean;
			'self-harm': boolean;
			'sexual/minors': boolean;
			'hate/threatening': boolean;
			'violence/graphic': boolean;
			'self-harm/intent': boolean;
			'self-harm/instructions': boolean;
			'harassment/threatening': boolean;
			violence: boolean;
		};
		category_scores: {
			sexual: number;
			hate: number;
			harassment: number;
			'self-harm': number;
			'sexual/minors': number;
			'hate/threatening': number;
			'violence/graphic': number;
			'self-harm/intent': number;
			'self-harm/instructions': number;
			'harassment/threatening': number;
			violence: number;
		};
	}>;
}

/**
 * Analyzes text for toxicity using OpenAI's Moderation API
 * This is free to use with any OpenAI API key
 */
export async function analyzeWithOpenAI(
	text: string,
	apiKey: string,
): Promise<{
	isToxic: boolean;
	scores: Record<string, number>;
	reasons: string[];
}> {
	try {
		const response = await axios.post<OpenAIModerationResponse>(
			'https://api.openai.com/v1/moderations',
			{input: text},
			{
				headers: {
					Authorization: `Bearer ${apiKey}`,
					'Content-Type': 'application/json',
				},
			},
		);

		const result = response.data.results[0];
		const scores: Record<string, number> = {};
		const reasons: string[] = [];

		// Check each category
		for (const [category, flagged] of Object.entries(result.categories)) {
			const score = result.category_scores[category as keyof typeof result.category_scores];
			scores[category] = score;

			if (flagged) {
				reasons.push(`${category.replace('/', ' ')} content detected (${Math.round(score * 100)}% confidence)`);
			}
		}

		return {
			isToxic: result.flagged,
			scores,
			reasons,
		};
	} catch (error: any) {
		console.error('Error with OpenAI Moderation API:', error.message);
		return {isToxic: false, scores: {}, reasons: []};
	}
}

// Example usage in your cloud function:
/*
import * as functions from 'firebase-functions';

// In your analyzeToxicity function:
const apiKey = functions.config().openai?.api_key;
if (apiKey) {
  return analyzeWithOpenAI(text, apiKey);
}
*/
