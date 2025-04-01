import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faRedo } from '@fortawesome/free-solid-svg-icons';

class ErrorBoundary extends React.Component
{
	constructor(props)
	{
		super(props);
		this.state = { hasError: false, error: null, errorInfo: null };
	}

	static getDerivedStateFromError(error)
	{
		return { hasError: true, error };
	}

	componentDidCatch(error, errorInfo)
	{
		this.setState({ error, errorInfo });
		console.error('ErrorBoundary caught an error:', error, errorInfo);
	}

	render()
	{
		if (this.state.hasError)
		{
			return (
				<div className='p-5 rounded-lg jumbotron'>
					<h2 className='display-4 text-warning'>
						<FontAwesomeIcon icon={faExclamationTriangle} /> Something went wrong
					</h2>
					<details className='mt-3 lead'>
						<summary className='btn btn-secondary'>View error details</summary>
						<p className='mt-3 text-danger'>{this.state.error?.toString()}</p>
						<pre className='mt-3 p-3 bg-dark text-light rounded' style={{ whiteSpace: 'pre-wrap' }}>
							<code>
								{this.state.errorInfo?.componentStack}
							</code>
						</pre>
					</details>
					<button
						className='btn btn-warning mt-3'
						onClick={() => window.location.reload()}
					>
						<FontAwesomeIcon icon={faRedo} /> Reload Page
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}

ErrorBoundary.propTypes = {
	children: PropTypes.node.isRequired,
};

export default ErrorBoundary;
