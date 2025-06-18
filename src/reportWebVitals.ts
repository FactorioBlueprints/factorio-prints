import {type Metric, onCLS, onFCP, onLCP, onTTFB} from 'web-vitals';

const reportWebVitals = (onPerfEntry?: (metric: Metric) => void) => {
	if (onPerfEntry && onPerfEntry instanceof Function) {
		onCLS(onPerfEntry);
		onFCP(onPerfEntry);
		onLCP(onPerfEntry);
		onTTFB(onPerfEntry);
	}
};

export default reportWebVitals;
