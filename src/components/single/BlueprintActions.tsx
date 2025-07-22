import {faHeart as regularHeart} from '@fortawesome/free-regular-svg-icons';
import {faEdit, faHeart, faSync} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import type {UseMutationResult} from '@tanstack/react-query';
import {useCallback} from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import type {ReconcileResult} from '../../api/firebase';

interface BlueprintActionsProps {
	isOwner: boolean;
	isModerator: boolean;
	user: any;
	isFavorite: boolean;
	onEdit: () => void;
	onFavorite: () => void;
	onReconcile: () => void;
	favoriteMutation: any;
	reconcileMutation: UseMutationResult<ReconcileResult, unknown, string, unknown>;
}

export function BlueprintActions({
	isOwner,
	isModerator,
	user,
	isFavorite,
	onEdit,
	onFavorite,
	onReconcile,
	favoriteMutation,
	reconcileMutation,
}: BlueprintActionsProps) {
	const renderEditButton = useCallback(
		() => (
			<Button
				size="lg"
				onClick={onEdit}
			>
				<FontAwesomeIcon icon={faEdit} />
				{' Edit'}
			</Button>
		),
		[onEdit],
	);

	const renderFavoriteButton = useCallback(() => {
		if (!user) {
			return <div />;
		}

		const heart = isFavorite ? faHeart : regularHeart;
		const iconClass = isFavorite ? 'text-warning' : 'text-default';

		return (
			<Button
				size="lg"
				onClick={onFavorite}
				disabled={favoriteMutation.isPending}
			>
				<FontAwesomeIcon
					icon={heart}
					className={iconClass}
				/>
				{' Favorite'}
			</Button>
		);
	}, [user, isFavorite, onFavorite, favoriteMutation.isPending]);

	const renderReconcileButton = useCallback(() => {
		const {data: reconcileResult, isPending, isSuccess} = reconcileMutation;
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
				onClick={onReconcile}
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
	}, [onReconcile, reconcileMutation]);

	return (
		<Col
			md={3}
			className="d-flex align-items-center justify-content-end"
		>
			<div className="d-flex gap-2 flex-wrap">
				{(isOwner || isModerator) && renderEditButton()}
				{!isOwner && renderFavoriteButton()}
				{isModerator && renderReconcileButton()}
			</div>
		</Col>
	);
}
