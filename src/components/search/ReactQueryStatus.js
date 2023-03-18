import {faBan, faCog, faWifi, faPause} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}               from '@fortawesome/react-fontawesome';
import React                           from 'react';

const ReactQueryStatus = (props) =>
{
	const {fetchStatus, status} = props;

	if (status === 'loading' && fetchStatus === 'idle')
	{
		return <>
			<FontAwesomeIcon icon={faPause} size='lg' fixedWidth style={{'color': 'var(--bs-orange)'}} />
			{' Waiting for query'}
		</>;
	}

	if (status === 'success' && fetchStatus === 'idle')
	{
		return <></>;
	}

	if (status === 'error' && fetchStatus === 'idle')
	{
		return <>
			<span className='fa-stack' style={{ 'fontSize': '0.7em'}}>
				<FontAwesomeIcon icon={faWifi} className='fa-stack-1x' />
				<FontAwesomeIcon icon={faBan} className='fa-stack-2x' style={{'color': 'var(--bs-orange)'}} />
			</span>
			{' error'}
		</>;
	}

	if (fetchStatus === 'fetching')
	{
		return <>
			<FontAwesomeIcon icon={faCog} size='lg' fixedWidth spin style={{'color': 'var(--bs-orange)'}} />
			{' fetching'}
		</>;
	}

	console.log({props});

	return <>
		<FontAwesomeIcon icon={faCog} size='lg' fixedWidth spin style={{'color': 'var(--bs-orange)'}} />
		{status}
		{' '}
		{fetchStatus}
	</>;
};

ReactQueryStatus.propTypes    = {};
ReactQueryStatus.defaultProps = {};

export default ReactQueryStatus;
