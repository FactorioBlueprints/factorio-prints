import type {IconDefinition} from '@fortawesome/fontawesome-svg-core';

import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

interface TitleProps {
	icon: IconDefinition;
	text: string;
	className?: string;
}

function Title({icon, text, className}: TitleProps) {
	return (
		<div>
			<FontAwesomeIcon
				icon={icon}
				size="lg"
				fixedWidth
				className={className}
			/>
			{` ${text}`}
		</div>
	);
}

export default Title;
