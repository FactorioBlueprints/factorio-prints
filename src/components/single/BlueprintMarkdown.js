import {forbidExtraProps} from 'airbnb-prop-types';
import marked             from 'marked';
import PropTypes          from 'prop-types';
import React              from 'react';
import useBlueprint       from '../../hooks/useBlueprint';
import LoadingIcon        from '../LoadingIcon';

const renderer = new marked.Renderer();
renderer.table = (header, body) => `<table class="table table-striped table-bordered">
<thead>
${header}</thead>
<tbody>
${body}</tbody>
</table>
`;
renderer.image = (href, title, text) =>
	`<img src="${href}" alt="${text}" class="img-responsive">`;

marked.setOptions({
	renderer,
	gfm        : true,
	tables     : true,
	breaks     : false,
	pedantic   : false,
	sanitize   : false,
	smartLists : true,
	smartypants: false,
});

BlueprintMarkdown.propTypes = forbidExtraProps({
	blueprintKey: PropTypes.string.isRequired,
});

function BlueprintMarkdown(props)
{
	const {blueprintKey} = props;
	const result = useBlueprint(blueprintKey);

	const {isLoading, isError, data} = result;
	if (isLoading)
	{
		return (
			<>
				<LoadingIcon isLoading={isLoading} />
				{' Loading...'}
			</>
		);
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
