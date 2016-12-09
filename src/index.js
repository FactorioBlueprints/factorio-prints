import React from 'react';
import {render} from 'react-dom';
import Root from './components/Root';

import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/css/bootstrap-theme.css';

import './css/style.css';

render(<Root />, document.querySelector('#root'));
