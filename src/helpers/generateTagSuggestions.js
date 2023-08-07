import concat      from 'lodash/concat';
import countBy     from 'lodash/countBy';
import every       from 'lodash/every';
import flatMap     from 'lodash/flatMap';
import forOwn      from 'lodash/forOwn';
import fromPairs   from 'lodash/fromPairs';
import has         from 'lodash/has';
import isEmpty     from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import map         from 'lodash/map';
import reject      from 'lodash/reject';
import reverse     from 'lodash/reverse';
import some        from 'lodash/some';
import sortBy      from 'lodash/sortBy';
import toPairs     from 'lodash/toPairs';

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

export const generateEntityHistogram = parsedBlueprint =>
{
	const items = concat(parsedBlueprint.entities || [], parsedBlueprint.tiles || []);
	const counts = countBy(items, 'name');
	const pairs = toPairs(counts);
	const sortedPairs = sortBy(pairs, [each=> each[1]]);
	return reverse(sortedPairs);
};

export const generateItemHistogram = (parsedBlueprint) =>
{
	const result = {};
	const items  = flatMap(parsedBlueprint.entities, entity => entity.items || []);
	items.forEach((item) =>
	{
		if (has(item, 'item') && has(item, 'count'))
		{
			result[item.item] = (result[item.item] || 0) + item.count;
		}
		else
		{
			forOwn(item, (value, key) => result[key] = (result[key] || 0) + value);
		}
	});

	const pairs = toPairs(result)
	const sortedPairs = sortBy(pairs, [each=> each[1]]);
	return reverse(sortedPairs);
};

const generateTagSuggestions = (title, parsedBlueprint, v15Decoded) =>
{
	const tagSuggestions = [];

	if (!parsedBlueprint)
	{
		return tagSuggestions;
	}

	const generateTagSuggestionsFromProduction = (recipeCounts, entityCounts) =>
	{
		if (entityCounts['rocket-silo'] > 0)
		{
			tagSuggestions.push('production/rocket parts');
			if (recipeCounts['high-tech-science-pack'] > 0
				|| recipeCounts['military-science-pack'] > 0
				|| recipeCounts['production-science-pack'] > 0
				|| recipeCounts['science-pack-1'] > 0
				|| recipeCounts['science-pack-2'] > 0
				|| recipeCounts['science-pack-3'] > 0)
			{
				tagSuggestions.push('production/science');
			}
		}
		else if (recipeCounts['high-tech-science-pack'] > 0
			|| recipeCounts['military-science-pack'] > 0
			|| recipeCounts['production-science-pack'] > 0
			|| recipeCounts['science-pack-1'] > 0
			|| recipeCounts['science-pack-2'] > 0
			|| recipeCounts['science-pack-3'] > 0)
		{
			tagSuggestions.push('production/science');
		}
		else if (recipeCounts['low-density-structure'] > 0
			|| recipeCounts['rocket-fuel'] > 0
			|| recipeCounts['rocket-control-unit'] > 0)
		{
			tagSuggestions.push('production/rocket parts');
		}
		else if (recipeCounts['speed-module-3'] > 0
			|| recipeCounts['productivity-module-3'] > 0
			|| recipeCounts['effectivity-module-3'] > 0)
		{
			tagSuggestions.push('production/modules');
		}
		else if (recipeCounts['processing-unit'] > 0)
		{
			tagSuggestions.push('production/processing unit (blue)');
		}
		else if (recipeCounts['construction-robot']
			|| recipeCounts['flying-robot-frame']
			|| recipeCounts['logistic-robot'])
		{
			tagSuggestions.push('production/robots');
		}
		else if (recipeCounts.battery > 0)
		{
			tagSuggestions.push('production/batteries');
		}
		else if (recipeCounts['advanced-circuit'] > 0)
		{
			tagSuggestions.push('production/advanced circuit (red)');
		}
		else if (recipeCounts['plastic-bar'] > 0)
		{
			tagSuggestions.push('production/plastic');
		}
		else if (recipeCounts['coal-liquefaction'] > 0)
		{
			tagSuggestions.push('production/coal liquification');
		}
		else if (recipeCounts['advanced-oil-processing'] > 0
			|| recipeCounts['oil-processing'] > 0
			|| entityCounts.pumpjack > 0)
		{
			tagSuggestions.push('production/oil processing');
		}
		else if (recipeCounts['kovarex-enrichment-process'])
		{
			tagSuggestions.push('power/kovarex enrichment');
			if (recipeCounts['uranium-processing'])
			{
				tagSuggestions.push('production/uranium');
			}
		}
		else if (recipeCounts['uranium-processing'])
		{
			tagSuggestions.push('production/uranium');
		}
		else if (recipeCounts.inserter > 0)
		{
			tagSuggestions.push('production/inserters');
		}
		else if (recipeCounts['firearm-magazine']
			|| recipeCounts['piercing-rounds-magazine']
			|| recipeCounts['uranium-rounds-magazine']
			|| recipeCounts['defender-capsule']
			|| recipeCounts['destroyer-capsule']
			|| recipeCounts['distractor-capsule'])
		{
			tagSuggestions.push('production/guns and ammo');
		}
		else if (recipeCounts['electronic-circuit'] > 0)
		{
			tagSuggestions.push('production/electronic circuit (green)');
		}
		else if (some(allBeltTypes, each => recipeCounts[each] > 0))
		{
			tagSuggestions.push('production/belts');
		}
		else if (entityCounts['electric-furnace'] > 0 || entityCounts['steel-furnace'] > 0 || entityCounts['stone-furnace'] > 0)
		{
			tagSuggestions.push('production/smelting');
		}
		else if (entityCounts['electric-mining-drill'] > 0)
		{
			tagSuggestions.push('production/mining');
		}
	};

	const generateTagSuggestionsFromEntityHistogram = (entityHistogram, entityCounts) =>
	{
		if (isEmpty(entityHistogram))
		{
			return;
		}

		if (every(entityHistogram, pair => allBeltTypes.includes(pair[0])))
		{
			tagSuggestions.push('belt/balancer');

			const checkBeltSpeed = (beltTypes, tag) =>
			{
				if (every(entityHistogram, pair => beltTypes.includes(pair[0])))
				{
					tagSuggestions.push(tag);
				}
			};

			checkBeltSpeed(expressBeltTypes, 'belt/express transport belt (blue)');
			checkBeltSpeed(fastBeltTypes, 'belt/fast transport belt (red)');
			checkBeltSpeed(slowBeltTypes, 'belt/transport belt (yellow)');
		}

		// Most common item
		// eslint-disable-next-line
		if (entityHistogram[0][0] === 'small-lamp' || entityCounts['small-lamp'] > 100 && entityHistogram[1] && entityHistogram[1][0] === 'small-lamp')
		{
			tagSuggestions.push('circuit/indicator');
		}
	};

	const generateTagSuggestionsFromEntityCounts = (entityCounts) =>
	{
		// Mutually exclusive
		if (entityCounts.lab > 0)
		{
			tagSuggestions.push('production/research (labs)');
		}
		else if (!entityCounts['train-stop']
			&& entityCounts['stone-wall']
			&& entityCounts.gate
			&& entityCounts['straight-rail']
			&& entityCounts['rail-signal'])
		{
			tagSuggestions.push('train/crossing');
		}
		else if (!entityCounts['train-stop']
			&& entityCounts['curved-rail'] > 0
			&& entityCounts['rail-chain-signal'] > 0
			&& entityCounts['rail-signal'] > 0
			&& entityCounts['straight-rail'] > 0)
		{
			tagSuggestions.push('train/junction');
			tagSuggestions.push('train/roundabout');
		}

		if (entityCounts['nuclear-reactor'] > 0)
		{
			tagSuggestions.push('power/nuclear');
		}
		else if (entityCounts['solar-panel'] > 10)
		{
			tagSuggestions.push('power/solar');
		}
		else if (entityCounts['steam-engine'] > 1)
		{
			tagSuggestions.push('power/steam');
		}
		else if (entityCounts.accumulator > 1)
		{
			tagSuggestions.push('power/accumulator');
		}

		// Additional
		if (entityCounts.beacon > 10)
		{
			tagSuggestions.push('general/beaconized');
		}
	};

	const generateTagSuggestionsFromTitle = (title) =>
	{
		// Train
		if (/\b(pax)\b/i.test(title))
		{
			tagSuggestions.push('train/pax');
		}
		// Contains word starting with "unload"
		if (/\b(train)\b/i.test(title) && /\b(unload)/i.test(title))
		{
			tagSuggestions.push('train/unloading station');
		}
		// Contains word starting with "load"
		if (/\b(train)\b/i.test(title) && /\b(load)/i.test(title))
		{
			tagSuggestions.push('train/loading station');
		}
		if (/\b(lhd)\b/i.test(title) || /\b(left hand drive)\b/i.test(title))
		{
			tagSuggestions.push('train/left-hand-drive');
		}
		if (/\b(rhd)\b/i.test(title) || /\b(right hand drive)\b/i.test(title))
		{
			tagSuggestions.push('train/right-hand-drive');
		}

		if (/\b(mall)\b/i.test(title))
		{
			tagSuggestions.push('production/mall (make everything)');
		}

		if (/\b(early)\b/i.test(title))
		{
			tagSuggestions.push('general/early game');
		}
		if (/\b(mid)\b/i.test(title))
		{
			tagSuggestions.push('general/mid game');
		}
		if (/\b(late)\b/i.test(title) || /\b(megabase)\b/i.test(title))
		{
			tagSuggestions.push('general/late game (megabase)');
		}

		if (/\b(compact)\b/i.test(title))
		{
			tagSuggestions.push('general/compact');
		}

		if (/\b(tileable)\b/i.test(title) || /\b(tile)\b/i.test(title))
		{
			tagSuggestions.push('general/tileable');
		}
	};

	const generateTagSuggestionsForMods = (allGameEntities, entityCounts, title) =>
	{
		if (/\b(Factorissimo)\b/i.test(title))
		{
			tagSuggestions.push('mods/factorissimo');
			return;
		}

		const allVanilla = every(allGameEntities, each => entitiesWithIcons[each] === true);
		if (allVanilla)
		{
			tagSuggestions.push('mods/vanilla');
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
			tagSuggestions.push('mods/creative');
		}
		if (bobsMod)
		{
			tagSuggestions.push('mods/bobs');
		}
		if (angelsMod)
		{
			tagSuggestions.push('mods/angels');
		}
		if (lightedElectricPolesMod)
		{
			tagSuggestions.push('mods/lighted-electric-poles');
		}
		if (warehousingMod)
		{
			tagSuggestions.push('mods/warehousing');
		}
		if (!creativeMod && !bobsMod && !angelsMod && !lightedElectricPolesMod && !warehousingMod)
		{
			tagSuggestions.push('mods/other');
		}
	};

	const generateAllTagSuggestions = (entityHistogram, entityCounts, recipeHistogram, recipeCounts, allGameEntities) =>
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
			const blueprints = v15Decoded.blueprint_book.blueprints;
			const entities = flatMap(blueprints, 'blueprint.entities');

			const entityCountBy = countBy(entities, 'name');
			const entityPairs = toPairs(entityCountBy);
			const entityHistogram = sortBy(entityPairs, 1).reverse();

			const recipes = map(entities, 'recipe');
			const nonUndefinedRecipes = reject(recipes, isUndefined);
			const recipeCountBy = countBy(nonUndefinedRecipes);
			const recipePairs = toPairs(recipeCountBy);
			const recipeHistogram = sortBy(recipePairs, 1).reverse();

			const entityCounts    = fromPairs(entityHistogram);
			const allGameEntities = Object.keys(entityCounts);
			const recipeCounts    = fromPairs(recipeHistogram);

			generateAllTagSuggestions(entityHistogram, entityCounts, recipeHistogram, recipeCounts, allGameEntities);
		}
		else if (parsedBlueprint.isBlueprint())
		{
			const blueprint = v15Decoded.blueprint;
			const entities = flatMap(blueprint, 'entities');

			const recipes = map(entities, 'recipe');
			const nonUndefinedRecipes = reject(recipes, isUndefined);
			const recipeCountBy = countBy(nonUndefinedRecipes);
			const recipePairs = toPairs(recipeCountBy);
			const recipeHistogram = sortBy(recipePairs, 1).reverse();

			const recipeCounts    = fromPairs(recipeHistogram);
			const entityHistogram = generateEntityHistogram(v15Decoded.blueprint);
			const entityCounts    = fromPairs(entityHistogram);
			const itemHistogram   = generateItemHistogram(v15Decoded.blueprint);
			const itemCounts      = fromPairs(itemHistogram);
			const allGameEntities = [
				...Object.keys(entityCounts),
				...Object.keys(itemCounts),
			];

			generateAllTagSuggestions(entityHistogram, entityCounts, recipeHistogram, recipeCounts, allGameEntities);
		}
	}

	return tagSuggestions;
};

export default generateTagSuggestions;
