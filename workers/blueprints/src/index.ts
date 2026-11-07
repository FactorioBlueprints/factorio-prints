import {defaultStore, handleRequest} from "./handler.ts";

export default
{
	async fetch(request: Request, environment: Env): Promise<Response>
	{
		return handleRequest(
			request,
			{
				storage:
				{
					database: environment.DB,
					strings: environment.STRINGS,
				},
				ingestSecret: environment.INGEST_SECRET ?? "",
				store: defaultStore,
			},
		);
	},
} satisfies ExportedHandler<Env>;
