import {marked, type Tokens} from 'marked';
import React, {useMemo} from 'react';
import RichText from './RichText';

const renderer = new marked.Renderer();
renderer.table = (token: Tokens.Table) => {
	const header = token.header.map((cell) => `<th>${cell.text}</th>`).join('');
	const body = token.rows.map((row) => `<tr>${row.map((cell) => `<td>${cell.text}</td>`).join('')}</tr>`).join('');
	return `<table class="table table-striped table-bordered">
<thead><tr>${header}</tr></thead>
<tbody>${body}</tbody>
</table>`;
};
renderer.image = (token: Tokens.Image) => `<img src="${token.href}" alt="${token.text}" class="img-responsive">`;

marked.setOptions({
	renderer,
	gfm: true,
	breaks: false,
	pedantic: false,
});

function processTextContent(content: string): React.ReactNode[] {
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
}

function processHtmlWithRichText(html: string): React.ReactNode {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');
	const container = doc.body;

	function processNode(node: ChildNode, nodeIndex = 0): React.ReactNode {
		if (node.nodeType === Node.TEXT_NODE) {
			const text = node.textContent || '';
			return processTextContent(text);
		}

		if (node.nodeType === Node.ELEMENT_NODE) {
			const element = node as Element;
			const tagName = element.tagName.toLowerCase();

			const children = Array.from(node.childNodes).map((child, index) => (
				<React.Fragment key={`${nodeIndex}-${index}`}>{processNode(child, index)}</React.Fragment>
			));

			const props: Record<string, string | React.CSSProperties> = {};

			if (element.hasAttribute('href')) props.href = element.getAttribute('href')!;
			if (element.hasAttribute('title')) props.title = element.getAttribute('title')!;
			if (element.hasAttribute('class')) props.className = element.getAttribute('class')!;
			if (element.hasAttribute('src')) props.src = element.getAttribute('src')!;
			if (element.hasAttribute('alt')) props.alt = element.getAttribute('alt')!;
			if (element.hasAttribute('style')) {
				const style = element.getAttribute('style');
				if (style) {
					const styleObj: Record<string, string> = {};
					style.split(';').forEach((rule) => {
						const [property, value] = rule.split(':').map((s) => s.trim());
						if (property && value) {
							const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
							styleObj[camelProperty] = value;
						}
					});
					props.style = styleObj;
				}
			}

			switch (tagName) {
				case 'p':
					return (
						<p
							key={nodeIndex}
							{...props}
						>
							{children}
						</p>
					);
				case 'h1':
					return (
						<h1
							key={nodeIndex}
							{...props}
						>
							{children}
						</h1>
					);
				case 'h2':
					return (
						<h2
							key={nodeIndex}
							{...props}
						>
							{children}
						</h2>
					);
				case 'h3':
					return (
						<h3
							key={nodeIndex}
							{...props}
						>
							{children}
						</h3>
					);
				case 'h4':
					return (
						<h4
							key={nodeIndex}
							{...props}
						>
							{children}
						</h4>
					);
				case 'h5':
					return (
						<h5
							key={nodeIndex}
							{...props}
						>
							{children}
						</h5>
					);
				case 'h6':
					return (
						<h6
							key={nodeIndex}
							{...props}
						>
							{children}
						</h6>
					);
				case 'strong':
				case 'b':
					return (
						<strong
							key={nodeIndex}
							{...props}
						>
							{children}
						</strong>
					);
				case 'em':
				case 'i':
					return (
						<em
							key={nodeIndex}
							{...props}
						>
							{children}
						</em>
					);
				case 'code':
					return (
						<code
							key={nodeIndex}
							{...props}
						>
							{children}
						</code>
					);
				case 'pre':
					return (
						<pre
							key={nodeIndex}
							{...props}
						>
							{children}
						</pre>
					);
				case 'blockquote':
					return (
						<blockquote
							key={nodeIndex}
							{...props}
						>
							{children}
						</blockquote>
					);
				case 'ul':
					return (
						<ul
							key={nodeIndex}
							{...props}
						>
							{children}
						</ul>
					);
				case 'ol':
					return (
						<ol
							key={nodeIndex}
							{...props}
						>
							{children}
						</ol>
					);
				case 'li':
					return (
						<li
							key={nodeIndex}
							{...props}
						>
							{children}
						</li>
					);
				case 'a':
					return (
						<a
							key={nodeIndex}
							{...props}
						>
							{children}
						</a>
					);
				case 'br':
					return (
						<br
							key={nodeIndex}
							{...props}
						/>
					);
				case 'hr':
					return (
						<hr
							key={nodeIndex}
							{...props}
						/>
					);
				case 'table':
					return (
						<table
							key={nodeIndex}
							{...props}
						>
							{children}
						</table>
					);
				case 'thead':
					return (
						<thead
							key={nodeIndex}
							{...props}
						>
							{children}
						</thead>
					);
				case 'tbody':
					return (
						<tbody
							key={nodeIndex}
							{...props}
						>
							{children}
						</tbody>
					);
				case 'tr':
					return (
						<tr
							key={nodeIndex}
							{...props}
						>
							{children}
						</tr>
					);
				case 'th':
					return (
						<th
							key={nodeIndex}
							{...props}
						>
							{children}
						</th>
					);
				case 'td':
					return (
						<td
							key={nodeIndex}
							{...props}
						>
							{children}
						</td>
					);
				case 'span':
					return (
						<span
							key={nodeIndex}
							{...props}
						>
							{children}
						</span>
					);
				case 'div':
					return (
						<div
							key={nodeIndex}
							{...props}
						>
							{children}
						</div>
					);
				case 'img':
					return (
						<img
							key={nodeIndex}
							alt=""
							{...props}
						/>
					);
				default:
					return <React.Fragment key={nodeIndex}>{children}</React.Fragment>;
			}
		}

		return null;
	}

	return (
		<>
			{Array.from(container.childNodes).map((node, index) => (
				<React.Fragment key={`root-${index}`}>{processNode(node, index)}</React.Fragment>
			))}
		</>
	);
}

interface MarkdownWithRichTextProps {
	markdown?: string;
	className?: string;
}

function MarkdownWithRichText({markdown, className}: MarkdownWithRichTextProps) {
	const content = useMemo(() => {
		if (!markdown) return null;

		const html = marked(markdown) as string;
		return processHtmlWithRichText(html);
	}, [markdown]);

	if (!content) return null;

	return <div className={className}>{content}</div>;
}

export default MarkdownWithRichText;
