import {useState, useCallback} from 'react';

export const useCopyToClipboard = (): [boolean, (text: string) => void] => {
	const [copiedText, setCopiedText] = useState(false);

	const copyToClipboard = useCallback((text: string) => {
		if (!text) return;

		navigator.clipboard
			.writeText(text)
			.then(() => {
				setCopiedText(true);
				setTimeout(() => setCopiedText(false), 2000);
			})
			.catch((err) => {
				console.error('Failed to copy: ', err);
			});
	}, []);

	return [copiedText, copyToClipboard];
};

export default useCopyToClipboard;
