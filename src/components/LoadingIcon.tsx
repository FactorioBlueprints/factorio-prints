import {faCog} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

interface LoadingIconProps {
	isPending: boolean;
}

function LoadingIcon({isPending}: LoadingIconProps) {
	return isPending ? (
		<FontAwesomeIcon
			icon={faCog}
			size="lg"
			fixedWidth
			spin
		/>
	) : null;
}

export default LoadingIcon;
