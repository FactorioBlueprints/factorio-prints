import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/edit/$blueprintId')({
	// This route could have a loader that fetches the blueprint data for editing
	// loader: ({ params }) => {
	//   return fetchBlueprintById(params.blueprintId)
	// }
});
