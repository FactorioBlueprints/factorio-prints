import {forbidExtraProps}          from '../../utils/propTypes';
import PropTypes                   from 'prop-types';
import ImgurImageSummaryProjection from './ImgurImageSummaryProjection';

const BlueprintSummaryProjection = PropTypes.shape(forbidExtraProps({
	key        : PropTypes.string.isRequired,
	title      : PropTypes.string.isRequired,
	numberOfUpvotes: PropTypes.number,
	voteSummary: PropTypes.shape(forbidExtraProps({
		numberOfUpvotes: PropTypes.number,
	})),
	imgurImage : ImgurImageSummaryProjection.isRequired,
	systemFrom : PropTypes.string,
}));

export default BlueprintSummaryProjection;
