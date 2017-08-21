import React from 'react';

export default class GoogleAd extends React.Component {
	componentDidMount () {
		(window.adsbygoogle = window.adsbygoogle || []).push({});
	}

	render () {
		return (
			<div className='googleAd'>
				<ins
					className='adsbygoogle'
					style={{ display: 'block' }}
					data-ad-client='ca-pub-3146575260211386'
					// data-ad-slot='xxxxxxxxxx'
					data-ad-format='auto'
				/>
			</div>
		);
	}
}

