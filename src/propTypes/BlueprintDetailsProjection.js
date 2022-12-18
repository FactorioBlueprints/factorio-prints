import {forbidExtraProps}          from 'airbnb-prop-types';
import PropTypes                   from 'prop-types';
import BlueprintGameDataProjection from './BlueprintGameDataProjection';
import BlueprintVersionProjection  from './BlueprintVersionProjection';
import ImgurImageProjection        from './ImgurImageProjection';

const BlueprintDetailsProjection = PropTypes.shape(forbidExtraProps({
	key                : PropTypes.string.isRequired,
	title              : PropTypes.string.isRequired,
	descriptionMarkdown: PropTypes.string.isRequired,
	numberOfUpvotes    : PropTypes.number.isRequired,
	numberOfDownvotes  : PropTypes.number.isRequired,
	systemFrom         : PropTypes.string,
	systemTo           : PropTypes.string,
	createdOn          : PropTypes.string.isRequired,
	lastUpdatedById    : PropTypes.string.isRequired,
	author             : PropTypes.shape(forbidExtraProps({
		userId     : PropTypes.string.isRequired,
		displayName: PropTypes.string.isRequired,
	})).isRequired,
	imgurImage         : ImgurImageProjection.isRequired,
	tags               : PropTypes.arrayOf(PropTypes.shape(forbidExtraProps({
		tag: PropTypes.shape(forbidExtraProps({
			category: PropTypes.string.isRequired,
			name    : PropTypes.string.isRequired,
		})).isRequired,
	})).isRequired).isRequired,
	gameData           : BlueprintGameDataProjection,
	version            : BlueprintVersionProjection.isRequired,
}));

export default BlueprintDetailsProjection;
