import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/view/$blueprintId')({
	// This route could have a loader that fetches the blueprint data
	// loader: ({ params }) => {
	//   return fetchBlueprintById(params.blueprintId)
	// }
});
