import {faCog} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';

LoadingIcon.propTypes = {
	isPending: PropTypes.bool.isRequired,
};

function LoadingIcon(props) {
	return props.isPending ? (
		<FontAwesomeIcon
			icon={faCog}
			size="lg"
			fixedWidth
			spin
		/>
	) : null;
}

export default LoadingIcon;
