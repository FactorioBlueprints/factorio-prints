import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';

const BlueprintStringSummaryProjection = PropTypes.shape(forbidExtraProps({
    blueprintString: PropTypes.string.isRequired,
}));

export default BlueprintStringSummaryProjection;
