import ReactDOM from 'react-dom';

const autofocus = (element) =>
{
	const found = ReactDOM.findDOMNode(element);
	if (found)
	{
		found.focus();
	}
};

export default autofocus;
