import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes from 'prop-types';

const EntityProjection = PropTypes.shape(
	forbidExtraProps({
		entity: PropTypes.string.isRequired,
		systemFrom: PropTypes.string,
		systemTo: PropTypes.string,
	}),
);

export default EntityProjection;
