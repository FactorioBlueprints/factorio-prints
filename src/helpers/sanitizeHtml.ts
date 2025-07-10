import DOMPurify from 'dompurify';

export function sanitizeHtml(html: string): string {
	return DOMPurify.sanitize(html);
}
