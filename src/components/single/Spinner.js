import LoadingIcon from '../LoadingIcon';

export default function Spinner()
{
	return <div className='p-5 rounded-lg jumbotron'>
		<h1>
			<LoadingIcon isLoading />
			{' Loading...'}
		</h1>
	</div>;
}
