import {forbidExtraProps} from 'airbnb-prop-types';
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

export const locationSchema = PropTypes.shape(forbidExtraProps({
	pathname: PropTypes.string.isRequired,
	search  : PropTypes.string.isRequired,
	hash    : PropTypes.string.isRequired,
	state   : PropTypes.string,
	key     : PropTypes.string,
}));

export const historySchema = PropTypes.shape({
	push: PropTypes.func.isRequired,
});
