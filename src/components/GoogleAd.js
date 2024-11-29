import React from 'react';

function GoogleAd()
{
	return (
		<div className='googleAd'>
			<script
				async
				src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3146575260211386'
				crossOrigin='anonymous'
			></script>
			<ins
				className='adsbygoogle'
				style={{display: 'block'}}
				data-ad-client='ca-pub-3146575260211386'
				data-ad-slot='4481854887'
				data-ad-format='auto'
				data-full-width-responsive='true'
			></ins>
			<script>
				(adsbygoogle = window.adsbygoogle || []).push({});
			</script>
		</div>
	);
}

export default GoogleAd;
