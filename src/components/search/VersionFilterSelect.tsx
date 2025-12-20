import {useStore} from '@tanstack/react-store';
import type React from 'react';
import {useMemo} from 'react';
import Form from 'react-bootstrap/Form';
import Select, {type SingleValue} from 'react-select';

import gameVersions from '../../data/gameVersions.json';
import {advancedSearchStore, setGameVersion} from '../../store/advancedSearchStore';

interface VersionOption {
	value: number;
	label: string;
}

interface GameVersion {
	versionNumber: number;
	version1: number;
	version2: number;
	version3: number;
}

const VersionFilterSelect: React.FC = () => {
	const gameVersionLong = useStore(advancedSearchStore, (state) => state.gameVersionLong);

	const options = useMemo(() => {
		return (gameVersions as GameVersion[])
			.map((version) => ({
				value: version.versionNumber,
				label: `${version.version1}.${version.version2}.${version.version3}`,
			}))
			.reverse();
	}, []);

	const selectedOption = useMemo(() => {
		if (!gameVersionLong) {
			return null;
		}
		return options.find((option) => option.value === gameVersionLong) ?? null;
	}, [gameVersionLong, options]);

	const handleChange = (selected: SingleValue<VersionOption>): void => {
		setGameVersion(selected?.value ?? null);
	};

	return (
		<Form.Group className="mb-3">
			<Form.Label>Versions</Form.Label>
			<Select<VersionOption>
				value={selectedOption}
				options={options}
				onChange={handleChange}
				isClearable={true}
				isSearchable={true}
				placeholder="Any version"
			/>
		</Form.Group>
	);
};

export default VersionFilterSelect;
