import {type Database, getDatabase} from 'firebase/database';
import {app} from '../base';

let databaseInstance: Database | null = null;
let databaseError: Error | null = null;

/**
 * Gets the Firebase Database instance with proper error handling.
 * Caches the instance and any errors to avoid repeated failures.
 *
 * @throws {Error} If the database cannot be initialized
 */
export const getFirebaseDatabase = (): Database => {
	if (databaseError) {
		throw databaseError;
	}

	if (databaseInstance) {
		return databaseInstance;
	}

	try {
		databaseInstance = getDatabase(app);
		return databaseInstance;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Failed to initialize Firebase Database';

		databaseError = new Error(
			`Firebase Database initialization failed: ${errorMessage}. ` +
				`This may be due to network issues, ad blockers, or browser privacy settings.`,
		);

		throw databaseError;
	}
};

/**
 * Resets the cached database instance and error.
 * Useful for retrying after a failure.
 */
export const resetDatabaseCache = (): void => {
	databaseInstance = null;
	databaseError = null;
};
