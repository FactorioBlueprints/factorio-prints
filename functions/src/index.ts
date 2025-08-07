import * as functions from 'firebase-functions';

export const helloWorld = functions.https.onRequest((request, response) => {
	functions.logger.info('Hello logs!', {structuredData: true});
	response.send('Hello from Firebase!');
});

export const ping = functions.https.onRequest((request, response) => {
	response.json({message: 'pong', timestamp: Date.now()});
});
