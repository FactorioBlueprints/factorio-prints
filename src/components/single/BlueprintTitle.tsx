import {faLink} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {Helmet} from 'react-helmet';
import useBlueprint from '../../hooks/useBlueprint';
import RichText from '../core/RichText';

interface BlueprintTitleProps {
	blueprintKey: string;
}

function BlueprintTitle({blueprintKey}: BlueprintTitleProps) {
	const result = useBlueprint(blueprintKey);
	const title = result.data?.data?.title;

	if (!title) {
		return null;
	}

	return (
		<a
			className="mr-1"
			href={`https://factorioprints.com/view/${blueprintKey}`}
		>
			<Helmet>
				<title>{`Factorio Prints: ${title}`}</title>
			</Helmet>
			<h1>
				<FontAwesomeIcon
					icon={faLink}
					className="text-warning"
				/>{' '}
				<RichText
					text={title}
					className=""
					inline
					iconSize="large"
				/>
			</h1>
		</a>
	);
}

export default BlueprintTitle;
