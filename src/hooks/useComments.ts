import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {createComment, fetchComments, updateComment, deleteComment} from '../api/firebase';
import type {RawComment} from '../schemas';

export const useComments = (blueprintId: string) => {
	return useQuery<Record<string, RawComment>>({
		queryKey: ['comments', blueprintId],
		queryFn: () => fetchComments(blueprintId),
		enabled: !!blueprintId,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
	});
};

export const useCreateComment = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			blueprintId,
			authorId,
			authorDisplayName,
			content,
			parentId,
		}: {
			blueprintId: string;
			authorId: string;
			authorDisplayName: string;
			content: string;
			parentId?: string;
		}) => createComment(blueprintId, authorId, authorDisplayName, content, parentId),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({queryKey: ['comments', variables.blueprintId]});
		},
		onError: (error: any) => {
			// Log error details for debugging
			console.error('Comment creation failed:', error);

			// Extract user-friendly message
			let message = 'Failed to post comment. Please try again.';

			if (error.message?.includes('harmful content') || error.message?.includes('flagged')) {
				message = error.message;
			} else if (error.message?.includes('logged in') || error.message?.includes('authenticated')) {
				message = 'Please log in to post comments.';
			} else if (error.message?.includes('empty')) {
				message = 'Comment cannot be empty.';
			} else if (error.message?.includes('too long')) {
				message = error.message;
			}

			// You could integrate with a toast notification system here
			// For now, we'll let the component handle the error display
			throw new Error(message);
		},
	});
};

export const useUpdateComment = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			blueprintId,
			commentId,
			content,
			authorId,
		}: {
			blueprintId: string;
			commentId: string;
			content: string;
			authorId: string;
		}) => updateComment(blueprintId, commentId, content, authorId),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({queryKey: ['comments', variables.blueprintId]});
		},
	});
};

export const useDeleteComment = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({blueprintId, commentId, authorId}: {blueprintId: string; commentId: string; authorId: string}) =>
			deleteComment(blueprintId, commentId, authorId),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({queryKey: ['comments', variables.blueprintId]});
		},
	});
};
