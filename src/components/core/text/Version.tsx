import {parseVersion3} from '../../../parsing/blueprintParser';

export const Version = ({number}: {number: number}) => {
	const text = parseVersion3(number);
	return <span className="p2 text-right">{text}</span>;
};
