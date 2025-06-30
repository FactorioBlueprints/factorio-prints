import {forbidExtraProps} from '../../utils/propTypes';
import PropTypes          from 'prop-types';

const ImgurImageProjection = PropTypes.shape(forbidExtraProps({
	imgurId   : PropTypes.string.isRequired,
	imgurType : PropTypes.string.isRequired,
	height    : PropTypes.number.isRequired,
	width     : PropTypes.number.isRequired,
	systemFrom: PropTypes.string,
	systemTo  : PropTypes.string,
}));

export default ImgurImageProjection;
