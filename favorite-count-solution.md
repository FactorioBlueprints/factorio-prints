# Favorite Count Solution

## Problem

The `numberOfFavorites` field needs to be updated whenever users toggle favorites, but allowing any authenticated user to write arbitrary values creates security and consistency issues.

## Current Solution: Authenticated Write Access

We're maintaining the current approach with improved security rules:

1. **Allow authenticated users** to write to `numberOfFavorites`
2. **Validate the value** is a non-negative number
3. **Maintain existing client logic** that calculates counts based on current state

## Implementation Details

### Database Rules

The rules allow authenticated users to write to `numberOfFavorites` with validation:

```json
"numberOfFavorites": {
  ".write": "auth != null",
  ".validate": "newData.isNumber() && newData.val() >= 0"
}
```

### Current Hook Behavior

The existing `useToggleFavoriteMutation.ts` hook:

- Takes the current `numberOfFavorites` from the blueprint data
- Increments/decrements based on the toggle action
- Updates all related locations atomically

```typescript
const currentFavoriteCount = numberOfFavorites || 0;
const newIsFavorite = !isFavorite;
const newFavoriteCount = Math.max(0, currentFavoriteCount + (newIsFavorite ? 1 : -1));

const updates = {
	[`/blueprints/${blueprintId}/numberOfFavorites`]: newFavoriteCount,
	[`/blueprints/${blueprintId}/favorites/${userId}`]: newIsFavorite ? true : null,
	[`/blueprintSummaries/${blueprintId}/numberOfFavorites`]: newFavoriteCount,
	[`/users/${userId}/favorites/${blueprintId}`]: newIsFavorite ? true : null,
};
```

## Known Limitations

1. **Race Conditions**: Multiple simultaneous favorites can cause count drift
2. **Trust Issues**: Relies on clients to calculate correctly
3. **No Automatic Reconciliation**: Counts can diverge from actual favorites over time

## Recommended Long-term Solution

### Option 1: Cloud Functions (Recommended)

Deploy Cloud Functions that trigger on favorite changes and automatically update counts:

- See `functions/src/index.ts` for implementation
- Provides true atomicity and consistency
- No client-side changes needed

### Option 2: Client-Side Transactions

Use Firebase transactions to ensure atomic updates:

- More complex client code
- Better consistency than current approach
- Still vulnerable to client manipulation

### Option 3: Periodic Reconciliation

Run scheduled jobs to reconcile counts with actual favorites:

- See `scripts/migrate-firebase-data.ts` for reconciliation logic
- Can be run as a Cloud Function or admin script
- Fixes drift but doesn't prevent it

## Migration Path

1. Deploy the updated Firebase rules
2. Monitor for any issues with the current approach
3. Plan migration to Cloud Functions when feasible
4. Run reconciliation script to fix any existing discrepancies
