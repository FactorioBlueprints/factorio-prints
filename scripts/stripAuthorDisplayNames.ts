import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {parseArgs} from "node:util";
import
{
	buildAuthorDisplayNameStripUpdate,
	chunkUpdate,
	extractBlueprints,
	type NullUpdate,
} from "./authorDisplayNameStripCore.ts";

// Removes the copied author.displayName from every /blueprints/{id}. Pages render the
// author's name live from users/{uid}/displayName, so the copy only leaks stale names.
//
// Dry run (default) reads an export file or the database and prints counts:
//   node scripts/stripAuthorDisplayNames.ts --export factorio-blueprints-export.json
//   node scripts/stripAuthorDisplayNames.ts --database-url https://<instance>.firebaseio.com
// Writing requires --execute and an OAuth token with database admin access:
//   FIREBASE_ACCESS_TOKEN="$(gcloud auth print-access-token)" \
//     node scripts/stripAuthorDisplayNames.ts --export <file> --execute

const defaultDatabaseUrl = "https://facorio-blueprints.firebaseio.com";

interface CommandOptions
{
	chunkSize: number;
	databaseUrl: string;
	execute: boolean;
	exportPath?: string;
}

const parsePositiveInteger = (value: string, optionName: string): number =>
{
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 1)
	{
		throw new Error(`${optionName} must be a positive integer`);
	}
	return parsed;
};

const parseCommandOptions = (): CommandOptions =>
{
	const {values} = parseArgs(
		{
			options:
			{
				"chunk-size":
				{
					default: "500",
					type: "string",
				},
				"database-url":
				{
					default: defaultDatabaseUrl,
					type: "string",
				},
				execute:
				{
					default: false,
					type: "boolean",
				},
				export:
				{
					type: "string",
				},
			},
			strict: true,
		},
	);

	return {
		chunkSize: parsePositiveInteger(values["chunk-size"], "--chunk-size"),
		databaseUrl: values["database-url"].replace(/\/+$/, ""),
		execute: values.execute,
		exportPath: values.export ? resolve(values.export) : undefined,
	};
};

const loadBlueprints = async (options: CommandOptions): Promise<unknown> =>
{
	if (options.exportPath)
	{
		return extractBlueprints(JSON.parse(await readFile(options.exportPath, "utf8")));
	}
	const response = await fetch(`${options.databaseUrl}/blueprints.json`);
	if (!response.ok)
	{
		throw new Error(`Firebase read failed with HTTP ${response.status}`);
	}
	return response.json();
};

const applyUpdate = async (databaseUrl: string, update: NullUpdate, accessToken: string) =>
{
	const response = await fetch(
		`${databaseUrl}/.json`,
		{
			body: JSON.stringify(update),
			headers:
			{
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			method: "PATCH",
		},
	);
	if (!response.ok)
	{
		throw new Error(`Firebase update failed with HTTP ${response.status}: ${await response.text()}`);
	}
};

const main = async () =>
{
	const options = parseCommandOptions();
	const blueprints = await loadBlueprints(options);
	const update = buildAuthorDisplayNameStripUpdate(blueprints);
	const chunks = chunkUpdate(update, options.chunkSize);

	console.log(
		JSON.stringify(
			{
				blueprints: blueprints && typeof blueprints === "object" ? Object.keys(blueprints).length : 0,
				blueprintsWithDisplayName: Object.keys(update).length,
				chunks: chunks.length,
				databaseUrl: options.databaseUrl,
				execute: options.execute,
				source: options.exportPath ?? options.databaseUrl,
			},
			null,
			2,
		),
	);

	if (!options.execute)
	{
		console.log("Dry run: nothing written. Pass --execute to apply the update.");
		return;
	}

	const accessToken = process.env.FIREBASE_ACCESS_TOKEN;
	if (!accessToken)
	{
		throw new Error("FIREBASE_ACCESS_TOKEN is required with --execute");
	}

	for (const [index, chunk] of chunks.entries())
	{
		await applyUpdate(options.databaseUrl, chunk, accessToken);
		console.log(`Applied chunk ${index + 1}/${chunks.length} (${Object.keys(chunk).length} paths)`);
	}
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href)
{
	main().catch((error: unknown) =>
	{
		console.error(error);
		process.exitCode = 1;
	});
}
