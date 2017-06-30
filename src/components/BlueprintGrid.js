import every from 'lodash/every';
import get from 'lodash/get';
import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import {forbidExtraProps} from 'airbnb-prop-types';

import Grid from 'react-bootstrap/lib/Grid';
import PageHeader from 'react-bootstrap/lib/PageHeader';
import Row from 'react-bootstrap/lib/Row';

import base from '../base';

import BlueprintThumbnail from './BlueprintThumbnail';
import SearchForm from './SearchForm';
import TagForm from './TagForm';

class BlueprintGrid extends PureComponent
{
	static propTypes = forbidExtraProps({
		blueprintSummaries         : PropTypes.object.isRequired,
		tags                       : PropTypes.arrayOf(PropTypes.string).isRequired,
		lazilyFetchTaggedBlueprints: PropTypes.func.isRequired,
		byTag                      : PropTypes.object.isRequired,
		loadingTags                : PropTypes.bool.isRequired,
		initiallySelectedTags      : PropTypes.arrayOf(PropTypes.string),
		userFavorites              : PropTypes.object.isRequired,
		user                       : PropTypes.shape({
			userId: PropTypes.string.isRequired,
		}),
	});

	state = {
		blueprints  : {},
		loading     : true,
		searchString: '',
		selectedTags: [],
	};

	componentWillMount()
	{
		this.bindToState(this.props);
		this.setState({selectedTags: this.props.initiallySelectedTags || []});
	}

	componentWillReceiveProps(nextProps)
	{
		const oldUserId = get(this.props, 'user.userId');
		const newUserId = get(nextProps, 'user.userId');
		if (oldUserId !== newUserId)
		{
			this.bindToState(nextProps);
		}
	}

	componentWillUnmount()
	{
		this.unbindUserBlueprints();
	}

	unbindUserBlueprints = () =>
	{
		if (this.blueprintsRef)
		{
			base.removeBinding(this.blueprintsRef);
			this.blueprintsRef = null;
		}
	};

	bindToState = (props) =>
	{
		this.unbindUserBlueprints();

		// TODO: Move this state up to Root as myBlueprints or something, and share the state with TagGrid and other grids
		if (props.user)
		{
			this.blueprintsRef = base.bindToState(`/users/${props.user.userId}/blueprints`, {
				context  : this,
				state    : 'blueprints',
				then     : () => this.setState({loading: false}),
				onFailure: () => this.setState({loading: false}),
			});
		}
	};

	handleSearchString = (event) =>
	{
		event.preventDefault();

		this.setState({searchString: event.target.value});
	};

	handleTagSelection = (selectedTags) =>
	{
		this.props.lazilyFetchTaggedBlueprints();
		this.setState({selectedTags: selectedTags.map(each => each.value)});
	};

	render()
	{
		return <Grid>
			<Row>
				<PageHeader>{'Viewing Most Recent'}</PageHeader>
			</Row>
			<Row>
				<SearchForm
					searchString={this.state.searchString}
					onSearchString={this.handleSearchString}
				/>
				<TagForm
					tags={this.props.tags}
					selectedTags={this.state.selectedTags}
					onTagSelection={this.handleTagSelection}
				/>
			</Row>
			<Row>
				{
					Object.keys(this.props.blueprintSummaries)
						.filter(key => this.props.blueprintSummaries[key].title.toLowerCase().includes(this.state.searchString.toLowerCase()))
						.filter(key => this.props.loadingTags || every(this.state.selectedTags, (selectedTag) =>
						{
							const pathElements     = selectedTag.split('/').filter(each => each !== '');
							const blueprintsTagged = get(this.props.byTag, pathElements);
							return blueprintsTagged[key] === true;
						}))
						.reverse()
						.map((key) =>
						{
							const isMine = this.state.blueprints[key] === true;
							return (
								<BlueprintThumbnail
									key={key}
									id={key}
									isFavorite={this.props.userFavorites[key] === true}
									isMine={isMine}
									{...this.props.blueprintSummaries[key]}
								/>);
						})
				}
			</Row>
		</Grid>;
	}
}

export default BlueprintGrid;
