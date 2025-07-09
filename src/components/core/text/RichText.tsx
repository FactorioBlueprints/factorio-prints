import React from 'react';
import {FactorioIcon} from '../icons/FactorioIcon';

interface RichTextProps {
	text: string;
	className?: string;
	inline?: boolean;
}

interface ParsedSegment {
	type: 'text' | 'icon' | 'color' | 'font' | 'tooltip';
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
				if (tag.startsWith('tooltip=')) {
					segments.push({
						type: 'tooltip',
						content: tag,
					});
				} else {
					// Regular icon like [item=iron-plate]
					segments.push({
						type: 'icon',
						content: tag,
					});
				}
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

function renderSegment(segment: ParsedSegment, index: number): React.ReactNode {
	if (segment.type === 'text') {
		return segment.content;
	}

	if (segment.type === 'color') {
		return (
			<span
				key={index}
				style={{color: segment.color}}
			>
				{segment.content}
			</span>
		);
	}

	if (segment.type === 'font') {
		const fontClass = segment.font === 'default-game' ? 'factorio-default-font' : '';
		return fontClass ? (
			<span
				key={index}
				className={fontClass}
			>
				{segment.content}
			</span>
		) : (
			segment.content
		);
	}

	if (segment.type === 'tooltip') {
		const content = segment.content;
		const tooltipContent = content.substring(8); // Remove 'tooltip='
		const lastCommaIndex = tooltipContent.lastIndexOf(',');

		if (lastCommaIndex > 0) {
			const tooltipText = tooltipContent.substring(0, lastCommaIndex);

			// Show a generic tooltip icon (question mark style)
			return (
				<span
					key={index}
					title={tooltipText}
					style={{
						textDecoration: 'underline',
						cursor: 'help',
						display: 'inline-block',
						width: '16px',
						height: '16px',
						backgroundColor: '#ff6600',
						color: 'white',
						textAlign: 'center',
						borderRadius: '50%',
						fontSize: '12px',
						lineHeight: '16px',
						fontWeight: 'bold',
					}}
				>
					?
				</span>
			);
		}
		return segment.content;
	}

	if (segment.type === 'icon') {
		const content = segment.content;

		// Handle standard icon syntax: [type=name] or [type=name,quality]
		const [type, nameAndQuality] = content.split('=');
		const [name, quality] = nameAndQuality ? nameAndQuality.split(',') : ['', undefined];
		return (
			<FactorioIcon
				key={index}
				icon={{
					type: type as any,
					name: name,
					quality: quality ? (quality as any) : undefined,
				}}
				size="tiny"
				inline
			/>
		);
	}

	return segment.content;
}

export const RichText: React.FC<RichTextProps> = ({text, className, inline = false}) => {
	if (!text) return null;

	const segments = parseRichText(text);
	const content = segments.map((segment, index) => renderSegment(segment, index));

	if (inline) {
		return <span className={className}>{content}</span>;
	}

	return <div className={className}>{content}</div>;
};
