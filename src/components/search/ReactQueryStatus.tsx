import {faBan, faCog, faPause, faWifi} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}               from '@fortawesome/react-fontawesome';

import type {FetchStatus} from '@tanstack/react-query';

interface ReactQueryStatusProps {
	fetchStatus: FetchStatus;
	status: 'pending' | 'error' | 'success';
}

function ReactQueryStatus({fetchStatus, status}: ReactQueryStatusProps)
{
	if (status === 'pending' && fetchStatus === 'idle')
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

	return <>
		<FontAwesomeIcon icon={faCog} size='lg' fixedWidth spin style={{'color': 'var(--bs-orange)'}} />
		{status}
		{' '}
		{fetchStatus}
	</>;
}

export default ReactQueryStatus;
