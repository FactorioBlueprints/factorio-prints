import {useStore} from '@tanstack/react-store';
import type React from 'react';
import Form from 'react-bootstrap/Form';

import type {ModFilter} from '../../api/rest/types';
import {advancedSearchStore, setMod} from '../../store/advancedSearchStore';

const modOptions: Array<{value: ModFilter | ''; label: string}> = [
	{value: '', label: 'Any Mod'},
	{value: 'base', label: 'Base Game Only'},
	{value: 'base&creative', label: 'Base + Creative'},
	{value: 'aai', label: 'AAI (Advanced Autonomous Industries)'},
	{value: 'ltn', label: 'LTN (Logistic Train Network)'},
	{value: 'krastorio', label: 'Krastorio'},
	{value: 'space-exploration', label: 'Space Exploration'},
	{value: 'bobs', label: "Bob's Mods"},
	{value: 'creative-mod', label: 'Creative Mod'},
	{value: 'lighted-electric-poles', label: 'Lighted Electric Poles +'},
	{value: 'unknown', label: 'Unknown Mod'},
];

const ModFilterSelect: React.FC = () => {
	const mod = useStore(advancedSearchStore, (state) => state.mod);

	const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
		const value = event.target.value;
		setMod(value === '' ? null : (value as ModFilter));
	};

	return (
		<Form.Group className="mb-3">
			<Form.Label>Mod Filter</Form.Label>
			<Form.Select
				value={mod ?? ''}
				onChange={handleChange}
			>
				{modOptions.map((option) => (
					<option
						key={option.value}
						value={option.value}
					>
						{option.label}
					</option>
				))}
			</Form.Select>
		</Form.Group>
	);
};

export default ModFilterSelect;
