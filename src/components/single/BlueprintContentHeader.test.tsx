import {render, screen} from '@testing-library/react';
import BlueprintContentHeader from './BlueprintContentHeader';

const sha = '1b472ffa07106d9380321fb46b1dbd5b465d483b';

describe('BlueprintContentHeader', () => {
	it('links a single blueprint to the editor at the blueprint root', () => {
		render(
			<BlueprintContentHeader
				data={{blueprint: {item: 'blueprint', labelHtml: 'Solar array'}}}
				blueprintKey="-KYeNAYQVgk2DcbuORde"
				blueprintStringSha={sha}
			/>,
		);

		const link = screen.getByRole('button');
		expect(link).toHaveAttribute(
			'href',
			`https://fbe.factorygamefan.com/?source=https://www.factorio.school/api/blueprintData/${sha}/`,
		);
	});

	it('links each blueprint in a book to its position in the book', () => {
		render(
			<BlueprintContentHeader
				data={{
					blueprint_book: {
						item: 'blueprint-book',
						labelHtml: 'Gleba book',
						blueprints: [
							{blueprint: {item: 'blueprint', labelHtml: 'First'}},
							{blueprint: {item: 'blueprint', labelHtml: 'Second'}},
						],
					},
				}}
				blueprintKey="-OJczvHV56up6wV6mI3k"
				blueprintStringSha={sha}
			/>,
		);

		const links = screen.getAllByRole('button');
		expect(links.map((link) => link.getAttribute('href'))).toEqual([
			`https://fbe.factorygamefan.com/?source=https://www.factorio.school/api/blueprintData/${sha}/position/0`,
			`https://fbe.factorygamefan.com/?source=https://www.factorio.school/api/blueprintData/${sha}/position/1`,
		]);
	});
});
