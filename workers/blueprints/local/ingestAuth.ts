import {readFile} from "node:fs/promises";
import {DatabaseSync} from "node:sqlite";
import {parseArgs} from "node:util";
import type {AuthExport} from "../../../scripts/authExportCore.ts";
import {applyAuthExport} from "./authIngestCore.ts";

// Applies a listing of the project's Auth accounts (from scripts/exportAuthUsers.ts) to the users in the local
// SQLite database. Without --repair it only reports what would change.

const main = async (): Promise<void> =>
{
	const {values} = parseArgs(
		{
			options:
			{
				auth:
				{
					type: "string",
				},
				sqlite:
				{
					type: "string",
				},
				repair:
				{
					type: "boolean",
					default: false,
				},
			},
		},
	);
	const {auth, sqlite} = values;
	if (!auth || !sqlite)
	{
		throw new Error(
			"Usage: node workers/blueprints/local/ingestAuth.ts --auth <users.json> --sqlite <file> [--repair]",
		);
	}
	const database = new DatabaseSync(sqlite);
	const report = await applyAuthExport(
		database,
		JSON.parse(await readFile(auth, "utf8")) as AuthExport,
		values.repair ? "repair" : "shadow",
	);
	database.close();
	console.log(JSON.stringify(report, null, "\t"));
};

await main();
