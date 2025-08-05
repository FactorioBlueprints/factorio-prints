import {useCallback, useState} from 'react';

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
			.catch(() => {});
	}, []);

	return [copiedText, copyToClipboard];
};

export default useCopyToClipboard;
