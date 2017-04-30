import React, {
	Component,
	PropTypes,
} from 'react';
import FontAwesome from 'react-fontawesome';

class Title extends Component
{
	static propTypes = {
		icon     : PropTypes.string.isRequired,
		text     : PropTypes.string.isRequired,
		className: PropTypes.string,
	};

	render()
	{
		return (
			<div>
				<FontAwesome name={this.props.icon} size='lg' fixedWidth className={this.props.className} />
				{` ${this.props.text}`}
			</div>
		);
	}
}

export default Title;
