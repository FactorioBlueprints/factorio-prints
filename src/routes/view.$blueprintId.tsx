import {createFileRoute} from '@tanstack/react-router';
import React from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import SingleBlueprint from '../components/SingleBlueprint';
import {queryClient} from '../providers/queryClient';
import {blueprintQuery, blueprintSummaryQuery} from '../queries/blueprintQueries';
import type {EnrichedBlueprint, EnrichedBlueprintSummary} from '../schemas';
import enrichBlueprint from '../utils/enrichBlueprint';
import {enrichBlueprintSummary} from '../utils/enrichBlueprintSummary';

export interface LoaderData {
	blueprintSummary: EnrichedBlueprintSummary | null;
	blueprintData: EnrichedBlueprint | null;
}

export const Route = createFileRoute('/view/$blueprintId')({
	component: ViewBlueprintComponent,
	loader: async ({params}): Promise<LoaderData> => {
		const {blueprintId} = params;

		// First fetch the blueprint summary
		const summaryData = await queryClient.fetchQuery(blueprintSummaryQuery(blueprintId));

		if (!summaryData) {
			return {
				blueprintSummary: null,
				blueprintData: null,
			};
		}

		// Enrich the summary
		const enrichedSummary = enrichBlueprintSummary(summaryData, blueprintId);

		if (!enrichedSummary) {
			return {
				blueprintSummary: null,
				blueprintData: null,
			};
		}

		// Then fetch the full blueprint
		const blueprintRawData = await queryClient.fetchQuery(blueprintQuery(blueprintId, enrichedSummary));

		const enrichedBlueprint = blueprintRawData ? enrichBlueprint(blueprintRawData, blueprintId) : null;

		return {
			blueprintSummary: enrichedSummary,
			blueprintData: enrichedBlueprint,
		};
	},
});

function ViewBlueprintComponent() {
	return (
		<ErrorBoundary>
			<SingleBlueprint />
		</ErrorBoundary>
	);
}
