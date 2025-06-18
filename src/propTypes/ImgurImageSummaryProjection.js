import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes from 'prop-types';

const ImgurImageSummaryProjection = PropTypes.shape(
	forbidExtraProps({
		imgurId: PropTypes.string.isRequired,
		imgurType: PropTypes.string.isRequired,
	}),
);

export default ImgurImageSummaryProjection;
