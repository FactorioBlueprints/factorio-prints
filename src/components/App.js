import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import {forbidExtraProps} from 'airbnb-prop-types';
class App extends PureComponent
{
	static propTypes = forbidExtraProps({
		children: PropTypes.node.isRequired,
	});

	render()
	{
		return <div>
			<div className='container-fluid'>
				<div className='row application-context-container'>
					{this.props.children}
				</div>
			</div>
		</div>;
	}
}

export default App;
