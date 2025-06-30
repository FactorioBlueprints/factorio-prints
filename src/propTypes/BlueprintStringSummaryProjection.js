import {forbidExtraProps} from '../../utils/propTypes';
import PropTypes          from 'prop-types';

const BlueprintStringSummaryProjection = PropTypes.shape(forbidExtraProps({
    blueprintString: PropTypes.string.isRequired,
}));

export default BlueprintStringSummaryProjection;
