import {FactorioIcon, type IconSize} from './icons/FactorioIcon';

const RICH_TEXT_PATTERN = /\[([^\]]+)\]([^[]*)\[\/\1\]|\[([^\]]+)\]/g;

type Segment =
	| {type: 'text'; content: string}
	| {type: 'color'; content: string; color: string}
	| {type: 'font'; content: string; font: string}
	| {type: 'tooltip'; content: string}
	| {type: 'icon'; content: string};

function parseRichText(text: string): Segment[] {
	const segments: Segment[] = [];
	let lastIndex = 0;

	const matches = Array.from(text.matchAll(RICH_TEXT_PATTERN));

	for (const match of matches) {
		const index = match.index;

		if (index !== undefined && index > lastIndex) {
			segments.push({
				type: 'text',
				content: text.substring(lastIndex, index),
			});
		}

		if (match[1]) {
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
				segments.push({
					type: 'text',
					content: match[0],
				});
			}
		} else if (match[3]) {
			const tag = match[3];

			if (tag.includes('=')) {
				if (tag.startsWith('tooltip=')) {
					segments.push({
						type: 'tooltip',
						content: tag,
					});
				} else {
					segments.push({
						type: 'icon',
						content: tag,
					});
				}
			} else {
				segments.push({
					type: 'text',
					content: match[0],
				});
			}
		}

		if (index !== undefined) {
			lastIndex = index + match[0].length;
		}
	}

	if (lastIndex < text.length) {
		segments.push({
			type: 'text',
			content: text.substring(lastIndex),
		});
	}

	return segments;
}

function renderSegment(segment: Segment, index: number, iconSize: IconSize): React.ReactNode {
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
		const tooltipContent = content.substring(8);
		const lastCommaIndex = tooltipContent.lastIndexOf(',');

		if (lastCommaIndex > 0) {
			const tooltipText = tooltipContent.substring(0, lastCommaIndex);

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

		const [type, nameAndQuality] = content.split('=');
		const [name, quality] = nameAndQuality ? nameAndQuality.split(',') : ['', undefined];

		return (
			<FactorioIcon
				key={index}
				icon={{
					type: type,
					name: name,
					quality: quality,
				}}
				size={iconSize}
				inline
			/>
		);
	}

	const _exhaustiveCheck: never = segment;
	return _exhaustiveCheck;
}

interface RichTextProps {
	text?: string;
	className?: string;
	inline?: boolean;
	iconSize?: IconSize;
}

function RichText({text, className, inline = false, iconSize = 'tiny'}: RichTextProps) {
	if (!text) return null;

	const segments = parseRichText(text);
	const content = segments.map((segment, index) => renderSegment(segment, index, iconSize));

	if (inline) {
		return <span className={className}>{content}</span>;
	}

	return <div className={className}>{content}</div>;
}

export default RichText;
