import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import React, {useMemo} from 'react';
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
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');
	const container = doc.body;

	const processNode = (node: Node, nodeIndex: number = 0): React.ReactNode => {
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
					return <p {...props}>{children}</p>;
				case 'h1':
					return <h1 {...props}>{children}</h1>;
				case 'h2':
					return <h2 {...props}>{children}</h2>;
				case 'h3':
					return <h3 {...props}>{children}</h3>;
				case 'h4':
					return <h4 {...props}>{children}</h4>;
				case 'h5':
					return <h5 {...props}>{children}</h5>;
				case 'h6':
					return <h6 {...props}>{children}</h6>;
				case 'strong':
				case 'b':
					return <strong {...props}>{children}</strong>;
				case 'em':
				case 'i':
					return <em {...props}>{children}</em>;
				case 'code':
					return <code {...props}>{children}</code>;
				case 'pre':
					return <pre {...props}>{children}</pre>;
				case 'blockquote':
					return <blockquote {...props}>{children}</blockquote>;
				case 'ul':
					return <ul {...props}>{children}</ul>;
				case 'ol':
					return <ol {...props}>{children}</ol>;
				case 'li':
					return <li {...props}>{children}</li>;
				case 'a':
					return <a {...props}>{children}</a>;
				case 'br':
					return <br {...props} />;
				case 'hr':
					return <hr {...props} />;
				case 'table':
					return <table {...props}>{children}</table>;
				case 'thead':
					return <thead {...props}>{children}</thead>;
				case 'tbody':
					return <tbody {...props}>{children}</tbody>;
				case 'tr':
					return <tr {...props}>{children}</tr>;
				case 'th':
					return <th {...props}>{children}</th>;
				case 'td':
					return <td {...props}>{children}</td>;
				case 'span':
					return <span {...props}>{children}</span>;
				case 'div':
					return <div {...props}>{children}</div>;
				default:
					return <>{children}</>;
			}
		}

		return null;
	};

	return (
		<>
			{Array.from(container.childNodes).map((node, index) => (
				<React.Fragment key={`root-${index}`}>{processNode(node, index)}</React.Fragment>
			))}
		</>
	);
};

export const MarkdownWithRichText: React.FC<MarkdownWithRichTextProps> = ({markdown, className}) => {
	const content = useMemo(() => {
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

		return processHtmlWithRichText(sanitizedHtml);
	}, [markdown]);

	if (!content) return null;

	return <div className={className}>{content}</div>;
};
