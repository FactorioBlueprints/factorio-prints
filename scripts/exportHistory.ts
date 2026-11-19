import {execFileSync} from "node:child_process";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import {join, resolve} from "node:path";
import {parseArgs} from "node:util";
import {buildExportStatements, COLUMNS_QUERY, type HistoryColumn} from "./historyExportCore.ts";
import {CsvRowParser} from "./historyImportCore.ts";

// Exports factorio.school's history database to one CSV per table for importHistory.ts. The database is opened
// read-only and without a file lock, so it is safe to point at the master copy.

const main = async (): Promise<void> =>
{
	const {values} = parseArgs(
		{
			options:
			{
				database:
				{
					type: "string",
				},
				"h2-jar":
				{
					type: "string",
				},
				java:
				{
					type: "string",
					default: "java",
				},
				"out-dir":
				{
					type: "string",
				},
			},
		},
	);
	const databasePath = values.database;
	const h2Jar = values["h2-jar"];
	if (!databasePath || !h2Jar || !values["out-dir"])
	{
		throw new Error(
			"Usage: node scripts/exportHistory.ts --database <file.mv.db> --h2-jar <h2.jar> --out-dir <dir> [--java <java>]",
		);
	}
	const outputDirectory = resolve(values["out-dir"]);
	await mkdir(
		outputDirectory,
		{
			recursive: true,
		},
	);

	const url = `jdbc:h2:file:${resolve(databasePath).replace(/\.mv\.db$/, "")};ACCESS_MODE_DATA=r;FILE_LOCK=NO;IFEXISTS=TRUE`;
	const h2 = (tool: string, ...toolArguments: string[]): void =>
	{
		execFileSync(
			values.java,
			["-cp", h2Jar, `org.h2.tools.${tool}`, "-url", url, "-user", "sa", "-password", "", ...toolArguments],
			{
				stdio: "inherit",
			},
		);
	};

	const columnsPath = join(outputDirectory, "columns.txt");
	h2("Shell", "-sql", `CALL CSVWRITE('${columnsPath}', '${COLUMNS_QUERY.replaceAll("'", "''")}', 'charset=UTF-8')`);
	const parser = new CsvRowParser();
	const rows = [...parser.push(await readFile(columnsPath, "utf8")), ...parser.end()].slice(1);
	const columns = rows.map(([table, column, dataType]): HistoryColumn => (
	{
		table: table ?? "",
		column: column ?? "",
		dataType: dataType ?? "",
	}));

	const scriptPath = join(outputDirectory, "export.sql");
	await writeFile(scriptPath, `${buildExportStatements(columns, outputDirectory).join("\n")}\n`);
	h2("RunScript", "-script", scriptPath);
	console.log(`Exported the history database to ${outputDirectory}`);
};

await main();
