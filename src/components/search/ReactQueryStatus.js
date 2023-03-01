import {faCog,faChevronDown,faBan, faWifi}           from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React             from 'react';

const ReactQueryStatus = ({isLoading, error, data, isFetching, isSuccess}) =>
{
	if (isLoading || isFetching)
	{
		return <FontAwesomeIcon icon={faCog} size='lg' fixedWidth spin style={{'color': 'var(--bs-orange)'}} />;
	}
	else if (error)
	{
		return <span className='fa-stack' style={{'vertical-align': 'top'}}>
			<FontAwesomeIcon icon={faWifi} className='fa-stack-1x' />
			<FontAwesomeIcon icon={faBan} className='fa-stack-2x' style={{'color': 'var(--bs-orange)'}} />
		</span>;
	}
	return <></>;
};

ReactQueryStatus.propTypes    = {};
ReactQueryStatus.defaultProps = {};

export default ReactQueryStatus;
