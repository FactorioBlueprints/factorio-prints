import React from 'react';

import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import type {IconProp} from '@fortawesome/fontawesome-svg-core';

interface TitleProps {
	icon: IconProp;
	text: string;
	className?: string;
}

const Title: React.FC<TitleProps> = props => (
	<div>
		<FontAwesomeIcon icon={props.icon} size='lg' fixedWidth className={props.className} />
		{` ${props.text}`}
	</div>
);

export default Title;
