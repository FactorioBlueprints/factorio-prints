import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/user/$userId')({
	// This route could have a loader that fetches the user data
	// loader: ({ params }) => {
	//   return fetchUserById(params.userId)
	// }
});
