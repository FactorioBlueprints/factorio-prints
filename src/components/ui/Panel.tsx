import React from 'react';

export interface PanelProps {
	children: React.ReactNode;
	title?: string;
}

export const Panel = ({children, title}: PanelProps) => (
	<div className="panel">
		{title && <h2>{title}</h2>}
		{children}
	</div>
);
