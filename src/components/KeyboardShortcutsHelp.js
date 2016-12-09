import React, {PropTypes} from 'react';
import Button from 'react-bootstrap/lib/Button';
import Modal from 'react-bootstrap/lib/Modal';
import {HotKeys} from 'react-hotkeys';
import Grid from 'react-bootstrap/lib/Grid';
import Row from 'react-bootstrap/lib/Row';
import Col from 'react-bootstrap/lib/Col';
import Label from 'react-bootstrap/lib/Label';
import autofocus from './focus/focus';

const KeyboardKey     = ({text}) => <Label className='keyboard-key'>{text}</Label>;
KeyboardKey.propTypes = {
	text: PropTypes.string.isRequired,
};

const KeyboardShortcutsHelp = ({showKeyboardShortcuts, onHideKeyboardShortcuts, onToggleKeyboardShortcuts}) =>
	<Modal show={showKeyboardShortcuts} onHide={onHideKeyboardShortcuts} bsSize='large'>
		<HotKeys onrs={{toggleKeyboardShortcuts: onToggleKeyboardShortcuts}} ref={autofocus}>
			<Modal.Header closeButton>
				<Modal.Title>Keyboard Shortcuts</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<Grid>
					<Row>
						<Col md={3}><h2 className='text-right'><KeyboardKey text={'?'} /></h2></Col> <Col md={9}><h2>
						Help</h2></Col>
					</Row>
					<Row>
						<Col xs={3}><h2 className='text-right'><KeyboardKey text={'Ctrl'} /> <KeyboardKey
							text={'Shift'} /> <KeyboardKey text={'V'} /></h2></Col> <Col xs={9}><h2>View All
						Blueprints</h2></Col>
						<Col xs={3}><h2 className='text-right'><KeyboardKey text={'Ctrl'} /> <KeyboardKey
							text={'Shift'} /> <KeyboardKey text={'C'} /></h2></Col> <Col xs={9}><h2>Create
						Blueprint</h2></Col>
						<Col xs={3}><h2 className='text-right'><KeyboardKey text={'Ctrl'} /> <KeyboardKey
							text={'Enter'} /></h2></Col> <Col xs={9}><h2>Save Blueprint</h2></Col>
						<Col xs={3}><h2 className='text-right'><KeyboardKey text={'/'} /></h2></Col> <Col xs={9}><h2>
						Search</h2></Col>
					</Row>
				</Grid>
			</Modal.Body>
			<Modal.Footer>
				<Button onClick={onHideKeyboardShortcuts}>Close</Button>
			</Modal.Footer>
		</HotKeys>
	</Modal>;

KeyboardShortcutsHelp.propTypes = {
	showKeyboardShortcuts    : PropTypes.bool.isRequired,
	onHideKeyboardShortcuts  : PropTypes.func.isRequired,
	onToggleKeyboardShortcuts: PropTypes.func.isRequired,
};

export default KeyboardShortcutsHelp;
