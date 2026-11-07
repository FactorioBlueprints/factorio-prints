import {describe, expect, it} from "vite-plus/test";
import {z} from "zod";
import {queryClient} from "./queryClient";

describe("query retry policy", () =>
{
	const retry = queryClient.getDefaultOptions().queries?.retry as (failureCount: number, error: Error) => boolean;

	it("retries a transient error once", () =>
	{
		expect(retry(0, new Error("network"))).toBe(true);
		expect(retry(1, new Error("network"))).toBe(false);
	});

	it("does not retry a schema validation failure", () =>
	{
		const validationError = new z.ZodError([]);

		expect(retry(0, validationError)).toBe(false);
	});
});
