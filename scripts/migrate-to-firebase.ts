#!/usr/bin/env tsx

import * as fs from 'node:fs';
import {initializeApp, cert, type ServiceAccount} from 'firebase-admin/app';
import {getDatabase, type Database} from 'firebase-admin/database';
import {type ProcessedComment, type ProcessedThread} from './disqus-export';

interface FirebaseComment {
	authorId: string;
	authorDisplayName: string;
	content: string;
	createdAt: number;
	updatedAt: number;
	parentId: string | null;
	isDeleted: boolean;
	deletedReason?: string;
	deletedAt?: number;
}

interface MigrationOptions {
	serviceAccountPath: string;
	databaseUrl: string;
	jsonPath: string;
	dryRun?: boolean;
	skipSpam?: boolean;
	authorIdPrefix?: string;
	quiet?: boolean;
}

interface MigrationStats {
	threadsProcessed: number;
	commentsImported: number;
	commentsSkipped: number;
	spamComments: Array<{author: string; content: string}>;
	deletedComments: number;
	errors: Array<{threadId: string; error: string}>;
}

class DisqusToFirebaseMigrator {
	public db!: Database;
	private options: MigrationOptions;
	private stats: MigrationStats;
	private commentIdMap: Map<string, string>; // Maps Disqus ID to Firebase ID

	constructor(options: MigrationOptions) {
		this.options = options;
		this.stats = {
			threadsProcessed: 0,
			commentsImported: 0,
			commentsSkipped: 0,
			spamComments: [],
			deletedComments: 0,
			errors: [],
		};
		this.commentIdMap = new Map();

		if (!this.options.dryRun) {
			const serviceAccount = JSON.parse(
				fs.readFileSync(this.options.serviceAccountPath, 'utf8'),
			) as ServiceAccount;

			initializeApp({
				credential: cert(serviceAccount),
				databaseURL: this.options.databaseUrl,
			});

			this.db = getDatabase();
		}
	}

	private generateAuthorId(comment: ProcessedComment): string {
		const prefix = this.options.authorIdPrefix || 'disqus';
		const identifier = comment.authorEmail
			? comment.authorEmail.toLowerCase().replace(/[^a-z0-9]/g, '_')
			: comment.authorName.toLowerCase().replace(/[^a-z0-9]/g, '_');
		return `${prefix}_${identifier}`;
	}

	private async importComment(
		comment: ProcessedComment,
		blueprintId: string,
		parentFirebaseId: string | null = null,
	): Promise<string | null> {
		if (this.options.skipSpam && comment.isSpam) {
			this.stats.commentsSkipped++;
			// Collect first 10 spam examples
			if (this.stats.spamComments.length < 10) {
				this.stats.spamComments.push({
					author: comment.authorName,
					content: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : ''),
				});
			}
			if (!this.options.quiet) {
				console.log(`   ⚠️  Skipping spam comment: ${comment.id}`);
			}
			return null;
		}

		const firebaseComment: FirebaseComment = {
			authorId: this.generateAuthorId(comment),
			authorDisplayName: comment.authorName,
			content: comment.content,
			createdAt: new Date(comment.createdAt).getTime(),
			updatedAt: new Date(comment.createdAt).getTime(),
			parentId: parentFirebaseId,
			isDeleted: comment.isDeleted,
		};

		// If comment was deleted in Disqus, add deletion metadata
		if (comment.isDeleted) {
			firebaseComment.deletedReason = 'Migrated from Disqus as deleted';
			firebaseComment.deletedAt = new Date(comment.createdAt).getTime(); // We don't have actual deletion time
			this.stats.deletedComments++;
			if (!this.options.quiet) {
				console.log(`   📝 Importing deleted comment: ${comment.id} -> will be soft-deleted in Firebase`);
			}
		}

		let firebaseId: string;

		if (!this.options.dryRun) {
			const commentRef = this.db.ref(`comments/${blueprintId}`).push();
			await commentRef.set(firebaseComment);
			firebaseId = commentRef.key!;
		} else {
			firebaseId = `dry_run_${comment.id}`;
		}

		this.commentIdMap.set(comment.id, firebaseId);
		this.stats.commentsImported++;

		if (!this.options.quiet) {
			console.log(`   ✅ Imported comment: ${comment.id} -> ${firebaseId}`);
		}

		for (const reply of comment.replies) {
			await this.importComment(reply, blueprintId, firebaseId);
		}

		return firebaseId;
	}

	private async importThread(thread: ProcessedThread): Promise<void> {
		if (!thread.blueprintId) {
			if (!this.options.quiet) {
				console.log(`⚠️  Skipping thread without blueprint ID: ${thread.url}`);
			}
			this.stats.threadsProcessed++;
			return;
		}

		if (!this.options.quiet) {
			console.log(`\n📝 Processing thread: ${thread.title}`);
			console.log(`   Blueprint ID: ${thread.blueprintId}`);
			console.log(`   Comments: ${thread.comments.length}`);
		}

		try {
			for (const comment of thread.comments) {
				await this.importComment(comment, thread.blueprintId);
			}

			this.stats.threadsProcessed++;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.stats.errors.push({
				threadId: thread.id,
				error: errorMessage,
			});
			console.error(`   ❌ Error importing thread: ${errorMessage}`);
		}
	}

	public async migrate(threads: ProcessedThread[]): Promise<MigrationStats> {
		console.log(`\n🚀 Starting migration of ${threads.length} threads`);
		console.log(`   Dry run: ${this.options.dryRun ? 'YES' : 'NO'}`);
		console.log(`   Skip spam: ${this.options.skipSpam ? 'YES' : 'NO'}`);
		console.log(`   Quiet mode: ${this.options.quiet ? 'YES (showing summary only)' : 'NO'}`);

		if (this.options.quiet) {
			console.log('\n⏳ Processing... (this may take a few minutes)');
			let processed = 0;
			const updateInterval = Math.max(100, Math.floor(threads.length / 20));

			for (const thread of threads) {
				await this.importThread(thread);
				processed++;

				if (processed % updateInterval === 0 || processed === threads.length) {
					const percentage = Math.round((processed / threads.length) * 100);
					process.stdout.write(`\r   Progress: ${percentage}% (${processed}/${threads.length} threads)`);
				}
			}
			console.log('\n');
		} else {
			for (const thread of threads) {
				await this.importThread(thread);
			}
		}

		return this.stats;
	}
}

async function migrateDisqusToFirebase(options: MigrationOptions): Promise<void> {
	console.log(`📖 Loading Disqus export from: ${options.jsonPath}`);
	const jsonContent = fs.readFileSync(options.jsonPath, 'utf8');
	const threads = JSON.parse(jsonContent) as ProcessedThread[];

	const migrator = new DisqusToFirebaseMigrator(options);
	const stats = await migrator.migrate(threads);

	console.log('\n' + '='.repeat(60));
	console.log('📊 Migration Statistics:');
	console.log('='.repeat(60));
	console.log(`Threads processed: ${stats.threadsProcessed}`);
	console.log(`Comments imported: ${stats.commentsImported}`);
	console.log(`  - Active comments: ${stats.commentsImported - stats.deletedComments}`);
	console.log(`  - Soft-deleted comments: ${stats.deletedComments}`);
	console.log(`Comments skipped: ${stats.commentsSkipped}`);
	if (stats.spamComments.length > 0) {
		console.log(`  - Spam comments: ${stats.commentsSkipped}`);
	}
	console.log(`Errors: ${stats.errors.length}`);

	if (stats.spamComments.length > 0 && options.skipSpam) {
		console.log('\n🚫 Sample Spam Comments (showing first 10):');
		console.log('─'.repeat(60));
		for (const spam of stats.spamComments) {
			console.log(`Author: ${spam.author}`);
			console.log(`Content: ${spam.content}`);
			console.log('─'.repeat(60));
		}
	}

	if (stats.errors.length > 0) {
		console.log('\n❌ Errors encountered:');
		for (const error of stats.errors) {
			console.log(`   Thread ${error.threadId}: ${error.error}`);
		}
	}

	if (options.dryRun) {
		console.log('\n⚠️  This was a dry run. No data was actually imported to Firebase.');
	} else {
		console.log('\n✅ Migration completed successfully!');
		// Close Firebase connection to allow process to exit
		if (migrator.db) {
			await migrator.db.goOffline();
		}
	}
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
	const args = process.argv.slice(2);

	const options: Partial<MigrationOptions> = {};
	let positionalArgs: string[] = [];

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--dry-run') {
			options.dryRun = true;
		} else if (arg === '--skip-spam') {
			options.skipSpam = true;
		} else if (arg === '--quiet' || arg === '-q') {
			options.quiet = true;
		} else if (arg === '--author-prefix' && i + 1 < args.length) {
			options.authorIdPrefix = args[++i];
		} else if (!arg.startsWith('--')) {
			positionalArgs.push(arg);
		}
	}

	if (positionalArgs.length !== 3) {
		console.error(
			'Usage: tsx migrate-to-firebase.ts [options] <service-account.json> <database-url> <disqus-export.json>',
		);
		console.error('\nOptions:');
		console.error('  --dry-run          Run without actually importing to Firebase');
		console.error('  --skip-spam        Skip comments marked as spam');
		console.error('  --quiet, -q        Show summary only (no individual comment logs)');
		console.error('  --author-prefix    Prefix for generated author IDs (default: "disqus")');
		console.error('\nExample:');
		console.error(
			'  tsx migrate-to-firebase.ts --dry-run --quiet service-account.json https://my-app.firebaseio.com export.json',
		);
		process.exit(1);
	}

	const [serviceAccountPath, databaseUrl, jsonPath] = positionalArgs;

	if (!fs.existsSync(serviceAccountPath) && !options.dryRun) {
		console.error(`Service account file not found: ${serviceAccountPath}`);
		process.exit(1);
	}

	if (!fs.existsSync(jsonPath)) {
		console.error(`JSON export file not found: ${jsonPath}`);
		process.exit(1);
	}

	const migrationOptions: MigrationOptions = {
		serviceAccountPath,
		databaseUrl,
		jsonPath,
		...options,
	};

	migrateDisqusToFirebase(migrationOptions).catch((error) => {
		console.error('Migration failed:', error);
		process.exit(1);
	});
}
