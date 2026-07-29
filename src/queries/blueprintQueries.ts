import { fetchBlueprint, fetchBlueprintSummary } from "../api/firebase";
import { QUERY_CACHE_RETENTION_MILLISECONDS } from "../providers/queryClient";
import type { EnrichedBlueprintSummary } from "../schemas";

export const blueprintSummaryQuery = (blueprintId: string) => ({
  queryKey: ["blueprintSummaries", "blueprintId", blueprintId],
  queryFn: () => fetchBlueprintSummary(blueprintId),
  staleTime: 1000 * 60 * 60 * 24, // 24 hours
});

export const blueprintQuery = (
  blueprintId: string,
  blueprintSummary: EnrichedBlueprintSummary,
) => ({
  queryKey: ["blueprints", "blueprintId", blueprintId],
  queryFn: () => fetchBlueprint(blueprintId, blueprintSummary),
  staleTime: QUERY_CACHE_RETENTION_MILLISECONDS,
  gcTime: QUERY_CACHE_RETENTION_MILLISECONDS,
});
