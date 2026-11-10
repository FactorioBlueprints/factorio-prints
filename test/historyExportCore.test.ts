import {describe, expect, it} from "vite-plus/test";
import {buildExportStatements, type HistoryColumn} from "../scripts/historyExportCore";

const column = (table: string, name: string, dataType: string): HistoryColumn => (
{
	table,
	column: name,
	dataType,
});

describe("buildExportStatements", () =>
{
	it("quotes every identifier, converts timestamps to epoch milliseconds and remaps the end-of-time value in SYSTEM_TO", () =>
	{
		expect(
			buildExportStatements(
				[
					column("BLUEPRINT", "KEY", "CHARACTER VARYING"),
					column("BLUEPRINT", "CREATED_ON", "TIMESTAMP"),
					column("BLUEPRINT", "SYSTEM_TO", "TIMESTAMP"),
				],
				"/out",
			),
		).toStrictEqual([
			"CALL CSVWRITE('/out/BLUEPRINT.csv', 'SELECT \"KEY\", " +
				"DATEDIFF(MILLISECOND, TIMESTAMP ''1970-01-01 00:00:00'', \"CREATED_ON\") AS \"CREATED_ON\", " +
				"CASE WHEN \"SYSTEM_TO\" = TIMESTAMP ''9999-12-01 23:59:00'' THEN 253402300799999 " +
				"ELSE DATEDIFF(MILLISECOND, TIMESTAMP ''1970-01-01 00:00:00'', \"SYSTEM_TO\") END AS \"SYSTEM_TO\" " +
				"FROM \"BLUEPRINT\"', 'charset=UTF-8');",
		]);
	});

	it("exports blueprint string metadata and content separately, so the 4 GB of content never has to be loaded with the rows", () =>
	{
		expect(
			buildExportStatements(
				[
					column("BLUEPRINT_STRING", "SHA", "CHARACTER VARYING"),
					column("BLUEPRINT_STRING", "BLUEPRINT_STRING", "CHARACTER VARYING"),
					column("BLUEPRINT_STRING", "CREATED_BY_ID", "CHARACTER VARYING"),
				],
				"/out",
			),
		).toStrictEqual([
			"CALL CSVWRITE('/out/BLUEPRINT_STRING.csv', 'SELECT \"SHA\", \"CREATED_BY_ID\" FROM \"BLUEPRINT_STRING\"', 'charset=UTF-8');",
			"CALL CSVWRITE('/out/BLUEPRINT_STRING_CONTENT.csv', 'SELECT \"SHA\", \"BLUEPRINT_STRING\" FROM \"BLUEPRINT_STRING\"', 'charset=UTF-8');",
		]);
	});

	it("leaves out the bookkeeping tables, and exports the rest in the order given", () =>
	{
		expect(
			buildExportStatements(
				[
					column("DATABASECHANGELOG", "ID", "CHARACTER VARYING"),
					column("DATABASECHANGELOGLOCK", "ID", "INTEGER"),
					column("OBJECT_SEQUENCE", "SEQUENCE_NAME", "CHARACTER VARYING"),
					column("VOTE", "USER_ID", "CHARACTER VARYING"),
					column("TAG", "ORDINAL", "INTEGER"),
				],
				"/out",
			),
		).toStrictEqual([
			"CALL CSVWRITE('/out/VOTE.csv', 'SELECT \"USER_ID\" FROM \"VOTE\"', 'charset=UTF-8');",
			"CALL CSVWRITE('/out/TAG.csv', 'SELECT \"ORDINAL\" FROM \"TAG\"', 'charset=UTF-8');",
		]);
	});

	it("refuses an output directory that would break out of the SQL string literal", () =>
	{
		expect(() => buildExportStatements([column("TAG", "NAME", "CHARACTER VARYING")], "/it's")).toThrow(
			"Output directory must not contain a quote: /it's",
		);
	});
});
