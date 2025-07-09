import React from 'react';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import {FactorioIcon} from '../icons/FactorioIcon';

const md = new MarkdownIt({
	html: true,
	linkify: true,
	typographer: true,
	breaks: false,
});

interface MarkdownWithRichTextProps {
	markdown: string;
	className?: string;
}

interface ParsedSegment {
	type: 'text' | 'icon' | 'color' | 'font';
	content: string;
	color?: string;
	font?: string;
}

const RICH_TEXT_PATTERN = /\[([^\]]+)\]([^[]*)\[\/\1\]|\[([^\]]+)\]/g;

function parseRichText(text: string): ParsedSegment[] {
	const segments: ParsedSegment[] = [];
	let lastIndex = 0;

	const matches = Array.from(text.matchAll(RICH_TEXT_PATTERN));

	for (const match of matches) {
		const index = match.index!;

		// Add plain text before the match
		if (index > lastIndex) {
			segments.push({
				type: 'text',
				content: text.substring(lastIndex, index),
			});
		}

		if (match[1]) {
			// Matched a tag with content [tag]content[/tag]
			const tag = match[1];
			const content = match[2];

			if (tag.startsWith('color=')) {
				segments.push({
					type: 'color',
					content,
					color: tag.substring(6),
				});
			} else if (tag === 'font' || tag.startsWith('font=')) {
				segments.push({
					type: 'font',
					content,
					font: tag === 'font' ? 'default-game' : tag.substring(5),
				});
			} else {
				// Unknown tag, treat as text
				segments.push({
					type: 'text',
					content: match[0],
				});
			}
		} else if (match[3]) {
			// Matched a self-closing tag [tag]
			const tag = match[3];

			if (tag.includes('=')) {
				// Could be an icon like [item=iron-plate]
				segments.push({
					type: 'icon',
					content: tag,
				});
			} else {
				// Unknown tag, treat as text
				segments.push({
					type: 'text',
					content: match[0],
				});
			}
		}

		lastIndex = index + match[0].length;
	}

	// Add any remaining text
	if (lastIndex < text.length) {
		segments.push({
			type: 'text',
			content: text.substring(lastIndex),
		});
	}

	return segments;
}

function processHtmlWithRichText(html: string): React.ReactNode {
	// Create a temporary container to parse the HTML
	const container = document.createElement('div');
	container.innerHTML = html;

	// Process all nodes
	const processNode = (node: Node): React.ReactNode => {
		if (node.nodeType === Node.TEXT_NODE) {
			// Text nodes should already be processed, just return the content
			return node.textContent || '';
		}

		if (node.nodeType === Node.ELEMENT_NODE) {
			const element = node as Element;
			const tagName = element.tagName.toLowerCase();

			// Handle factorio-icon placeholders
			if (tagName === 'factorio-icon') {
				const type = element.getAttribute('data-type') || 'item';
				const name = element.getAttribute('data-name') || '';
				const quality = element.getAttribute('data-quality');

				return (
					<FactorioIcon
						key={Math.random()}
						icon={{
							type: type as any,
							name: name,
							quality: quality ? (quality as any) : undefined,
						}}
						size="small"
						inline
					/>
				);
			}

			const children = Array.from(node.childNodes).map((child, index) => (
				<React.Fragment key={index}>{processNode(child)}</React.Fragment>
			));

			// Handle spans with style or class
			if (tagName === 'span') {
				const style = element.getAttribute('style');
				const className = element.getAttribute('class');
				const styleObj: React.CSSProperties = {};

				if (style) {
					// Parse style string
					style.split(';').forEach((rule) => {
						const [property, value] = rule.split(':').map((s) => s.trim());
						if (property && value) {
							// Convert to camelCase
							const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
							(styleObj as any)[camelProperty] = value;
						}
					});
				}

				return (
					<span
						key={Math.random()}
						style={styleObj}
						className={className || undefined}
					>
						{children}
					</span>
				);
			}

			// Preserve common HTML elements
			switch (tagName) {
				case 'p':
					return <p key={Math.random()}>{children}</p>;
				case 'h1':
					return <h1 key={Math.random()}>{children}</h1>;
				case 'h2':
					return <h2 key={Math.random()}>{children}</h2>;
				case 'h3':
					return <h3 key={Math.random()}>{children}</h3>;
				case 'h4':
					return <h4 key={Math.random()}>{children}</h4>;
				case 'h5':
					return <h5 key={Math.random()}>{children}</h5>;
				case 'h6':
					return <h6 key={Math.random()}>{children}</h6>;
				case 'strong':
				case 'b':
					return <strong key={Math.random()}>{children}</strong>;
				case 'em':
				case 'i':
					return <em key={Math.random()}>{children}</em>;
				case 'code':
					return <code key={Math.random()}>{children}</code>;
				case 'pre':
					return <pre key={Math.random()}>{children}</pre>;
				case 'blockquote':
					return <blockquote key={Math.random()}>{children}</blockquote>;
				case 'ul':
					return <ul key={Math.random()}>{children}</ul>;
				case 'ol':
					return <ol key={Math.random()}>{children}</ol>;
				case 'li':
					return <li key={Math.random()}>{children}</li>;
				case 'a': {
					const href = element.getAttribute('href');
					return (
						<a
							key={Math.random()}
							href={href || '#'}
						>
							{children}
						</a>
					);
				}
				case 'br':
					return <br key={Math.random()} />;
				case 'hr':
					return <hr key={Math.random()} />;
				case 'table': {
					const tableClass = element.getAttribute('class');
					return (
						<table
							key={Math.random()}
							className={tableClass || undefined}
						>
							{children}
						</table>
					);
				}
				case 'thead':
					return <thead key={Math.random()}>{children}</thead>;
				case 'tbody':
					return <tbody key={Math.random()}>{children}</tbody>;
				case 'tr':
					return <tr key={Math.random()}>{children}</tr>;
				case 'th':
					return <th key={Math.random()}>{children}</th>;
				case 'td':
					return <td key={Math.random()}>{children}</td>;
				default:
					return <div key={Math.random()}>{children}</div>;
			}
		}

		return null;
	};

	return (
		<>
			{Array.from(container.childNodes).map((node, index) => (
				<React.Fragment key={index}>{processNode(node)}</React.Fragment>
			))}
		</>
	);
}

/**
 * Convert rich text segments to HTML strings that markdown can process
 */
function richTextToHtml(text: string): string {
	const segments = parseRichText(text);

	return segments
		.map((segment) => {
			if (segment.type === 'text') {
				return segment.content;
			}

			if (segment.type === 'color') {
				return `<span style="color: ${segment.color}">${segment.content}</span>`;
			}

			if (segment.type === 'font') {
				const fontClass = segment.font === 'default-game' ? 'factorio-default-font' : '';
				return fontClass ? `<span class="${fontClass}">${segment.content}</span>` : segment.content;
			}

			if (segment.type === 'icon') {
				const [type, name, quality] = segment.content.split('=');
				// For icons, we'll use a placeholder that we can replace later
				return `<factorio-icon data-type="${type}" data-name="${name}" data-quality="${quality || ''}"></factorio-icon>`;
			}

			return segment.content;
		})
		.join('');
}

/**
 * Process markdown text line by line, converting rich text to HTML first
 */
function preprocessMarkdownWithRichText(markdown: string): string {
	const lines = markdown.split('\n');

	return lines
		.map((line) => {
			// Skip processing for code blocks and special markdown syntax
			const isCodeBlock = line.trim().startsWith('```');
			const isIndentedCode = line.startsWith('    ') || line.startsWith('\t');

			// For code blocks, return as-is
			if (isCodeBlock || isIndentedCode) {
				return line;
			}

			// Check if we're inside inline code
			const inlineCodeRegex = /`([^`]+)`/g;
			const parts: string[] = [];
			let lastIndex = 0;
			let match;

			while ((match = inlineCodeRegex.exec(line)) !== null) {
				// Process rich text in the part before the code
				if (match.index > lastIndex) {
					parts.push(richTextToHtml(line.substring(lastIndex, match.index)));
				}
				// Keep inline code as-is
				parts.push(match[0]);
				lastIndex = match.index + match[0].length;
			}

			// Process any remaining text after the last code block
			if (lastIndex < line.length) {
				parts.push(richTextToHtml(line.substring(lastIndex)));
			}

			return parts.length > 0 ? parts.join('') : richTextToHtml(line);
		})
		.join('\n');
}

export const MarkdownWithRichText: React.FC<MarkdownWithRichTextProps> = ({markdown, className}) => {
	if (!markdown) return null;

	// First process rich text, converting it to HTML
	const preprocessed = preprocessMarkdownWithRichText(markdown);

	// Then render the preprocessed text as markdown
	const html = md.render(preprocessed);
	const sanitizedHtml = DOMPurify.sanitize(html, {
		ADD_TAGS: ['factorio-icon'],
		ADD_ATTR: ['data-type', 'data-name', 'data-quality'],
	});

	// Process the HTML to replace icon placeholders with React components
	const content = processHtmlWithRichText(sanitizedHtml);

	return <div className={className}>{content}</div>;
};
