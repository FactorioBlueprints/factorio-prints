// /moderators is publicly readable in the database rules, so no credentials are needed.
export const createModeratorCheck =
	(fetch: (url: string) => Promise<Response>, databaseUrl: string) =>
	async (userId: string): Promise<boolean> =>
	{
		const response = await fetch(`${databaseUrl}/moderators/${encodeURIComponent(userId)}.json`);
		if (!response.ok) throw new Error(`Firebase returned ${response.status}`);
		return (await response.json()) === true;
	};
