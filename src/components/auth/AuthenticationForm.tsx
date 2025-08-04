import {faGithub, faGoogle} from '@fortawesome/free-brands-svg-icons';
import {faEnvelope} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import type React from 'react';
import {useState} from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import {useAuthProviders} from '../../hooks/useAuthProviders';

interface AuthenticationFormProps {
	onAuthSuccess?: () => void;
	buttonClassName?: string;
	showDivider?: boolean;
}

export const AuthenticationForm: React.FC<AuthenticationFormProps> = ({
	onAuthSuccess,
	buttonClassName = '',
	showDivider = true,
}) => {
	const [email, setEmail] = useState('');
	const {googleProvider, githubProvider, authenticateWithProvider, authenticateWithEmail, isEmailSending} =
		useAuthProviders(onAuthSuccess);

	const handleEmailSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		authenticateWithEmail(email).then(() => {
			setEmail('');
		});
	};

	return (
		<div className="d-flex flex-column">
			<Button
				type="button"
				className={`google w-100 mb-2 ${buttonClassName}`}
				onClick={() => authenticateWithProvider(googleProvider)}
			>
				<FontAwesomeIcon
					icon={faGoogle}
					size="lg"
					fixedWidth
				/>
				{' Log in with Google'}
			</Button>
			<Button
				type="button"
				className={`github w-100 ${showDivider ? 'mb-3' : 'mb-2'} ${buttonClassName}`}
				onClick={() => authenticateWithProvider(githubProvider)}
			>
				<FontAwesomeIcon
					icon={faGithub}
					size="lg"
					fixedWidth
				/>
				{' Log in with GitHub'}
			</Button>
			{showDivider && <hr className="w-100 my-3" />}
			<Form onSubmit={handleEmailSubmit}>
				<Form.Group className="mb-2">
					<Form.Control
						type="email"
						placeholder="Enter your email address"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						disabled={isEmailSending}
						required
					/>
				</Form.Group>
				<Button
					type="submit"
					className="w-100"
					variant="primary"
					disabled={isEmailSending || !email.trim()}
				>
					<FontAwesomeIcon
						icon={faEnvelope}
						size="lg"
						fixedWidth
					/>
					{isEmailSending ? ' Sending...' : ' Send Sign-in Link'}
				</Button>
			</Form>
		</div>
	);
};
