import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/tag/$tag')({
	// This route doesn't need a loader but could have one if needed
});
