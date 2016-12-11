import React from 'react';
import {render} from 'react-dom';
import Root from './components/Root';

import './bootstrap-custom/css/bootstrap.min.css';

import './css/style.css';

render(<Root />, document.querySelector('#root'));
