import {marked, Renderer, Tokens} from 'marked';
import useBlueprint from '../../hooks/useBlueprint';

const renderer = new Renderer();
renderer.table = (token: Tokens.Table): string => {
	const headerCells = token.header.map((cell) => `<th>${cell.text}</th>`).join('');
	const bodyCells = token.rows
		.map((row) => `<tr>${row.map((cell) => `<td>${cell.text}</td>`).join('')}</tr>`)
		.join('');
	return `<table class="table table-striped table-bordered">
<thead><tr>${headerCells}</tr></thead>
<tbody>${bodyCells}</tbody>
</table>`;
};
renderer.image = (token: Tokens.Image): string =>
	`<img src="${token.href}" alt="${token.text}" class="img-responsive">`;

marked.setOptions({
	renderer,
	gfm: true,
	breaks: false,
	pedantic: false,
});

interface BlueprintMarkdownProps {
	blueprintKey: string;
}

function BlueprintMarkdown({blueprintKey}: BlueprintMarkdownProps) {
	const result = useBlueprint(blueprintKey);
	const {descriptionMarkdown} = result.data!.data;
	const renderedMarkdown = marked(descriptionMarkdown);

	// biome-ignore lint/security/noDangerouslySetInnerHtml: Markdown rendering requires innerHTML
	return <div dangerouslySetInnerHTML={{__html: renderedMarkdown as string}} />;
}

export default BlueprintMarkdown;
