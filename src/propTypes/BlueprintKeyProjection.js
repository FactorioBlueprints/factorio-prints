import {forbidExtraProps} from '../../utils/propTypes';
import PropTypes          from 'prop-types';

const BlueprintKeyProjection = PropTypes.shape(forbidExtraProps({
	key: PropTypes.string.isRequired,
}));

export default BlueprintKeyProjection;
