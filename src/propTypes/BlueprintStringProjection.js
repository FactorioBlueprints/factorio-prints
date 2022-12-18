import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';

const BlueprintStringProjection = PropTypes.shape(forbidExtraProps({
	blueprintString: PropTypes.string.isRequired,
	systemFrom     : PropTypes.string,
	systemTo       : PropTypes.string,
}));

export default BlueprintStringProjection;
