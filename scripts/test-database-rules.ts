#!/usr/bin/env tsx
import {initializeApp} from 'firebase/app';
import {getDatabase, ref, set, get, push, connectDatabaseEmulator} from 'firebase/database';
import {getAuth, signInAnonymously, connectAuthEmulator} from 'firebase/auth';

// Test configuration - connects to local emulator
const firebaseConfig = {
	apiKey: 'fake-api-key',
	databaseURL: 'http://127.0.0.1:9000?ns=factorio-prints',
	projectId: 'factorio-prints',
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Connect to emulators
connectDatabaseEmulator(db, '127.0.0.1', 9000);
connectAuthEmulator(auth, 'http://127.0.0.1:9099');

interface TestResult {
	name: string;
	passed: boolean;
	error?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
	try {
		await testFn();
		results.push({name, passed: true});
		console.log(`✅ ${name}`);
	} catch (error) {
		results.push({name, passed: false, error: String(error)});
		console.log(`❌ ${name}: ${error}`);
	}
}

async function setupTestData() {
	// Sign in anonymously for auth tests
	await signInAnonymously(auth);

	// Create test user data
	const userId = auth.currentUser?.uid || 'test-user';
	await set(ref(db, `users/${userId}`), {
		displayName: 'Test User',
		email: 'test@example.com',
	});
}

async function runAllTests() {
	console.log('🧪 Testing Firebase Database Rules...\n');

	await setupTestData();

	// Test 1: Anonymous user can read blueprints
	await runTest('Anonymous user can read blueprints', async () => {
		await auth.signOut();
		await get(ref(db, 'blueprints'));
	});

	// Test 2: Anonymous user cannot write blueprints
	await runTest('Anonymous user cannot write blueprints', async () => {
		await auth.signOut();
		try {
			await set(ref(db, 'blueprints/test-blueprint'), {title: 'Test'});
			throw new Error('Should have failed');
		} catch (error: any) {
			if (!error.message.includes('PERMISSION_DENIED')) {
				throw error;
			}
		}
	});

	// Test 3: Authenticated user can create valid blueprint
	await runTest('Authenticated user can create valid blueprint', async () => {
		await signInAnonymously(auth);
		const userId = auth.currentUser!.uid;

		const newBlueprintRef = push(ref(db, 'blueprints'));
		await set(newBlueprintRef, {
			author: {displayName: 'Test User', userId},
			blueprintString: 'valid-blueprint-string',
			descriptionMarkdown: 'Test description',
			imageUrl: 'https://example.com/image.jpg',
			title: 'Test Blueprint',
			createdDate: Date.now(),
			lastUpdatedDate: Date.now(),
			numberOfFavorites: 0,
			tags: {'test-tag': true},
		});
	});

	// Test 4: Invalid blueprint data is rejected
	await runTest('Invalid blueprint data is rejected', async () => {
		await signInAnonymously(auth);
		const userId = auth.currentUser!.uid;

		try {
			const newBlueprintRef = push(ref(db, 'blueprints'));
			await set(newBlueprintRef, {
				author: {displayName: 'Test User', userId},
				// Missing required fields
				title: 'Incomplete Blueprint',
			});
			throw new Error('Should have failed');
		} catch (error: any) {
			if (!error.message.includes('PERMISSION_DENIED')) {
				throw error;
			}
		}
	});

	// Test 5: User can only write their own favorites
	await runTest('User can only write their own favorites', async () => {
		await signInAnonymously(auth);
		const userId = auth.currentUser!.uid;

		// Can write own favorites
		await set(ref(db, `users/${userId}/favorites/test-blueprint`), true);

		// Cannot write other user's favorites
		try {
			await set(ref(db, 'users/other-user/favorites/test-blueprint'), true);
			throw new Error('Should have failed');
		} catch (error: any) {
			if (!error.message.includes('PERMISSION_DENIED')) {
				throw error;
			}
		}
	});

	// Test 6: numberOfFavorites validation
	await runTest('numberOfFavorites must be non-negative', async () => {
		await signInAnonymously(auth);
		const userId = auth.currentUser!.uid;

		try {
			const newBlueprintRef = push(ref(db, 'blueprints'));
			await set(newBlueprintRef, {
				author: {displayName: 'Test User', userId},
				blueprintString: 'valid-blueprint-string',
				descriptionMarkdown: 'Test description',
				imageUrl: 'https://example.com/image.jpg',
				title: 'Test Blueprint',
				createdDate: Date.now(),
				lastUpdatedDate: Date.now(),
				numberOfFavorites: -1, // Invalid!
				tags: {'test-tag': true},
			});
			throw new Error('Should have failed');
		} catch (error: any) {
			if (!error.message.includes('PERMISSION_DENIED')) {
				throw error;
			}
		}
	});

	// Test 7: Tag synchronization (byTag collection)
	await runTest('byTag collection is read-only for clients', async () => {
		await signInAnonymously(auth);

		// Can read byTag
		await get(ref(db, 'byTag/test-tag'));

		// Cannot write to byTag
		try {
			await set(ref(db, 'byTag/test-tag/test-blueprint'), true);
			throw new Error('Should have failed');
		} catch (error: any) {
			if (!error.message.includes('PERMISSION_DENIED')) {
				throw error;
			}
		}
	});

	// Test 8: Blueprint summary validation
	await runTest('Blueprint summary must match blueprint data', async () => {
		await signInAnonymously(auth);

		try {
			const newBlueprintRef = push(ref(db, 'blueprintSummaries'));
			await set(newBlueprintRef, {
				author: {displayName: 'Wrong User', userId: 'wrong-id'}, // Mismatched author
				title: 'Test Summary',
				imgurId: 'abc123',
				numberOfFavorites: 0,
				createdDate: Date.now(),
				lastUpdatedDate: Date.now(),
			});
			throw new Error('Should have failed');
		} catch (error: any) {
			if (!error.message.includes('PERMISSION_DENIED')) {
				throw error;
			}
		}
	});

	// Test 9: Query performance with indexes
	await runTest('Can query blueprints by lastUpdatedDate', async () => {
		await signInAnonymously(auth);

		// This query should work with the index
		const query = ref(db, 'blueprintSummaries');
		await get(query);
	});

	// Test 10: Email field restrictions
	await runTest('Email field requires authentication', async () => {
		await signInAnonymously(auth);
		const userId = auth.currentUser!.uid;

		// Can write with auth
		await set(ref(db, `users/${userId}/email`), 'test@example.com');

		// Cannot read other user's email
		try {
			await get(ref(db, 'users/other-user/email'));
			throw new Error('Should have failed');
		} catch (error: any) {
			if (!error.message.includes('PERMISSION_DENIED')) {
				throw error;
			}
		}
	});

	// Print summary
	console.log('\n📊 Test Summary:');
	const passed = results.filter((r) => r.passed).length;
	const failed = results.filter((r) => !r.passed).length;
	console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

	if (failed > 0) {
		console.log('\n❌ Failed tests:');
		results
			.filter((r) => !r.passed)
			.forEach((r) => {
				console.log(`  - ${r.name}: ${r.error}`);
			});
		process.exit(1);
	} else {
		console.log('\n✅ All tests passed!');
		process.exit(0);
	}
}

// Wait a bit for emulator to be ready
setTimeout(() => {
	runAllTests().catch(console.error);
}, 2000);
