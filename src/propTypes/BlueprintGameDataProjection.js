import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';

const BlueprintGameDataProjection = PropTypes.shape(forbidExtraProps({
	versionNumber: PropTypes.number,
	version1     : PropTypes.number,
	version2     : PropTypes.number,
	version3     : PropTypes.number,
	version4     : PropTypes.number,
	versionString: PropTypes.string,
	systemFrom   : PropTypes.string,
	systemTo     : PropTypes.string,
}));

export default BlueprintGameDataProjection;
