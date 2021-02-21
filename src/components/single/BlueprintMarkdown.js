import {faCog}           from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import axios             from 'axios';
import marked            from 'marked';
import PropTypes         from 'prop-types';
import React             from 'react';
import {useQuery}        from 'react-query';

BlueprintMarkdown.propTypes = {
	blueprintKey: PropTypes.string.isRequired,
};

function BlueprintMarkdown(props)
{
	const {blueprintKey} = props;

	const queryKey = ['blueprintDetails', blueprintKey];

	const result = useQuery(
		queryKey,
		() => axios.get(`${process.env.REACT_APP_REST_URL}/api/blueprintDetails/${blueprintKey}`),
	);

	const {isSuccess, isLoading, isError, data} = result;
	if (isLoading)
	{
		return (<>
			<FontAwesomeIcon icon={faCog} size='lg' fixedWidth spin />
			{' Loading...'}
		</>);
	}

	if (isError)
	{
		console.log({result});
		return (
			<>
				{'Error loading blueprint details.'}
			</>
		);
	}

	const {descriptionMarkdown} = data.data;
	const renderedMarkdown      = marked(descriptionMarkdown);

	return <div dangerouslySetInnerHTML={{__html: renderedMarkdown}} />;
}

export default BlueprintMarkdown;
