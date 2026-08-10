import { faHeart as regularHeart } from "@fortawesome/free-regular-svg-icons";
import { faCheck, faEdit, faHeart, faPlusSquare, faSync } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { UseMutationResult } from "@tanstack/react-query";
import type { JSX } from "react";
import { useCallback } from "react";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import type { ReconcileResult } from "../../api/firebase";

interface BlueprintActionsProps {
  isOwner: boolean;
  isModerator: boolean;
  user: any;
  isFavorite: boolean;
  isInCollection: boolean;
  onEdit: () => void;
  onFavorite: () => void;
  onCollection: () => void;
  onReconcile: () => void;
  favoriteMutation: any;
  collectionMutation: any;
  reconcileMutation: UseMutationResult<ReconcileResult, unknown, string, unknown>;
  renderPlaygroundButton: () => JSX.Element;
}

export function BlueprintActions({
  isOwner,
  isModerator,
  user,
  isFavorite,
  isInCollection,
  onEdit,
  onFavorite,
  onCollection,
  onReconcile,
  favoriteMutation,
  collectionMutation,
  reconcileMutation,
  renderPlaygroundButton,
}: BlueprintActionsProps) {
  const renderEditButton = useCallback(
    () => (
      <Button size="lg" onClick={onEdit}>
        <FontAwesomeIcon icon={faEdit} />
        {" Edit"}
      </Button>
    ),
    [onEdit],
  );

  const renderFavoriteButton = useCallback(() => {
    if (!user) {
      return <div />;
    }

    const heart = isFavorite ? faHeart : regularHeart;
    const iconClass = isFavorite ? "text-warning" : "text-default";

    return (
      <Button size="lg" onClick={onFavorite} disabled={favoriteMutation.isPending}>
        <FontAwesomeIcon icon={heart} className={iconClass} />
        {" Favorite"}
      </Button>
    );
  }, [user, isFavorite, onFavorite, favoriteMutation.isPending]);

  const renderCollectionButton = useCallback(() => {
    if (!user) {
      return <div />;
    }

    const icon = isInCollection ? faCheck : faPlusSquare;
    const iconClass = isInCollection ? "text-warning" : "text-default";
    const buttonText = isInCollection ? " Collection" : " Add to Collection";

    return (
      <Button size="lg" onClick={onCollection} disabled={collectionMutation.isPending}>
        <FontAwesomeIcon icon={icon} className={iconClass} />
        {buttonText}
      </Button>
    );
  }, [user, isInCollection, onCollection, collectionMutation.isPending]);

  const renderReconcileButton = useCallback(() => {
    const { data: reconcileResult, isPending, isSuccess } = reconcileMutation;
    const typedResult = reconcileResult as ReconcileResult | undefined;
    const buttonText = isPending
      ? " Reconciling..."
      : isSuccess && typedResult?.hasDiscrepancy
        ? ` Fixed (${typedResult.actualCount} favorites)`
        : isSuccess && !typedResult?.hasDiscrepancy
          ? " No issues found"
          : " Reconcile Favorites";

    const buttonVariant = isSuccess
      ? typedResult?.hasDiscrepancy
        ? "success"
        : "info"
      : "secondary";

    const tooltipText = isSuccess
      ? typedResult?.hasDiscrepancy
        ? `Fixed: ${typedResult.previousBlueprintCount} → ${typedResult.actualCount} favorites`
        : "No discrepancy detected"
      : "Reconcile favorites count";

    return (
      <Button
        size="lg"
        variant={buttonVariant}
        onClick={onReconcile}
        disabled={isPending}
        title={tooltipText}
      >
        <FontAwesomeIcon icon={faSync} spin={isPending} />
        {buttonText}
      </Button>
    );
  }, [onReconcile, reconcileMutation]);

  return (
    <Col xs={12} md={{ span: 8, offset: 4 }} className="mt-3">
      <div className="d-flex gap-2 flex-wrap">
        {renderPlaygroundButton()}
        {(isOwner || isModerator) && renderEditButton()}
        {renderCollectionButton()}
        {!isOwner && renderFavoriteButton()}
        {isModerator && renderReconcileButton()}
      </div>
    </Col>
  );
}
