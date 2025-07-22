import {Link} from '@tanstack/react-router';

interface BlueprintNotFoundProps {
	error?: Error | null;
	isDeleted?: boolean;
}

export function BlueprintNotFound({error, isDeleted}: BlueprintNotFoundProps) {
	return (
		<>
			<title>Factorio Prints: Blueprint Not Found</title>
			<div className="p-5 rounded-lg jumbotron">
				<h1 className="display-4">Blueprint Not Found</h1>
				<p>The blueprint you're looking for could not be found.</p>
				{error && (
					<div className="alert alert-danger">
						<strong>Error:</strong> {error.message || 'An unknown error occurred'}
					</div>
				)}
				{isDeleted && (
					<div className="alert alert-info">This blueprint has been deleted or is no longer available.</div>
				)}
				<Link
					to="/"
					className="btn btn-primary"
				>
					Return to Home
				</Link>
			</div>
		</>
	);
}
