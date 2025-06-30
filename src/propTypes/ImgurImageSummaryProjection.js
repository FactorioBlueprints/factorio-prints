import {forbidExtraProps} from '../../utils/propTypes';
import PropTypes          from 'prop-types';

const ImgurImageSummaryProjection = PropTypes.shape(forbidExtraProps({
	imgurId  : PropTypes.string.isRequired,
	imgurType: PropTypes.string.isRequired,
}));

export default ImgurImageSummaryProjection;
