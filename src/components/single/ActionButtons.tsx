import {faEdit, faHeart, faSync} from '@fortawesome/free-solid-svg-icons';
import {faHeart as faRegularHeart} from '@fortawesome/free-regular-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useNavigate} from '@tanstack/react-router';
import {User} from 'firebase/auth';
import React, {useCallback} from 'react';
import Button from 'react-bootstrap/Button';

import useReconcileFavoritesMutation from '../../hooks/useReconcileFavorites';

interface ReconcileResult {
	blueprintId: string;
	actualCount: number;
	previousBlueprintCount: number;
	previousSummaryCount: number;
	hasDiscrepancy: boolean;
	reconciled: boolean;
}

interface ActionButtonsProps {
	user: User | null | undefined;
	blueprintId: string;
	isOwner: boolean;
	isModerator: boolean;
	isFavorite?: boolean;
	onFavorite: () => void;
	favoriteMutationIsPending: boolean;
}

export function ActionButtons({
	user,
	blueprintId,
	isOwner,
	isModerator,
	isFavorite,
	onFavorite,
	favoriteMutationIsPending,
}: ActionButtonsProps) {
	const navigate = useNavigate();
	const reconcileFavoritesMutation = useReconcileFavoritesMutation();

	const handleTransitionToEdit = useCallback(() => {
		navigate({to: '/edit/$blueprintId', params: {blueprintId}});
	}, [navigate, blueprintId]);

	const handleReconcileFavorites = useCallback(() => {
		reconcileFavoritesMutation.mutate(blueprintId);
	}, [blueprintId, reconcileFavoritesMutation]);

	const renderEditButton = useCallback(
		() => (
			<Button
				size="lg"
				onClick={handleTransitionToEdit}
			>
				<FontAwesomeIcon icon={faEdit} />
				{' Edit'}
			</Button>
		),
		[handleTransitionToEdit],
	);

	const renderFavoriteButton = useCallback(() => {
		if (!user) {
			return <div />;
		}

		const heart = isFavorite ? faHeart : faRegularHeart;
		const iconClass = isFavorite ? 'text-warning' : 'text-default';

		return (
			<Button
				size="lg"
				onClick={onFavorite}
				disabled={favoriteMutationIsPending}
			>
				<FontAwesomeIcon
					icon={heart}
					className={iconClass}
				/>
				{' Favorite'}
			</Button>
		);
	}, [user, isFavorite, onFavorite, favoriteMutationIsPending]);

	const renderReconcileButton = useCallback(() => {
		const {data: reconcileResult, isPending, isSuccess} = reconcileFavoritesMutation;
		const typedResult = reconcileResult as ReconcileResult | undefined;
		const buttonText = isPending
			? ' Reconciling...'
			: isSuccess && typedResult?.hasDiscrepancy
				? ` Fixed (${typedResult.actualCount} favorites)`
				: isSuccess && !typedResult?.hasDiscrepancy
					? ' No issues found'
					: ' Reconcile Favorites';

		const buttonVariant = isSuccess ? (typedResult?.hasDiscrepancy ? 'success' : 'info') : 'secondary';

		const tooltipText = isSuccess
			? typedResult?.hasDiscrepancy
				? `Fixed: ${typedResult.previousBlueprintCount} → ${typedResult.actualCount} favorites`
				: 'No discrepancy detected'
			: 'Reconcile favorites count';

		return (
			<Button
				size="lg"
				variant={buttonVariant}
				onClick={handleReconcileFavorites}
				disabled={isPending}
				title={tooltipText}
			>
				<FontAwesomeIcon
					icon={faSync}
					spin={isPending}
				/>
				{buttonText}
			</Button>
		);
	}, [handleReconcileFavorites, reconcileFavoritesMutation]);

	return (
		<div className="d-flex gap-2 flex-wrap">
			{(isOwner || isModerator) && renderEditButton()}
			{!isOwner && renderFavoriteButton()}
			{isModerator && renderReconcileButton()}
		</div>
	);
}
