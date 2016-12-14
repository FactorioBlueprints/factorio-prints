import React, {PropTypes, Component} from 'react';
import Header from './Header';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import {HotKeys} from 'react-hotkeys';
import autofocus from './focus/focus';

const keyMap = {
	toggleKeyboardShortcuts: '?',
	createBlueprint        : ['ctrl+shift+c', 'command+shift+c'],
	viewAllBlueprints      : ['ctrl+shift+v', 'command+shift+v'],
	search                 : '/',
	saveBlueprint          : ['ctrl+enter', 'command+enter'],
};

class App extends Component {
	static propTypes = {
		children                 : PropTypes.node.isRequired,
		user                     : PropTypes.shape({
			userId     : PropTypes.string.isRequired,
			displayName: PropTypes.string.isRequired,
			photoURL   : PropTypes.string.isRequired,
		}),
		onHideKeyboardShortcuts  : PropTypes.func.isRequired,
		onToggleKeyboardShortcuts: PropTypes.func.isRequired,
		showKeyboardShortcuts    : PropTypes.bool.isRequired,
	};

	static contextTypes = {router: PropTypes.object.isRequired};

	render()
	{
		const handlers = {
			toggleKeyboardShortcuts: this.props.onToggleKeyboardShortcuts,
			createBlueprint        : () => this.context.router.transitionTo('/create'),
			viewAllBlueprints      : () => this.context.router.transitionTo('/blueprints'),
		};

		return <div>
			<HotKeys
				keyMap={keyMap}
				handlers={handlers}
				ref={autofocus}>
				<Header user={this.props.user} />
				<div className='container-fluid'>
					<div className='row application-context-container'>
						{this.props.children}
					</div>
				</div>
				<KeyboardShortcutsHelp
					showKeyboardShortcuts={this.props.showKeyboardShortcuts}
					onHideKeyboardShortcuts={this.props.onHideKeyboardShortcuts}
					onToggleKeyboardShortcuts={this.props.onToggleKeyboardShortcuts}
				/>
			</HotKeys>
		</div>;
	}
}

export default App;
