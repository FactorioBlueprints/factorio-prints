import type {CSSObjectWithLabel} from 'react-select';

interface DarkThemeStylesType {
	control: (base: CSSObjectWithLabel) => CSSObjectWithLabel;
	menu: (base: CSSObjectWithLabel) => CSSObjectWithLabel;
	menuList: (base: CSSObjectWithLabel) => CSSObjectWithLabel;
	option: (base: CSSObjectWithLabel, state: {isFocused: boolean}) => CSSObjectWithLabel;
	singleValue: (base: CSSObjectWithLabel) => CSSObjectWithLabel;
	input: (base: CSSObjectWithLabel) => CSSObjectWithLabel;
	placeholder: (base: CSSObjectWithLabel) => CSSObjectWithLabel;
	indicatorSeparator: (base: CSSObjectWithLabel) => CSSObjectWithLabel;
	dropdownIndicator: (base: CSSObjectWithLabel) => CSSObjectWithLabel;
	clearIndicator: (base: CSSObjectWithLabel) => CSSObjectWithLabel;
}

export const darkThemeStyles: DarkThemeStylesType = {
	control: (base) => ({
		...base,
		backgroundColor: '#272b30',
		borderColor: '#1c1e22',
		minHeight: '31px',
		'&:hover': {
			borderColor: '#3a3f44',
		},
	}),
	menu: (base) => ({
		...base,
		backgroundColor: '#272b30',
		borderColor: '#1c1e22',
	}),
	menuList: (base) => ({
		...base,
		backgroundColor: '#272b30',
	}),
	option: (base, state) => ({
		...base,
		backgroundColor: state.isFocused ? '#3a3f44' : '#272b30',
		color: '#fff',
		'&:active': {
			backgroundColor: '#4a4f54',
		},
	}),
	singleValue: (base) => ({
		...base,
		color: '#fff',
	}),
	input: (base) => ({
		...base,
		color: '#fff',
	}),
	placeholder: (base) => ({
		...base,
		color: '#999',
	}),
	indicatorSeparator: (base) => ({
		...base,
		backgroundColor: '#3a3f44',
	}),
	dropdownIndicator: (base) => ({
		...base,
		color: '#999',
		'&:hover': {
			color: '#fff',
		},
	}),
	clearIndicator: (base) => ({
		...base,
		color: '#999',
		'&:hover': {
			color: '#fff',
		},
	}),
};
