import {env} from "cloudflare:workers";
import {describe, expect, it} from "vite-plus/test";

describe("system-time text columns", () =>
{
	it("render epoch milliseconds as UTC text with milliseconds, including the sentinel", async () =>
	{
		await env.DB.prepare("INSERT INTO item (key, title, system_from) VALUES (?, ?, ?)")
			.bind("a", "A", Date.UTC(2026, 10, 8, 15, 42, 7, 9))
			.run();
		await env.DB.prepare("INSERT INTO item (key, title, system_from, system_to) VALUES (?, ?, ?, ?)")
			.bind("b", "B", 1, Date.UTC(2026, 0, 1, 0, 0, 0, 999))
			.run();

		const rows = await env.DB.prepare("SELECT key, system_from_text, system_to_text FROM item ORDER BY key").all();

		expect(rows.results).toEqual([
			{
				key: "a",
				system_from_text: "2026-11-08 15:42:07.009",
				system_to_text: "9999-12-31 23:59:59.999",
			},
			{
				key: "b",
				system_from_text: "1970-01-01 00:00:00.001",
				system_to_text: "2026-01-01 00:00:00.999",
			},
		]);
	});

	it("cannot be written", async () =>
	{
		await expect(
			env.DB.prepare("INSERT INTO item (key, title, system_from, system_from_text) VALUES (?, ?, ?, ?)")
				.bind("a", "A", 1, "x")
				.run(),
		).rejects.toThrow(/generated column/);
	});
});
