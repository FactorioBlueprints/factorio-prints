import DOMPurify from 'dompurify';

export function sanitizeHtml(html)
{
	// Use DOMPurify's default sanitization which blocks dangerous elements
	// while preserving most formatting and styling
	return DOMPurify.sanitize(html);
}
