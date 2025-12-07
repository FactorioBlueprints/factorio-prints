import isEmpty from 'lodash/isEmpty';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import {FactorioIcon} from '../core/icons/FactorioIcon';

interface Item {
	name: string;
	count: number;
	mod: string;
}

interface ItemHistogramRowProps {
	name: string;
	count: number;
	mod: string;
	type: string;
}

function ItemHistogramRow({name, count, mod, type}: ItemHistogramRowProps) {
	return (
		<tr>
			<td className={`icon icon-${name}`}>
				<FactorioIcon
					icon={{name, type}}
					size="small"
					inline
				/>
			</td>
			<td>{count}</td>
			<td>{name}</td>
			<td>{mod}</td>
		</tr>
	);
}

interface NewItemHistogramProps {
	title: string;
	items?: Item[];
	type: string;
}

function NewItemHistogram({title, items, type}: NewItemHistogramProps) {
	if (isEmpty(items)) {
		return null;
	}

	return (
		<Card>
			<Card.Header>{title}</Card.Header>
			<Table
				bordered
				hover
			>
				<colgroup>
					<col
						span={1}
						style={{width: '1%'}}
					/>
					<col
						span={1}
						style={{width: '1%'}}
					/>
					<col span={1} />
					<col
						span={1}
						style={{width: '1%'}}
					/>
				</colgroup>

				<tbody>
					{items!.map((item) => (
						<ItemHistogramRow
							{...item}
							key={item.name}
							type={type}
						/>
					))}
				</tbody>
			</Table>
		</Card>
	);
}

export default NewItemHistogram;
