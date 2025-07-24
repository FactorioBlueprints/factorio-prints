import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import React from 'react';
import {RichText} from './RichText';

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

const processTextContent = (content: string): React.ReactNode => {
	const lines = content.split('\n');

	return lines.map((line, lineIndex) => {
		if (line.trim() === '') {
			return lineIndex < lines.length - 1 ? '\n' : null;
		}

		return (
			<React.Fragment key={lineIndex}>
				<RichText
					text={line}
					inline
				/>
				{lineIndex < lines.length - 1 && '\n'}
			</React.Fragment>
		);
	});
};

const processHtmlWithRichText = (html: string): React.ReactNode => {
	const container = document.createElement('div');
	container.innerHTML = html;

	const processNode = (node: Node): React.ReactNode => {
		if (node.nodeType === Node.TEXT_NODE) {
			const text = node.textContent || '';
			return processTextContent(text);
		}

		if (node.nodeType === Node.ELEMENT_NODE) {
			const element = node as Element;
			const tagName = element.tagName.toLowerCase();

			const children = Array.from(node.childNodes).map((child, index) => (
				<React.Fragment key={index}>{processNode(child)}</React.Fragment>
			));

			const key = Math.random();
			const props: any = {};

			if (element.hasAttribute('href')) props.href = element.getAttribute('href');
			if (element.hasAttribute('title')) props.title = element.getAttribute('title');
			if (element.hasAttribute('class')) props.className = element.getAttribute('class');
			if (element.hasAttribute('style')) {
				const style = element.getAttribute('style');
				if (style) {
					props.style = {};
					style.split(';').forEach((rule) => {
						const [property, value] = rule.split(':').map((s) => s.trim());
						if (property && value) {
							const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
							props.style[camelProperty] = value;
						}
					});
				}
			}

			switch (tagName) {
				case 'p':
					return (
						<p
							key={key}
							{...props}
						>
							{children}
						</p>
					);
				case 'h1':
					return (
						<h1
							key={key}
							{...props}
						>
							{children}
						</h1>
					);
				case 'h2':
					return (
						<h2
							key={key}
							{...props}
						>
							{children}
						</h2>
					);
				case 'h3':
					return (
						<h3
							key={key}
							{...props}
						>
							{children}
						</h3>
					);
				case 'h4':
					return (
						<h4
							key={key}
							{...props}
						>
							{children}
						</h4>
					);
				case 'h5':
					return (
						<h5
							key={key}
							{...props}
						>
							{children}
						</h5>
					);
				case 'h6':
					return (
						<h6
							key={key}
							{...props}
						>
							{children}
						</h6>
					);
				case 'strong':
				case 'b':
					return (
						<strong
							key={key}
							{...props}
						>
							{children}
						</strong>
					);
				case 'em':
				case 'i':
					return (
						<em
							key={key}
							{...props}
						>
							{children}
						</em>
					);
				case 'code':
					return (
						<code
							key={key}
							{...props}
						>
							{children}
						</code>
					);
				case 'pre':
					return (
						<pre
							key={key}
							{...props}
						>
							{children}
						</pre>
					);
				case 'blockquote':
					return (
						<blockquote
							key={key}
							{...props}
						>
							{children}
						</blockquote>
					);
				case 'ul':
					return (
						<ul
							key={key}
							{...props}
						>
							{children}
						</ul>
					);
				case 'ol':
					return (
						<ol
							key={key}
							{...props}
						>
							{children}
						</ol>
					);
				case 'li':
					return (
						<li
							key={key}
							{...props}
						>
							{children}
						</li>
					);
				case 'a':
					return (
						<a
							key={key}
							{...props}
						>
							{children}
						</a>
					);
				case 'br':
					return (
						<br
							key={key}
							{...props}
						/>
					);
				case 'hr':
					return (
						<hr
							key={key}
							{...props}
						/>
					);
				case 'table':
					return (
						<table
							key={key}
							{...props}
						>
							{children}
						</table>
					);
				case 'thead':
					return (
						<thead
							key={key}
							{...props}
						>
							{children}
						</thead>
					);
				case 'tbody':
					return (
						<tbody
							key={key}
							{...props}
						>
							{children}
						</tbody>
					);
				case 'tr':
					return (
						<tr
							key={key}
							{...props}
						>
							{children}
						</tr>
					);
				case 'th':
					return (
						<th
							key={key}
							{...props}
						>
							{children}
						</th>
					);
				case 'td':
					return (
						<td
							key={key}
							{...props}
						>
							{children}
						</td>
					);
				case 'span':
					return (
						<span
							key={key}
							{...props}
						>
							{children}
						</span>
					);
				case 'div':
					return (
						<div
							key={key}
							{...props}
						>
							{children}
						</div>
					);
				default:
					return <React.Fragment key={key}>{children}</React.Fragment>;
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
};

export const MarkdownWithRichText: React.FC<MarkdownWithRichTextProps> = ({markdown, className}) => {
	if (!markdown) return null;

	const html = md.render(markdown);

	const sanitizedHtml = DOMPurify.sanitize(html, {
		ALLOWED_TAGS: [
			'p',
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6',
			'strong',
			'b',
			'em',
			'i',
			'code',
			'pre',
			'blockquote',
			'ul',
			'ol',
			'li',
			'a',
			'br',
			'hr',
			'table',
			'thead',
			'tbody',
			'tr',
			'th',
			'td',
			'span',
			'div',
		],
		ALLOWED_ATTR: ['href', 'title', 'style', 'class'],
	});

	const content = processHtmlWithRichText(sanitizedHtml);

	return <div className={className}>{content}</div>;
};
