import React, {PropTypes, Component} from 'react';
import Header from './Header';

class App extends Component
{
	static propTypes = {
		children: PropTypes.node.isRequired,
		user    : PropTypes.shape({
			userId     : PropTypes.string.isRequired,
			displayName: PropTypes.string,
			photoURL   : PropTypes.string,
		}),
	};

	static contextTypes = {router: PropTypes.object.isRequired};

	render()
	{
		return <div>
			<Header user={this.props.user} />
			<div className='container-fluid'>
				<div className='row application-context-container'>
					{this.props.children}
				</div>
			</div>
		</div>;
	}
}

export default App;
