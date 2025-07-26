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
