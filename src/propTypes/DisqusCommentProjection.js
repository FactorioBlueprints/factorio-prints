import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';

const DisqusCommentProjection = PropTypes.shape(forbidExtraProps({
	id        : PropTypes.number.isRequired,
	text      : PropTypes.string.isRequired,
	deleted   : PropTypes.bool.isRequired,
	createdOn : PropTypes.string,
	systemFrom: PropTypes.string,
	systemTo  : PropTypes.string,
	author    : PropTypes.shape(forbidExtraProps({
		name    : PropTypes.string.isRequired,
		username: PropTypes.string.isRequired,
	})),
}));

DisqusCommentProjection.replies = PropTypes.arrayOf(DisqusCommentProjection.isRequired).isRequired;
export default DisqusCommentProjection;
