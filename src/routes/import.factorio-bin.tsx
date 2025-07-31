import {createFileRoute} from '@tanstack/react-router';

import ImportFromFactorioBin from '../components/ImportFromFactorioBin';

export const Route = createFileRoute('/import/factorio-bin')({
	component: ImportFromFactorioBin,
});
