import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';

const RecipeProjection = PropTypes.shape(forbidExtraProps({
	recipe    : PropTypes.string.isRequired,
	systemFrom: PropTypes.string,
	systemTo  : PropTypes.string,
}));

export default RecipeProjection;
