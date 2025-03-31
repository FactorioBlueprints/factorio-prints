import React, { useEffect } from 'react';

const GoogleAd = () =>
{
	useEffect(() =>
	{
		(window.adsbygoogle = window.adsbygoogle || []).push({});
	}, []);

	return (
		<div className='googleAd'>
			<ins
				className='adsbygoogle'
				style={{display: 'block'}}
				data-ad-client='ca-pub-3146575260211386'
				// Data-ad-slot='xxxxxxxxxx'
				data-ad-format='auto'
			/>
		</div>
	);
};

export default GoogleAd;
