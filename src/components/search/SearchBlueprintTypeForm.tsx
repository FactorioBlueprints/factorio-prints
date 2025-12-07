import Form from 'react-bootstrap/Form';

interface SearchBlueprintTypeFormProps {
	blueprintTypeState: string;
	setBlueprintTypeState: (value: string) => void;
}

function SearchBlueprintTypeForm({blueprintTypeState, setBlueprintTypeState}: SearchBlueprintTypeFormProps) {
	const handleBlueprintType = (e: React.ChangeEvent<HTMLSelectElement>) => {
		e.preventDefault();
		setBlueprintTypeState(e.target.value);
	};

	return (
		<Form.Group className="mb-3">
			<Form.Label>Blueprint type</Form.Label>
			<Form.Select
				size="sm"
				aria-label="Select blueprint type"
				onChange={handleBlueprintType}
				value={blueprintTypeState}
			>
				<option value={''}>Any blueprint Type</option>
				<option value={'blueprint'}>Blueprint</option>
				<option value={'blueprint-book'}>Blueprint Book</option>
				<option value={'upgrade-planner'}>Upgrade Planner</option>
				<option value={'deconstruction-planner'}>Deconstruction Planner</option>
			</Form.Select>
		</Form.Group>
	);
}

export default SearchBlueprintTypeForm;
