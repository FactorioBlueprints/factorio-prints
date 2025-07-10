import React, {useEffect} from 'react';

declare global {
	interface Window {
		adsbygoogle: unknown[];
	}
}

const GoogleAd: React.FC = () => {
	useEffect(() => {
		(window.adsbygoogle = window.adsbygoogle || []).push({});
	}, []);

	return (
		<div className="googleAd">
			<ins
				className="adsbygoogle"
				style={{display: 'block'}}
				data-ad-client="ca-pub-3146575260211386"
				data-ad-format="auto"
			/>
		</div>
	);
};

export default GoogleAd;
