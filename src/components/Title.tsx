import type {IconProp} from '@fortawesome/fontawesome-svg-core';

import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import type React from 'react';

interface TitleProps {
	icon: IconProp;
	text: string;
	className?: string;
}

const Title: React.FC<TitleProps> = (props) => (
	<div>
		<FontAwesomeIcon
			icon={props.icon}
			size="lg"
			fixedWidth
			className={props.className}
		/>
		{` ${props.text}`}
	</div>
);

export default Title;
