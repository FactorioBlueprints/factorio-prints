import type React from 'react';
import {useEffect} from 'react';
import DOMIsolation from './DOMIsolation';

declare global {
	interface Window {
		adsbygoogle: unknown[];
	}
}

/**
 * 🛡️ GoogleAd component with DOM isolation.
 *
 * Google Ads scripts manipulate the DOM outside of React's control.
 * The DOMIsolation wrapper prevents React from throwing errors when
 * trying to reconcile these externally-modified DOM nodes.
 */
const GoogleAd: React.FC = () => {
	useEffect(() => {
		(window.adsbygoogle = window.adsbygoogle || []).push({});
	}, []);

	return (
		<DOMIsolation className="googleAd">
			<ins
				className="adsbygoogle"
				style={{display: 'block'}}
				data-ad-client="ca-pub-3146575260211386"
				data-ad-format="auto"
			/>
		</DOMIsolation>
	);
};

export default GoogleAd;
