import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';

export default function ScrollToTop() {
	const {pathname} = useLocation();

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run effect when pathname changes
	useEffect(() => {
		window.scrollTo(0, 0);
	}, [pathname]);

	return null;
}
