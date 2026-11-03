import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useNavigate} from "@tanstack/react-router";
import {deleteUser, type User} from "firebase/auth";
import {anonymiseUserBlueprints, deleteUserBlueprints, reauthenticateAndDeleteUser} from "../api/accountDeletion";

export type BlueprintDeletionChoice = "keep" | "delete";

interface DeleteAccountParams
{
	user: User;
	blueprints: BlueprintDeletionChoice;
}

export const useDeleteAccount = () =>
{
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const onSuccess = () =>
	{
		queryClient.clear();
		navigate(
			{
				to: "/",
			},
		);
	};

	// Blueprints are handled first, while the user is still signed in and the database rules allow it.
	const deleteAccount = useMutation<void, Error, DeleteAccountParams>(
		{
			mutationFn: async ({user, blueprints}) =>
			{
				if (blueprints === "delete")
				{
					await deleteUserBlueprints(user.uid);
				}
				else
				{
					await anonymiseUserBlueprints(user.uid);
				}
				await deleteUser(user);
			},
			onSuccess,
		},
	);

	// Retry after auth/requires-recent-login; runs from a click so the popup isn't blocked.
	const reauthenticateAndDelete = useMutation<void, Error, User>(
		{
			mutationFn: (user) => reauthenticateAndDeleteUser(user),
			onSuccess,
		},
	);

	return {
		deleteAccount,
		reauthenticateAndDelete,
	};
};
