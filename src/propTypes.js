import {forbidExtraProps} from './utils/propTypes';
import PropTypes          from 'prop-types';

export const userSchema = PropTypes.shape(forbidExtraProps({
	uid        : PropTypes.string.isRequired,
	displayName: PropTypes.string,
	photoURL   : PropTypes.string,
}));

export const byTagSchema = PropTypes.objectOf(PropTypes.shape(forbidExtraProps({
	loading: PropTypes.bool.isRequired,
	data   : PropTypes.objectOf(PropTypes.bool.isRequired).isRequired,
})).isRequired).isRequired;
