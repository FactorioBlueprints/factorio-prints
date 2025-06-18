import concat from 'lodash/concat';
import every from 'lodash/every';
import flatMap from 'lodash/flatMap';
import forOwn from 'lodash/forOwn';
import { countBy } from 'lodash';
import fpFlatMap from 'lodash/fp/flatMap';
import flow from 'lodash/fp/flow';
import fromPairs from 'lodash/fp/fromPairs';
import fpMap from 'lodash/fp/map';
import reject from 'lodash/fp/reject';
import reverse from 'lodash/fp/reverse';
import sortBy from 'lodash/fp/sortBy';
import toPairs from 'lodash/fp/toPairs';
import has from 'lodash/has';
import identity from 'lodash/identity';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import some from 'lodash/some';

import entitiesWithIcons from '../data/entitiesWithIcons';

const expressBeltTypes = [
	'express-splitter',
	'express-transport-belt',
	'express-underground-belt',
];

const fastBeltTypes = [
	'fast-splitter',
	'fast-transport-belt',
	'fast-underground-belt',
];

const slowBeltTypes = [
	'splitter',
	'transport-belt',
	'underground-belt',
];

const allBeltTypes = [
	...expressBeltTypes,
	...fastBeltTypes,
	...slowBeltTypes,
];

export const generateEntityHistogram = (parsedBlueprint: any): Array<[string, number]> => {
	const entities: any[] = concat(parsedBlueprint.entities || [], parsedBlueprint.tiles || []);
	const counts = countBy(entities, (entity: any) => entity.name);
	const pairs = toPairs(counts) as Array<[string, number]>;
	const sorted = sortBy(pairs, (pair: any) => pair[1]) as Array<[string, number]>;
	return reverse(sorted) as Array<[string, number]>;
};

export const generateItemHistogram = (parsedBlueprint: any): Array<[string, number]> =>
{
	const result: Record<string, number> = {};
	const items  = flatMap(parsedBlueprint.entities, (entity: any) => entity.items || []);
	items.forEach((item: any) =>
	{
		if (has(item, 'item') && has(item, 'count'))
		{
			result[item.item] = (result[item.item] || 0) + item.count;
		}
		else
		{
			forOwn(item, (value: number, key: string) => result[key] = (result[key] || 0) + value);
		}
	});

	const pairs = toPairs(result) as Array<[string, number]>;
	const sorted = sortBy(pairs, (pair: any) => pair[1]) as Array<[string, number]>;
	return reverse(sorted) as Array<[string, number]>;
};

const generateTagSuggestions = (title: string, parsedBlueprint: any, v15Decoded: any): string[] =>
{
	const tagSuggestions: string[] = [];

	if (!parsedBlueprint)
	{
		return tagSuggestions;
	}

	const generateTagSuggestionsFromProduction = (recipeCounts: Record<string, number>, entityCounts: Record<string, number>) =>
	{
		if (entityCounts['rocket-silo'] > 0)
		{
			tagSuggestions.push('/production/rocket parts/');
			if (recipeCounts['high-tech-science-pack'] > 0
				|| recipeCounts['military-science-pack'] > 0
				|| recipeCounts['production-science-pack'] > 0
				|| recipeCounts['science-pack-1'] > 0
				|| recipeCounts['science-pack-2'] > 0
				|| recipeCounts['science-pack-3'] > 0)
			{
				tagSuggestions.push('/production/science/');
			}
		}
		else if (recipeCounts['high-tech-science-pack'] > 0
			|| recipeCounts['military-science-pack'] > 0
			|| recipeCounts['production-science-pack'] > 0
			|| recipeCounts['science-pack-1'] > 0
			|| recipeCounts['science-pack-2'] > 0
			|| recipeCounts['science-pack-3'] > 0)
		{
			tagSuggestions.push('/production/science/');
		}
		else if (recipeCounts['low-density-structure'] > 0
			|| recipeCounts['rocket-fuel'] > 0
			|| recipeCounts['rocket-control-unit'] > 0)
		{
			tagSuggestions.push('/production/rocket parts/');
		}
		else if (recipeCounts['speed-module-3'] > 0
			|| recipeCounts['productivity-module-3'] > 0
			|| recipeCounts['effectivity-module-3'] > 0)
		{
			tagSuggestions.push('/production/modules/');
		}
		else if (recipeCounts['processing-unit'] > 0)
		{
			tagSuggestions.push('/production/processing unit (blue)/');
		}
		else if (recipeCounts['construction-robot']
			|| recipeCounts['flying-robot-frame']
			|| recipeCounts['logistic-robot'])
		{
			tagSuggestions.push('/production/robots/');
		}
		else if (recipeCounts.battery > 0)
		{
			tagSuggestions.push('/production/batteries/');
		}
		else if (recipeCounts['advanced-circuit'] > 0)
		{
			tagSuggestions.push('/production/advanced circuit (red)/');
		}
		else if (recipeCounts['plastic-bar'] > 0)
		{
			tagSuggestions.push('/production/plastic/');
		}
		else if (recipeCounts['coal-liquefaction'] > 0)
		{
			tagSuggestions.push('/production/coal liquification/');
		}
		else if (recipeCounts['advanced-oil-processing'] > 0
			|| recipeCounts['oil-processing'] > 0
			|| entityCounts.pumpjack > 0)
		{
			tagSuggestions.push('/production/oil processing/');
		}
		else if (recipeCounts['kovarex-enrichment-process'])
		{
			tagSuggestions.push('/power/kovarex enrichment/');
			if (recipeCounts['uranium-processing'])
			{
				tagSuggestions.push('/production/uranium/');
			}
		}
		else if (recipeCounts['uranium-processing'])
		{
			tagSuggestions.push('/production/uranium/');
		}
		else if (recipeCounts.inserter > 0)
		{
			tagSuggestions.push('/production/inserters/');
		}
		else if (recipeCounts['firearm-magazine']
			|| recipeCounts['piercing-rounds-magazine']
			|| recipeCounts['uranium-rounds-magazine']
			|| recipeCounts['defender-capsule']
			|| recipeCounts['destroyer-capsule']
			|| recipeCounts['distractor-capsule'])
		{
			tagSuggestions.push('/production/guns and ammo/');
		}
		else if (recipeCounts['electronic-circuit'] > 0)
		{
			tagSuggestions.push('/production/electronic circuit (green)/');
		}
		else if (some(allBeltTypes, each => recipeCounts[each] > 0))
		{
			tagSuggestions.push('/production/belts/');
		}
		else if (entityCounts['electric-furnace'] > 0 || entityCounts['steel-furnace'] > 0 || entityCounts['stone-furnace'] > 0)
		{
			tagSuggestions.push('/production/smelting/');
		}
		else if (entityCounts['electric-mining-drill'] > 0)
		{
			tagSuggestions.push('/production/mining/');
		}
	};

	const generateTagSuggestionsFromEntityHistogram = (entityHistogram: Array<[string, number]>, entityCounts: Record<string, number>) =>
	{
		if (isEmpty(entityHistogram))
		{
			return;
		}

		if (every(entityHistogram, pair => allBeltTypes.includes(pair[0])))
		{
			tagSuggestions.push('/belt/balancer/');

			const checkBeltSpeed = (beltTypes, tag) =>
			{
				if (every(entityHistogram, pair => beltTypes.includes(pair[0])))
				{
					tagSuggestions.push(tag);
				}
			};

			checkBeltSpeed(expressBeltTypes, '/belt/express transport belt (blue)/');
			checkBeltSpeed(fastBeltTypes, '/belt/fast transport belt (red)/');
			checkBeltSpeed(slowBeltTypes, '/belt/transport belt (yellow)/');
		}

		// Most common item

		if (entityHistogram[0][0] === 'small-lamp' || entityCounts['small-lamp'] > 100 && entityHistogram[1] && entityHistogram[1][0] === 'small-lamp')
		{
			tagSuggestions.push('/circuit/indicator/');
		}
	};

	const generateTagSuggestionsFromEntityCounts = (entityCounts: Record<string, number>) =>
	{
		// Mutually exclusive
		if (entityCounts.lab > 0)
		{
			tagSuggestions.push('/production/research (labs)/');
		}
		else if (!entityCounts['train-stop']
			&& entityCounts['stone-wall']
			&& entityCounts.gate
			&& entityCounts['straight-rail']
			&& entityCounts['rail-signal'])
		{
			tagSuggestions.push('/train/crossing/');
		}
		else if (!entityCounts['train-stop']
			&& entityCounts['curved-rail'] > 0
			&& entityCounts['rail-chain-signal'] > 0
			&& entityCounts['rail-signal'] > 0
			&& entityCounts['straight-rail'] > 0)
		{
			tagSuggestions.push('/train/junction/');
			tagSuggestions.push('/train/roundabout/');
		}

		if (entityCounts['nuclear-reactor'] > 0)
		{
			tagSuggestions.push('/power/nuclear/');
		}
		else if (entityCounts['solar-panel'] > 10)
		{
			tagSuggestions.push('/power/solar/');
		}
		else if (entityCounts['steam-engine'] > 1)
		{
			tagSuggestions.push('/power/steam/');
		}
		else if (entityCounts.accumulator > 1)
		{
			tagSuggestions.push('/power/accumulator/');
		}

		// Additional
		if (entityCounts.beacon > 10)
		{
			tagSuggestions.push('/general/beaconized/');
		}
	};

	const generateTagSuggestionsFromTitle = (title: string) =>
	{
		// Train
		if (/\b(pax)\b/i.test(title))
		{
			tagSuggestions.push('/train/pax/');
		}
		// Contains word starting with "unload"
		if (/\b(train)\b/i.test(title) && /\b(unload)/i.test(title))
		{
			tagSuggestions.push('/train/unloading station/');
		}
		// Contains word starting with "load"
		if (/\b(train)\b/i.test(title) && /\b(load)/i.test(title))
		{
			tagSuggestions.push('/train/loading station/');
		}
		if (/\b(lhd)\b/i.test(title) || /\b(left hand drive)\b/i.test(title))
		{
			tagSuggestions.push('/train/left-hand-drive/');
		}
		if (/\b(rhd)\b/i.test(title) || /\b(right hand drive)\b/i.test(title))
		{
			tagSuggestions.push('/train/right-hand-drive/');
		}

		if (/\b(mall)\b/i.test(title))
		{
			tagSuggestions.push('/production/mall (make everything)/');
		}

		if (/\b(early)\b/i.test(title))
		{
			tagSuggestions.push('/general/early game/');
		}
		if (/\b(mid)\b/i.test(title))
		{
			tagSuggestions.push('/general/mid game/');
		}
		if (/\b(late)\b/i.test(title) || /\b(megabase)\b/i.test(title))
		{
			tagSuggestions.push('/general/late game (megabase)/');
		}

		if (/\b(compact)\b/i.test(title))
		{
			tagSuggestions.push('/general/compact/');
		}

		if (/\b(tileable)\b/i.test(title) || /\b(tile)\b/i.test(title))
		{
			tagSuggestions.push('/general/tileable/');
		}
	};

	const generateTagSuggestionsForMods = (allGameEntities: string[], entityCounts: Record<string, number>, title: string) =>
	{
		if (/\b(Factorissimo)\b/i.test(title))
		{
			tagSuggestions.push('/mods/factorissimo/');
			return;
		}

		const allVanilla = every(allGameEntities, each => entitiesWithIcons[each] === true);
		if (allVanilla)
		{
			tagSuggestions.push('/mods/vanilla/');
			return;
		}

		const creativeMod             = some(allGameEntities, each => each.startsWith('creative-mode'));
		const bobsMod                 = some(allGameEntities, each => each.startsWith('electronics-machine') || each.startsWith('bob-'));
		const angelsMod               = some(allGameEntities, each => each.startsWith('angels-'));
		const warehousingMod          = entityCounts['storehouse-storage'] > 0
			|| entityCounts['warehouse-storage'] > 0;
		const lightedElectricPolesMod = entityCounts['lighted-small-electric-pole'] > 0
			|| entityCounts['lighted-medium-electric-pole'] > 0
			|| entityCounts['lighted-big-electric-pole'] > 0;

		if (creativeMod)
		{
			tagSuggestions.push('/mods/creative/');
		}
		if (bobsMod)
		{
			tagSuggestions.push('/mods/bobs/');
		}
		if (angelsMod)
		{
			tagSuggestions.push('/mods/angels/');
		}
		if (lightedElectricPolesMod)
		{
			tagSuggestions.push('/mods/lighted-electric-poles/');
		}
		if (warehousingMod)
		{
			tagSuggestions.push('/mods/warehousing/');
		}
		if (!creativeMod && !bobsMod && !angelsMod && !lightedElectricPolesMod && !warehousingMod)
		{
			tagSuggestions.push('/mods/other/');
		}
	};

	const generateAllTagSuggestions = (entityHistogram: Array<[string, number]>, entityCounts: Record<string, number>, recipeHistogram: Array<[string, number]>, recipeCounts: Record<string, number>, allGameEntities: string[]) =>
	{
		generateTagSuggestionsFromProduction(recipeCounts, entityCounts);
		generateTagSuggestionsFromEntityHistogram(entityHistogram, entityCounts);
		generateTagSuggestionsFromEntityCounts(entityCounts);
		generateTagSuggestionsFromTitle(title);
		generateTagSuggestionsForMods(allGameEntities, entityCounts, title);
	};

	if (v15Decoded)
	{
		if (parsedBlueprint.isBook())
		{
			const blueprintEntities: any[] = fpFlatMap((bp: any) => bp.blueprint?.entities || [])(v15Decoded.blueprint_book.blueprints);
			const entityCounts = countBy(blueprintEntities, (entity: any) => entity.name);
			const entityPairs = toPairs(entityCounts) as Array<[string, number]>;
			const sortedEntityPairs = sortBy(entityPairs, (pair: any) => pair[1]) as Array<[string, number]>;
			const entityHistogram = reverse(sortedEntityPairs) as Array<[string, number]>;

			const blueprintRecipes: any[] = fpFlatMap((bp: any) => bp.blueprint?.entities || [])(v15Decoded.blueprint_book.blueprints);
			const recipes = fpMap((entity: any) => entity.recipe)(blueprintRecipes);
			const definedRecipes: any[] = reject(isUndefined)(recipes) as any[];
			const recipeCounts = countBy(definedRecipes, (recipe: any) => recipe);
			const recipePairs = toPairs(recipeCounts) as Array<[string, number]>;
			const sortedRecipePairs = sortBy(recipePairs, (pair: any) => pair[1]) as Array<[string, number]>;
			const recipeHistogram = reverse(sortedRecipePairs) as Array<[string, number]>;

			const entityCountsObj = fromPairs(entityHistogram);
			const allGameEntities = Object.keys(entityCountsObj);
			const recipeCountsObj = fromPairs(recipeHistogram);

			generateAllTagSuggestions(entityHistogram, entityCountsObj, recipeHistogram, recipeCountsObj, allGameEntities);
		}
		else if (parsedBlueprint.isBlueprint())
		{
			const recipes = fpMap((entity: any) => entity.recipe)(v15Decoded.blueprint.entities || []);
			const definedRecipes: any[] = reject(isUndefined)(recipes) as any[];
			const recipeCounts = countBy(definedRecipes, (recipe: any) => recipe);
			const recipePairs = toPairs(recipeCounts) as Array<[string, number]>;
			const sortedRecipePairs = sortBy(recipePairs, (pair: any) => pair[1]) as Array<[string, number]>;
			const recipeHistogram = reverse(sortedRecipePairs) as Array<[string, number]>;

			const recipeCountsObj = fromPairs(recipeHistogram);
			const entityHistogram = generateEntityHistogram(v15Decoded.blueprint);
			const entityCountsObj = fromPairs(entityHistogram);
			const itemHistogram   = generateItemHistogram(v15Decoded.blueprint);
			const itemCountsObj   = fromPairs(itemHistogram);
			const allGameEntities = [
				...Object.keys(entityCountsObj),
				...Object.keys(itemCountsObj),
			];

			generateAllTagSuggestions(entityHistogram, entityCountsObj, recipeHistogram, recipeCountsObj, allGameEntities);
		}
	}

	if (parsedBlueprint && parsedBlueprint.isV14())
	{
		tagSuggestions.push('/version/0,14/');
	}
	else if (parsedBlueprint && parsedBlueprint.isV15())
	{
		tagSuggestions.push('/version/0,15/');
	}

	for (const tag of tagSuggestions)
	{
		if (!tag.startsWith('/') || !tag.endsWith('/'))
		{
			throw new Error(`Tag suggestion format error: "${tag}" must have leading and trailing slashes`);
		}
	}
	return tagSuggestions;
};

export default generateTagSuggestions;
