import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/user/$userId')({
	// This route doesn't need a loader but could have one if needed
});
