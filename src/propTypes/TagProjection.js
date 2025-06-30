import {forbidExtraProps} from '../../utils/propTypes';
import PropTypes          from 'prop-types';

const TagProjection = PropTypes.shape(forbidExtraProps({
	category  : PropTypes.string.isRequired,
	name      : PropTypes.string.isRequired,
	systemFrom: PropTypes.string,
	systemTo  : PropTypes.string,
}));

export default TagProjection;
