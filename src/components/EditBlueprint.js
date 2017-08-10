import {forbidExtraProps} from 'airbnb-prop-types';
import firebase from 'firebase';
import update from 'immutability-helper';
import concat from 'lodash/concat';
import every from 'lodash/every';
import flatMap from 'lodash/flatMap';
import forEach from 'lodash/forEach';
import forOwn from 'lodash/forOwn';
import countBy from 'lodash/fp/countBy';
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
import difference from 'lodash/difference';

import marked from 'marked';
import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';

import Alert from 'react-bootstrap/lib/Alert';
import Button from 'react-bootstrap/lib/Button';
import ButtonToolbar from 'react-bootstrap/lib/ButtonToolbar';
import Col from 'react-bootstrap/lib/Col';
import ControlLabel from 'react-bootstrap/lib/ControlLabel';
import FormControl from 'react-bootstrap/lib/FormControl';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import Grid from 'react-bootstrap/lib/Grid';
import Jumbotron from 'react-bootstrap/lib/Jumbotron';
import Modal from 'react-bootstrap/lib/Modal';
import PageHeader from 'react-bootstrap/lib/PageHeader';
import Panel from 'react-bootstrap/lib/Panel';
import ProgressBar from 'react-bootstrap/lib/ProgressBar';
import Row from 'react-bootstrap/lib/Row';
import Thumbnail from 'react-bootstrap/lib/Thumbnail';
import Dropzone from 'react-dropzone';
import FontAwesome from 'react-fontawesome';

import Select from 'react-select';
import 'react-select/dist/react-select.css';
import {app} from '../base';

import Blueprint from '../Blueprint';

import entitiesWithIcons from '../data/entitiesWithIcons';
import noImageAvailable from '../gif/No_available_image.gif';
import buildImageUrl from '../helpers/buildImageUrl';

import scaleImage from '../helpers/ImageScaler';
import NoMatch from './NoMatch';

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

const allBeltTypes = [...expressBeltTypes, ...fastBeltTypes, ...slowBeltTypes];

const renderer = new marked.Renderer();
renderer.table = (header, body) => {
	return '<table class="table table-striped table-bordered">\n'
		+ '<thead>\n'
		+ header
		+ '</thead>\n'
		+ '<tbody>\n'
		+ body
		+ '</tbody>\n'
		+ '</table>\n';
};
marked.setOptions({
	renderer,
	gfm: true,
	tables: true,
	breaks: false,
	pedantic: false,
	sanitize: false,
	smartLists: true,
	smartypants: false
});

class EditBlueprint extends PureComponent
{
	static propTypes = forbidExtraProps({
		id          : PropTypes.string.isRequired,
		isModerator : PropTypes.bool,
		tags        : PropTypes.arrayOf(PropTypes.string).isRequired,
		user        : PropTypes.shape(forbidExtraProps({
			userId     : PropTypes.string.isRequired,
			displayName: PropTypes.string,
		})),
	});

	static contextTypes = {router: PropTypes.object.isRequired};

	state = {
		thumbnail               : undefined,
		renderedMarkdown        : '',
		files                   : [],
		rejectedFiles           : [],
		submissionErrors        : [],
		submissionWarnings      : [],
		uploadProgressBarVisible: false,
		uploadProgressPercent   : 0,
		deletionModalVisible    : false,
		loading                 : true,
	};

	static imgurHeaders = {
		Accept        : 'application/json',
		'Content-Type': 'application/json',
		Authorization : 'Client-ID 46a3f144b6a0882',
	};

	componentWillMount()
	{
		const blueprintRef = app.database().ref(`/blueprints/${this.props.id}`);
		blueprintRef.once('value').then((snapshot) =>
		{
			const blueprint = snapshot.val();
			if (blueprint)
			{
				blueprint.tags = blueprint.tags || [];
			}
			const renderedMarkdown = blueprint ? marked(blueprint.descriptionMarkdown) : undefined;
			const parsedBlueprint = blueprint ? this.parseBlueprint(blueprint.blueprintString) : undefined;
			const v15Decoded = parsedBlueprint && parsedBlueprint.getV15Decoded();

			this.setState({
				renderedMarkdown,
				blueprint,
				parsedBlueprint,
				v15Decoded,
				loading: false,
			});
		}).catch(console.log);
	}

	handleDismissAlert = () =>
	{
		this.setState({rejectedFiles: []});
	};

	handleDismissError = () =>
	{
		this.setState({submissionErrors: []});
	};

	handleDismissWarnings = () =>
	{
		this.setState({submissionWarnings: []});
	};

	handleDescriptionChanged = (event) =>
	{
		const descriptionMarkdown = event.target.value;
		const renderedMarkdown    = marked(descriptionMarkdown);
		this.setState({
			renderedMarkdown,
			blueprint: {
				...this.state.blueprint,
				descriptionMarkdown,
			},
		});
	};

	handleDrop = (acceptedFiles, rejectedFiles) =>
	{
		this.setState({
			files    : acceptedFiles,
			rejectedFiles,
			blueprint: {
				...this.state.blueprint,
				imageUrl: acceptedFiles.length > 1 && acceptedFiles[0].preview,
			},
		});

		if (acceptedFiles.length === 0)
		{
			return;
		}

		const config = {
			maxWidth : 350,
			maxHeight: 600,
			quality  : 0.70,
		};
		scaleImage(acceptedFiles[0], config, (imageData) =>
		{
			this.setState({thumbnail: imageData});
		});
	};

	handleChange = (event) =>
	{
		const name = event.target.name;
		const value = event.target.value;

		const newState = {
			blueprint: {
				...this.state.blueprint,
				[name]: value,
			},
		};

		if (name === 'blueprintString')
		{
			newState.parsedBlueprint = this.parseBlueprint(value);
			newState.v15Decoded = newState.parsedBlueprint && newState.parsedBlueprint.getV15Decoded();
		}

		this.setState(newState);
	};

	processStatus = (response) =>
	{
		if (response.status === 200 || response.status === 0)
		{
			return Promise.resolve(response);
		}
		return Promise.reject(new Error(response.statusText));
	};

	handleImgurError = (error) =>
	{
		console.error(error.message ? error.message : error);
	};

	handleFirebaseStorageError = (error) =>
	{
		console.error('Image failed to upload.', {error});
		this.setState({
			submissionErrors        : ['Image failed to upload.'],
			uploadProgressBarVisible: false,
		});
	};

	handleUploadProgress = (snapshot) =>
	{
		const uploadProgressPercent = Math.trunc(snapshot.bytesTransferred / snapshot.totalBytes * 100);
		this.setState({uploadProgressPercent});
	};

	validateInputs = () =>
	{
		const submissionErrors = [];
		const {blueprint} = this.state;
		if (!blueprint.title)
		{
			submissionErrors.push('Title may not be empty');
		}
		else if (blueprint.title.trim().length < 10)
		{
			submissionErrors.push('Title must be at least 10 characters');
		}

		if (!blueprint.descriptionMarkdown)
		{
			submissionErrors.push('Description Markdown may not be empty');
		}
		else if (blueprint.descriptionMarkdown.trim().length < 10)
		{
			submissionErrors.push('Description Markdown must be at least 10 characters');
		}

		if (!blueprint.blueprintString)
		{
			submissionErrors.push('Blueprint String may not be empty');
		}
		else if (blueprint.blueprintString.trim().length < 10)
		{
			submissionErrors.push('Blueprint String must be at least 10 characters');
		}

		return submissionErrors;
	};

	validateWarnings = () =>
	{
		const submissionWarnings = [];

		if (isEmpty(this.state.blueprint.tags))
		{
			submissionWarnings.push('The blueprint has no tags. Consider adding a few tags.');
		}

		const blueprint = new Blueprint(this.state.blueprint.blueprintString.trim());
		if (blueprint.decodedObject == null)
		{
			submissionWarnings.push('Could not parse blueprint.');
			return submissionWarnings;
		}

		if (blueprint.isV14())
		{
			submissionWarnings.push('Blueprint is in 0.14 format. Consider upgrading to the latest version.');
		}

		if (!blueprint.isBook() && isEmpty(this.state.v15Decoded.blueprint.label))
		{
			submissionWarnings.push('Blueprint has no name. Consider adding a name.');
		}
		if (!blueprint.isBook() && isEmpty(this.state.v15Decoded.blueprint.icons))
		{
			submissionWarnings.push('The blueprint has no icons. Consider adding icons.');
		}

		if (blueprint.isBook() && some(this.state.v15Decoded.blueprint_book.blueprints, eachBlueprint => isEmpty(eachBlueprint.blueprint.label)))
		{
			submissionWarnings.push('Some blueprints in the book have no name. Consider naming all blueprints.');
		}

		return submissionWarnings;
	};

	handleSaveBlueprintEdits = (event) =>
	{
		event.preventDefault();

		const submissionErrors = this.validateInputs();

		if (submissionErrors.length > 0)
		{
			this.setState({submissionErrors});
			return;
		}

		const submissionWarnings = this.validateWarnings();
		if (submissionWarnings.length > 0)
		{
			this.setState({submissionWarnings});
			return;
		}

		this.actuallySaveBlueprintEdits();
	};

	handleForceSaveBlueprintEdits = (event) =>
	{
		event.preventDefault();

		const submissionErrors = this.validateInputs();
		if (submissionErrors.length > 0)
		{
			this.setState({submissionErrors});
			return;
		}

		this.actuallySaveBlueprintEdits();
	};

	actuallySaveBlueprintEdits = () =>
	{
		const [file]     = this.state.files;
		let imagePromise;
		let uploadTask;
		if (file)
		{
			const fileNameRef = app.storage().ref().child(file.name);
			imagePromise = fileNameRef.getDownloadURL()
				.then(() =>
				{
					this.setState({submissionErrors: [`File with name ${file.name} already exists.`]});
				})
				.catch(() =>
				{
					this.setState({uploadProgressBarVisible: true});
					uploadTask = fileNameRef.put(file);
					uploadTask.on('state_changed', this.handleUploadProgress, this.handleFirebaseStorageError);
					return uploadTask;
				})
				.then(() =>
					fetch('https://api.imgur.com/3/upload.json', {
						method : 'POST',
						headers: EditBlueprint.imgurHeaders,
						body   : file,
					}))
				.catch(this.handleImgurError)
				.then(this.processStatus)
				.then(response => response.json())
				.then(json => json.data)
				.then(data =>
					({
						id        : data.id,
						deletehash: data.deletehash,
						type      : data.type,
						height    : data.height,
						width     : data.width,
					}));
		}
		else
		{
			imagePromise = Promise.resolve(this.state.blueprint.image);
		}

		imagePromise.then((image) =>
		{
			const updates = {
				[`/blueprints/${this.props.id}/title`]              : this.state.blueprint.title,
				[`/blueprints/${this.props.id}/blueprintString`]    : this.state.blueprint.blueprintString,
				[`/blueprints/${this.props.id}/descriptionMarkdown`]: this.state.blueprint.descriptionMarkdown,
				[`/blueprints/${this.props.id}/tags`]               : this.state.blueprint.tags || [],
				[`/blueprints/${this.props.id}/lastUpdatedDate`]    : firebase.database.ServerValue.TIMESTAMP,
				[`/blueprints/${this.props.id}/image`]              : image,
				[`/blueprintSummaries/${this.props.id}/title/`]     : this.state.blueprint.title,
				[`/blueprintSummaries/${this.props.id}/imgurId/`]   : image.id,
				[`/blueprintSummaries/${this.props.id}/imgurType/`] : image.type,
				// TODO: What about height, width, and deletehash?
			};

			if (file)
			{
				updates[`/blueprints/${this.props.id}/fileName/`]              = file.name;
			}
			if (uploadTask)
			{
				updates[`/blueprints/${this.props.id}/imageUrl/`]              = uploadTask.snapshot.downloadURL;
			}
			if (this.state.thumbnail)
			{
				updates[`/thumbnails/${this.props.id}`] = this.state.thumbnail;
			}
			this.props.tags.forEach((tag) =>
			{
				updates[`/byTag/${tag}/${this.props.id}`] = null;
			});
			forEach(this.state.blueprint.tags, (tag) => {
				updates[`/byTag/${tag}/${this.props.id}`] = true;
			});

			app.database().ref().update(updates);
		})
			.then(() => this.context.router.transitionTo(`/view/${this.props.id}`))
			.catch(console.log);
		// TODO: Delete old images from storage and imgur
	};

	handleCancel = () =>
	{
		this.context.router.transitionTo(`/view/${this.props.id}`);
	};

	handleShowConfirmDelete  = (event) =>
	{
		event.preventDefault();
		this.setState({deletionModalVisible: true});
	};

	handleHideConfirmDelete  = () =>
	{
		this.setState({deletionModalVisible: false});
	};

	handleDeleteBlueprint    = () =>
	{
		const authorId = this.state.blueprint.author.userId;
		const updates = {
			[`/blueprints/${this.props.id}`]                  : null,
			[`/users/${authorId}/blueprints/${this.props.id}`]: null,
			[`/thumbnails/${this.props.id}`]                  : null,
			[`/blueprintSummaries/${this.props.id}`]          : null,
		};
		this.props.tags.forEach((tag) =>
		{
			updates[`/byTag/${tag}/${this.props.id}`] = null;
		});
		app.database().ref().update(updates)
			.then(() =>
			{
				if (this.state.blueprint.fileName)
				{
					// TODO also delete imgur image
					const fileNameRef = app.storage().ref().child(this.state.blueprint.fileName);
					return fileNameRef.delete();
				}
				return undefined;
			})
			.then(() => this.context.router.transitionTo(`/user/${authorId}`))
			.catch(console.log);
	};

	parseBlueprint = (blueprintString) =>
	{
		try
		{
			return new Blueprint(blueprintString);
		}
		catch (ignored)
		{
			console.log(ignored);
			return undefined;
		}
	};

	entityHistogram = parsedBlueprint =>
		flow(
			countBy('name'),
			toPairs,
			sortBy(1),
			reverse,
		)(concat(parsedBlueprint.entities || [], parsedBlueprint.tiles || []));

	itemHistogram = (parsedBlueprint) =>
	{
		const result = {};
		const items       = flatMap(parsedBlueprint.entities, entity => entity.items || []);
		items.forEach((item) =>
		{
			if (has(item, 'item') && has(item, 'count'))
			{
				result[item.item] = (result[item.item] || 0) + item.count;
			}
			else
			{
				return forOwn(item, (value, key) => result[key] = (result[key] || 0) + value);
			}
		});

		return flow(
			toPairs,
			sortBy(1),
			reverse,
		)(result);
	};

	handleTagSelection = (selectedTags) =>
	{
		const tags = selectedTags.map(each => each.value);
		this.setState({
			blueprint: {
				...this.state.blueprint,
				tags,
			},
		});
	};

	addTag = (tag) =>
	{
		this.setState(update(this.state, {
			blueprint: {tags: {$push: [tag]}},
		}));
	};

	generateTagSuggestions = () =>
	{
		const tagSuggestions = [];

		const generateTagSuggestionsFromProduction = (recipeCounts, entityCounts) =>
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
				|| recipeCounts['logistic-robot'] )
			{
				tagSuggestions.push('/production/robots/');
			}
			else if (recipeCounts['battery'] > 0)
			{
				tagSuggestions.push('/production/batteries/');
			}
			else if (recipeCounts['advanced-circuit'] > 0)
			{
				tagSuggestions.push('/production/advanced circuit (red)/');
			}
			else if (recipeCounts['coal-liquefaction'] > 0)
			{
				tagSuggestions.push('/production/coal liquification/');
			}
			else if (recipeCounts['advanced-oil-processing'] > 0
				|| recipeCounts['oil-processing'] > 0
				|| entityCounts['pumpjack'] > 0)
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
			else if (recipeCounts['inserter'] > 0)
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

		const generateTagSuggestionsFromEntityHistogram = (entityHistogram, entityCounts) =>
		{
			if (isEmpty(entityHistogram))
			{
				return;
			}

			if (every(entityHistogram, (pair) => allBeltTypes.includes(pair[0])))
			{
				tagSuggestions.push('/belt/balancer/');

				const checkBeltSpeed = (beltTypes, tag) =>
				{
					if (every(entityHistogram, (pair) => beltTypes.includes(pair[0])))
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

		const generateTagSuggestionsFromEntityCounts = (entityCounts) =>
		{
			// Mutually exclusive
			if (entityCounts['lab'] > 0)
			{
				tagSuggestions.push('/production/research (labs)/');
			}
			else if (!entityCounts['train-stop']
				&& entityCounts['stone-wall']
				&& entityCounts['gate']
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
			else if (entityCounts['accumulator'] > 1)
			{
				tagSuggestions.push('/power/accumulator/');
			}

			// Additional
			if (entityCounts['beacon'] > 10)
			{
				tagSuggestions.push('/general/beaconized/');
			}
		};

		const generateTagSuggestionsFromTitle = (title) =>
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

		const generateTagSuggestionsForMods = (allGameEntities, entityCounts, title) =>
		{
			if (/\b(Factorissimo)\b/i.test(title))
			{
				tagSuggestions.push('/mods/factorissimo/');
				return;
			}

			const allVanilla = every(allGameEntities, (each) =>
			{
				const result = entitiesWithIcons[each] === true;
				if (!result)
				{
					console.log(each, 'not vanilla');
				}
				return result;
			});
			if (allVanilla)
			{
				tagSuggestions.push('/mods/vanilla/');
				return;
			}

			const creativeMod = some(allGameEntities, each => each.startsWith('creative-mode'));
			const warehousingMod = entityCounts['storehouse-storage'] > 0
				|| entityCounts['warehouse-storage'] > 0;
			const bobsMod = some(allGameEntities, each => each.startsWith('electronics-machine') || each.startsWith('bob-'));
			const angelsMod = some(allGameEntities, each => each.startsWith('angels-'));
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

		const generateAllTagSuggestions = (entityHistogram, entityCounts, recipeHistogram, recipeCounts, allGameEntities) =>
		{
			console.log({recipeCounts, entityCounts, parsedBlueprint: this.state.parsedBlueprint, v15Decoded: this.state.v15Decoded});

			generateTagSuggestionsFromProduction(recipeCounts, entityCounts);
			generateTagSuggestionsFromEntityHistogram(entityHistogram, entityCounts);
			generateTagSuggestionsFromEntityCounts(entityCounts);
			generateTagSuggestionsFromTitle(this.state.blueprint.title);
			generateTagSuggestionsForMods(allGameEntities, entityCounts, this.state.blueprint.title);
		};

		if (this.state.parsedBlueprint && this.state.v15Decoded)
		{
			if (this.state.parsedBlueprint.isBook())
			{
				const entityHistogram = flow(
					fpFlatMap('blueprint.entities'),
					countBy('name'),
					toPairs,
					sortBy(1),
					reverse,
				)(this.state.v15Decoded.blueprint_book.blueprints);
				const entityCounts = fromPairs(entityHistogram);

				const recipeHistogram = flow(
					fpFlatMap('blueprint.entities'),
					fpMap('recipe'),
					reject(isUndefined),
					countBy(identity),
					toPairs,
					sortBy(1),
					reverse,
				)(this.state.v15Decoded.blueprint_book.blueprints);
				const recipeCounts = fromPairs(recipeHistogram);
				const allGameEntities = Object.keys(entityCounts);

				generateAllTagSuggestions(entityHistogram, entityCounts, recipeHistogram, recipeCounts, allGameEntities);
			}
			else
			{
				const recipeHistogram = flow(
					fpMap('recipe'),
					reject(isUndefined),
					countBy(identity),
					toPairs,
					sortBy(1),
					reverse,
				)(this.state.v15Decoded.blueprint.entities);
				const recipeCounts = fromPairs(recipeHistogram);

				const entityHistogram = this.entityHistogram(this.state.v15Decoded.blueprint);
				const entityCounts = fromPairs(entityHistogram);
				const itemHistogram = this.itemHistogram(this.state.v15Decoded.blueprint);
				const itemCounts = fromPairs(itemHistogram);
				const allGameEntities = [...Object.keys(entityCounts), ...Object.keys(itemCounts)];

				generateAllTagSuggestions(entityHistogram, entityCounts, recipeHistogram, recipeCounts, allGameEntities);
			}
		}

		if (this.state.parsedBlueprint.isV14())
		{
			tagSuggestions.push('/version/0,14/');
		}
		else if (this.state.parsedBlueprint.isV15())
		{
			tagSuggestions.push('/version/0,15/');
		}

		return tagSuggestions;
	};

	renderOldThumbnail = () =>
	{
		const {id, type} = this.state.blueprint.image;
		const thumbnail          = buildImageUrl(id, type, 'b');

		return (
			<FormGroup controlId='formHorizontalBlueprint'>
				<Col componentClass={ControlLabel} sm={2}>{'Old screenshot'}</Col>
				<Col sm={10}>
					<Row>
						<Col xs={6} md={3}>
							<Thumbnail src={thumbnail}>
								<h4 className='truncate'>{this.state.blueprint.title}</h4>
							</Thumbnail>
						</Col>
					</Row>
				</Col>
			</FormGroup>
		);
	};

	renderPreview = () =>
	{
		if (!this.state.thumbnail)
		{
			return <div />;
		}

		return (
			<FormGroup controlId='formHorizontalBlueprint'>
				<Col componentClass={ControlLabel} sm={2}>{'Attached screenshot'}</Col>
				<Col sm={10}>
					<Row>
						<Col xs={6} md={3}>
							<Thumbnail src={this.state.thumbnail || this.state.blueprint.imageUrl || noImageAvailable}>
								<h4 className='truncate'>{this.state.blueprint.title}</h4>
							</Thumbnail>
						</Col>
					</Row>
				</Col>
			</FormGroup>
		);
	};

	render()
	{
		if (!this.props.user)
		{
			return (
				<Jumbotron>
					<h1>{'Create a Blueprint'}</h1>
					<p>{'Please log in with Google, Facebook, Twitter, or GitHub in order to add a Blueprint.'}</p>
				</Jumbotron>
			);
		}

		if (this.state.loading)
		{
			return <Jumbotron>
				<h1>
					<FontAwesome name='cog' spin />
					{' Loading data'}
				</h1>
			</Jumbotron>;
		}

		const blueprint = this.state.blueprint;
		if (!blueprint)
		{
			return <NoMatch />;
		}

		const ownedByCurrentUser = this.props.user && this.props.user.userId === blueprint.author.userId;
		if (!ownedByCurrentUser && !this.props.isModerator)
		{
			return <Jumbotron><h1>{'You are not the author of this blueprint.'}</h1></Jumbotron>;
		}

		const tagSuggestions = difference(this.generateTagSuggestions(), this.state.blueprint.tags);

		return (
			<div>
				<Modal show={this.state.uploadProgressBarVisible}>
					<Modal.Header>
						<Modal.Title>Image Upload Progress</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<ProgressBar active now={this.state.uploadProgressPercent} label={`${this.state.uploadProgressPercent}%`} />
					</Modal.Body>
				</Modal>
				<Modal show={!isEmpty(this.state.submissionWarnings)}>
					<Modal.Header>
						<Modal.Title>{'Submission warnings'}</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<p>
							{'The following warnings occurred while submitting your blueprint. Do you want to save it anyway or go back and make further edits?'}
						</p>
						<ul>
							{
								this.state.submissionWarnings.map(submissionWarning =>
									<li key={submissionWarning}>
										{submissionWarning}
									</li>)
							}
						</ul>
					</Modal.Body>
					<Modal.Footer>
						<ButtonToolbar>
							<Button bsStyle='danger' onClick={this.handleForceSaveBlueprintEdits}>
								<FontAwesome name='floppy-o' size='lg' />
								{' Save'}
							</Button>
							<Button bsStyle='primary' onClick={this.handleDismissWarnings}>
								<FontAwesome name='arrow-left' size='lg' />
								{' Go back'}
							</Button>
						</ButtonToolbar>
					</Modal.Footer>
				</Modal>
				<Modal show={this.state.deletionModalVisible} onHide={this.handleHideConfirmDelete}>
					<Modal.Header closeButton>
						<Modal.Title>Are you sure you want to delete the blueprint?</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<p>Deleting: {blueprint.title}</p>
						<p>This cannot be undone.</p>
					</Modal.Body>
					<Modal.Footer>
						<ButtonToolbar>
							<Button bsStyle='danger' onClick={this.handleDeleteBlueprint}>Delete</Button>
							<Button onClick={this.handleHideConfirmDelete}>Cancel</Button>
						</ButtonToolbar>
					</Modal.Footer>
				</Modal>
				<Grid>
					<Row>
						{this.state.rejectedFiles.length > 0 && <Alert
							bsStyle='warning'
							className='alert-fixed'
							onDismiss={this.handleDismissAlert}>
							<h4>{'Error uploading files'}</h4>
							<ul>
								{this.state.rejectedFiles.map(rejectedFile => <li
									key={rejectedFile.name}>{rejectedFile.name}</li>)}
							</ul>
						</Alert>}
						{this.state.submissionErrors.length > 0 && <Alert
							bsStyle='danger'
							className='alert-fixed'
							onDismiss={this.handleDismissError}>
							<h4>{'Error editing blueprint'}</h4>
							<ul>
								{this.state.submissionErrors.map(submissionError => <li
									key={submissionError}>{submissionError}</li>)}
							</ul>
						</Alert>}
					</Row>
					<Row>
						<PageHeader>
							{'Editing: '}{blueprint.title}
						</PageHeader>
					</Row>
					<Row>
						<form className='form-horizontal'>
							<FormGroup controlId='formHorizontalTitle'>
								<Col componentClass={ControlLabel} sm={2} autoFocus>{'Title'}</Col>
								<Col sm={10}>
									<FormControl
										type='text'
										name='title'
										placeholder='Title'
										value={blueprint.title}
										onChange={this.handleChange}
									/>
								</Col>
							</FormGroup>

							<FormGroup controlId='formHorizontalDescription'>
								<Col componentClass={ControlLabel} sm={2}>
									{'Description '}
									<a href='https://guides.github.com/features/mastering-markdown/'>
										{'[Tutorial]'}
									</a>
								</Col>
								<Col sm={10}>
									<FormControl
										componentClass='textarea'
										placeholder='Description (plain text or *GitHub Flavored Markdown*)'
										value={blueprint.descriptionMarkdown}
										onChange={this.handleDescriptionChanged}
										style={{minHeight: 200}}
									/>
								</Col>
							</FormGroup>

							<FormGroup>
								<Col componentClass={ControlLabel} sm={2}>{'Description (Preview)'}</Col>
								<Col sm={10}>
									<Panel>
										<div
											style={{minHeight: 200}}
											dangerouslySetInnerHTML={{__html: this.state.renderedMarkdown}}
										/>
									</Panel>
								</Col>
							</FormGroup>

							<FormGroup controlId='formHorizontalBlueprint'>
								<Col componentClass={ControlLabel} sm={2}>{'Blueprint String'}</Col>
								<Col sm={10}>
									<FormControl
										componentClass='textarea'
										name='blueprintString'
										placeholder='Blueprint String'
										value={blueprint.blueprintString}
										className='blueprintString'
										onChange={this.handleChange}
									/>
								</Col>
							</FormGroup>

							{tagSuggestions.length > 0 &&
							<FormGroup>
								<Col componentClass={ControlLabel} sm={2}>{'Tag Suggestions'}</Col>
								<Col sm={10}>
									<ButtonToolbar>
										{
											tagSuggestions.map((tagSuggestion) => {
												const disabled = this.state.blueprint.tags.includes(tagSuggestion);
												return <Button bsStyle='primary' key={tagSuggestion} onClick={() => this.addTag(tagSuggestion)}>
													<FontAwesome name='tag' />
													{' '}
													{tagSuggestion}
												</Button>;
											})
										}
									</ButtonToolbar>
								</Col>
							</FormGroup>
							}

							<FormGroup>
								<Col componentClass={ControlLabel} sm={2}>{'Tags'}</Col>
								<Col sm={10}>
									<Select
										value={this.state.blueprint.tags}
										options={this.props.tags.map(value => ({value, label: value}))}
										onChange={this.handleTagSelection}
										multi
										placeholder='Select at least one tag'
									/>
								</Col>
							</FormGroup>

							{this.renderOldThumbnail()}

							<FormGroup>
								<Col componentClass={ControlLabel} sm={2}>{'Replacement screenshot'}</Col>
								<Col sm={10}>
									<div>
										<Dropzone
											accept=' image/*'
											maxSize={10000000}
											className='dropzone'
											onDrop={this.handleDrop}>
											<div>{'Drop an image file here, or click to open the file chooser.'}</div>
										</Dropzone>
									</div>
								</Col>
							</FormGroup>

							{this.renderPreview()}

							<FormGroup>
								<Col smOffset={2} sm={10}>
									<ButtonToolbar>
										<Button
											bsStyle='primary'
											bsSize='large'
											onClick={this.handleSaveBlueprintEdits}
										>
											<FontAwesome name='floppy-o' size='lg' />
											{' Save'}
										</Button>
										{this.props.isModerator &&
										<Button
											bsStyle='danger'
											bsSize='large'
											onClick={this.handleShowConfirmDelete}
										>
											<FontAwesome name='trash-o' size='lg' />
											{' Delete'}
										</Button>}
										<Button
											bsSize='large'
											onClick={this.handleCancel}
										>
											<FontAwesome name='ban' size='lg' />
											{' Cancel'}
										</Button>
									</ButtonToolbar>
								</Col>
							</FormGroup>
						</form>
					</Row>
				</Grid></div>);
	}
}

export default EditBlueprint;
