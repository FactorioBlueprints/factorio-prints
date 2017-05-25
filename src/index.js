import React from 'react';
import ReactDOM from 'react-dom';
import Root from './components/Root';
import registerServiceWorker from './registerServiceWorker';

import './css/theme.css';
import './css/style.css';

ReactDOM.render(<Root />, document.getElementById('root'));
registerServiceWorker();
