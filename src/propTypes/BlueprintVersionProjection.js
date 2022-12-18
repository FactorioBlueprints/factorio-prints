import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';

const BlueprintVersionProjection = PropTypes.shape(forbidExtraProps({
	systemFrom: PropTypes.string,
	systemTo  : PropTypes.string,
	number    : PropTypes.number.isRequired,
	createdOn : PropTypes.string.isRequired,
}));

export default BlueprintVersionProjection;
