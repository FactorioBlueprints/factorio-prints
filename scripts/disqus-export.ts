#!/usr/bin/env tsx

import * as fs from 'node:fs';
import {z} from 'zod';
import {parseStringPromise} from 'xml2js';
import {gunzipSync} from 'node:zlib';

const disqusThreadSchema = z.object({
	$: z.object({
		'dsq:id': z.string(),
	}),
	id: z.array(z.string()).transform((arr) => arr[0]),
	forum: z.array(z.string()).transform((arr) => arr[0]),
	category: z
		.array(
			z.object({
				$: z.object({
					'dsq:id': z.string(),
				}),
			}),
		)
		.optional(),
	link: z.array(z.string()).transform((arr) => arr[0]),
	title: z.array(z.string()).transform((arr) => arr[0]),
	message: z
		.array(z.string())
		.transform((arr) => arr[0])
		.optional(),
	createdAt: z.array(z.string()).transform((arr) => arr[0]),
	author: z
		.array(
			z.object({
				email: z
					.array(z.string())
					.optional()
					.transform((arr) => arr?.[0]),
				name: z.array(z.string()).transform((arr) => arr[0]),
				isAnonymous: z.array(z.string()).transform((arr) => arr[0] === 'true'),
				username: z
					.array(z.string())
					.optional()
					.transform((arr) => arr?.[0]),
			}),
		)
		.optional()
		.transform((arr) => arr?.[0]),
	isClosed: z.array(z.string()).transform((arr) => arr[0] === 'true'),
	isDeleted: z.array(z.string()).transform((arr) => arr[0] === 'true'),
});

const disqusPostSchema = z.object({
	$: z.object({
		'dsq:id': z.string(),
	}),
	id: z.array(z.string()).transform((arr) => arr[0]),
	message: z.array(z.string()).transform((arr) => arr[0]),
	createdAt: z.array(z.string()).transform((arr) => arr[0]),
	isDeleted: z.array(z.string()).transform((arr) => arr[0] === 'true'),
	isSpam: z.array(z.string()).transform((arr) => arr[0] === 'true'),
	author: z
		.array(
			z.object({
				email: z
					.array(z.string())
					.transform((arr) => arr[0])
					.optional(),
				name: z.array(z.string()).transform((arr) => arr[0]),
				isAnonymous: z.array(z.string()).transform((arr) => arr[0] === 'true'),
				username: z
					.array(z.string())
					.optional()
					.transform((arr) => arr?.[0]),
			}),
		)
		.transform((arr) => arr[0]),
	thread: z
		.array(
			z.object({
				$: z.object({
					'dsq:id': z.string(),
				}),
			}),
		)
		.transform((arr) => arr[0]),
	parent: z
		.array(
			z.object({
				$: z.object({
					'dsq:id': z.string(),
				}),
			}),
		)
		.optional()
		.transform((arr) => arr?.[0]),
});

const disqusExportSchema = z.object({
	disqus: z.object({
		$: z.object({
			xmlns: z.string(),
			'xmlns:dsq': z.string(),
			'xmlns:xsi': z.string(),
			'xsi:schemaLocation': z.string(),
		}),
		category: z
			.array(
				z.object({
					$: z.object({
						'dsq:id': z.string(),
					}),
					forum: z.array(z.string()).transform((arr) => arr[0]),
					title: z.array(z.string()).transform((arr) => arr[0]),
					isDefault: z.array(z.string()).transform((arr) => arr[0] === 'true'),
				}),
			)
			.optional(),
		thread: z.array(disqusThreadSchema),
		post: z.array(disqusPostSchema),
	}),
});

type DisqusExport = z.infer<typeof disqusExportSchema>;
type DisqusThread = z.infer<typeof disqusThreadSchema>;
type DisqusPost = z.infer<typeof disqusPostSchema>;

export interface ProcessedComment {
	id: string;
	threadId: string;
	blueprintId: string | null;
	parentId: string | null;
	authorName: string;
	authorEmail: string | null;
	content: string;
	createdAt: string;
	isDeleted: boolean;
	isSpam: boolean;
	replies: ProcessedComment[];
}

export interface ProcessedThread {
	id: string;
	blueprintId: string | null;
	url: string;
	title: string;
	createdAt: string;
	comments: ProcessedComment[];
}

function extractBlueprintId(url: string): string | null {
	// https://factorioprints.com/view/abc123
	// http://factorioprints.com/view/xyz789
	// http://localhost:3000/view/-KYRW23YkS4VHKUwvCRX
	// http://localhost:3000/view/-KYRR7ABI6-80jYnJxtG#!newthread
	const match = url.match(/\/view\/([a-zA-Z0-9_-]+)/);
	if (!match) return null;

	// Extract the ID and remove any hash fragments
	const id = match[1];
	return id;
}

function buildCommentTree(posts: DisqusPost[], threadId: string): ProcessedComment[] {
	const threadPosts = posts.filter((post) => post.thread.$['dsq:id'] === threadId);
	const commentMap = new Map<string, ProcessedComment>();
	const rootComments: ProcessedComment[] = [];

	for (const post of threadPosts) {
		const comment: ProcessedComment = {
			id: post.$['dsq:id'],
			threadId,
			blueprintId: null,
			parentId: post.parent?.$['dsq:id'] || null,
			authorName: post.author.name,
			authorEmail: post.author.email || null,
			content: post.message,
			createdAt: post.createdAt,
			isDeleted: post.isDeleted,
			isSpam: post.isSpam,
			replies: [],
		};
		commentMap.set(comment.id, comment);
	}

	for (const comment of commentMap.values()) {
		if (comment.parentId) {
			const parent = commentMap.get(comment.parentId);
			if (parent) {
				parent.replies.push(comment);
			} else {
				// Parent not found, treat as root comment
				rootComments.push(comment);
			}
		} else {
			rootComments.push(comment);
		}
	}

	const sortByDate = (comments: ProcessedComment[]) => {
		comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
		comments.forEach((comment) => sortByDate(comment.replies));
	};

	sortByDate(rootComments);
	return rootComments;
}

export async function parseDisqusExport(filePath: string): Promise<ProcessedThread[]> {
	const fileContent = fs.readFileSync(filePath);

	let xmlContent: string;
	if (filePath.endsWith('.gz')) {
		xmlContent = gunzipSync(fileContent).toString('utf-8');
	} else {
		xmlContent = fileContent.toString('utf-8');
	}

	const parsed = await parseStringPromise(xmlContent);
	const validated = disqusExportSchema.parse(parsed);

	const threads: ProcessedThread[] = [];

	for (const thread of validated.disqus.thread) {
		if (thread.isDeleted) {
			continue;
		}

		const blueprintId = extractBlueprintId(thread.link);
		const comments = buildCommentTree(validated.disqus.post, thread.$['dsq:id']);

		const setBlueprintId = (comment: ProcessedComment) => {
			comment.blueprintId = blueprintId;
			comment.replies.forEach(setBlueprintId);
		};
		comments.forEach(setBlueprintId);

		threads.push({
			id: thread.$['dsq:id'],
			blueprintId,
			url: thread.link,
			title: thread.title,
			createdAt: thread.createdAt,
			comments,
		});
	}

	return threads;
}

export async function exportDisqusToJson(inputPath: string, outputPath: string): Promise<void> {
	console.log(`📖 Reading Disqus export from: ${inputPath}`);
	const threads = await parseDisqusExport(inputPath);

	console.log(`✅ Parsed ${threads.length} threads`);

	const stats = {
		totalThreads: threads.length,
		threadsWithBlueprintId: threads.filter((t) => t.blueprintId).length,
		totalComments: threads.reduce((sum, t) => {
			const countComments = (comments: ProcessedComment[]): number => {
				return comments.reduce((count, c) => count + 1 + countComments(c.replies), 0);
			};
			return sum + countComments(t.comments);
		}, 0),
	};

	console.log(`📊 Statistics:`);
	console.log(`   - Total threads: ${stats.totalThreads}`);
	console.log(`   - Threads with blueprint ID: ${stats.threadsWithBlueprintId}`);
	console.log(`   - Total comments: ${stats.totalComments}`);

	fs.writeFileSync(outputPath, JSON.stringify(threads, null, 2));
	console.log(`💾 Exported to: ${outputPath}`);
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
	const args = process.argv.slice(2);
	if (args.length !== 2) {
		console.error('Usage: tsx disqus-export.ts <input.xml|input.xml.gz> <output.json>');
		process.exit(1);
	}

	const [inputPath, outputPath] = args;

	if (!fs.existsSync(inputPath)) {
		console.error(`Input file not found: ${inputPath}`);
		process.exit(1);
	}

	exportDisqusToJson(inputPath, outputPath).catch((error) => {
		console.error('Export failed:', error);
		process.exit(1);
	});
}
