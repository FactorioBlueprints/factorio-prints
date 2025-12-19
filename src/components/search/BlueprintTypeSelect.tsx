import {useStore} from '@tanstack/react-store';
import type React from 'react';
import Form from 'react-bootstrap/Form';

import type {BlueprintType} from '../../api/rest/types';
import {advancedSearchStore, setBlueprintType} from '../../store/advancedSearchStore';

const blueprintTypeOptions: Array<{value: BlueprintType | ''; label: string}> = [
	{value: '', label: 'Any Type'},
	{value: 'blueprint', label: 'Blueprint'},
	{value: 'blueprint-book', label: 'Blueprint Book'},
	{value: 'upgrade-planner', label: 'Upgrade Planner'},
	{value: 'deconstruction-planner', label: 'Deconstruction Planner'},
];

const BlueprintTypeSelect: React.FC = () => {
	const blueprintType = useStore(advancedSearchStore, (state) => state.blueprintType);

	const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
		const value = event.target.value;
		setBlueprintType(value === '' ? null : (value as BlueprintType));
	};

	return (
		<Form.Group className="mb-3">
			<Form.Label>Blueprint Type</Form.Label>
			<Form.Select
				value={blueprintType ?? ''}
				onChange={handleChange}
			>
				{blueprintTypeOptions.map((option) => (
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

export default BlueprintTypeSelect;
