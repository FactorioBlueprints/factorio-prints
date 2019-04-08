import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';

const dataPropType = PropTypes.shape(forbidExtraProps({
	loading: PropTypes.bool.isRequired,
	data   : PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
	error  : PropTypes.any,
})).isRequired;

const myPropTypes  = PropTypes.shape(forbidExtraProps({
	blueprints  : dataPropType,
	favorites   : dataPropType,
	entitlements: dataPropType,
}));

export default myPropTypes;
