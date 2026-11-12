import {execFileSync} from "node:child_process";
import {mkdir, writeFile} from "node:fs/promises";
import {dirname} from "node:path";
import {parseArgs} from "node:util";
import {type AuthExport, authListUrl, toAuthExportUser} from "./authExportCore.ts";

// Lists a Firebase project's Auth accounts, read-only, keeping only uid, email, photo URL, provider ids and the
// disabled flag. It uses the application default credentials already on the machine, through gcloud.

const main = async (): Promise<void> =>
{
	const {values} = parseArgs(
		{
			options:
			{
				project:
				{
					type: "string",
				},
				out:
				{
					type: "string",
				},
			},
		},
	);
	const {out, project} = values;
	if (!project || !out)
	{
		throw new Error("Usage: node scripts/exportAuthUsers.ts --project <firebase project id> --out <file.json>");
	}
	const token = execFileSync(
		"gcloud",
		["auth", "application-default", "print-access-token"],
		{
			encoding: "utf8",
		},
	).trim();

	const exported: AuthExport =
	{
		exportedAt: Date.now(),
		users: [],
	};
	let pageToken: string | undefined;
	do
	{
		const response = await fetch(
			authListUrl(project, pageToken),
			{
				headers:
				{
					authorization: `Bearer ${token}`,
					// User credentials need to name the project whose quota the call uses.
					"x-goog-user-project": project,
				},
			},
		);
		if (!response.ok)
		{
			throw new Error(`Listing accounts returned ${response.status}: ${await response.text()}`);
		}
		const page = (await response.json()) as
		{
			users?: Record<string, unknown>[];
			nextPageToken?: string;
		};
		exported.users.push(...(page.users ?? []).map(toAuthExportUser));
		pageToken = page.nextPageToken || undefined;
	}
	while (pageToken !== undefined);

	await mkdir(
		dirname(out),
		{
			recursive: true,
		},
	);
	await writeFile(out, JSON.stringify(exported));
	console.log(`${exported.users.length} accounts written to ${out}`);
};

await main();
