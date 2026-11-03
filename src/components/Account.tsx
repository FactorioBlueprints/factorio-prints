import {faBan, faSave} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useNavigate} from "@tanstack/react-router";
import {getAuth, updateProfile} from "firebase/auth";
import {ref, update} from "firebase/database";
import type React from "react";
import {useState} from "react";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import FormControl from "react-bootstrap/FormControl";
import Row from "react-bootstrap/Row";
import {useAuthState} from "react-firebase-hooks/auth";

import {app} from "../base";
import
{
	useUserDisplayName,
	userDisplayNameQueryKey,
	userNeedsDisplayNameQueryKey,
	useUserNeedsDisplayName,
} from "../hooks/useUser";
import {DEFAULT_DISPLAY_NAME} from "../utils/defaultDisplayName";
import {getFirebaseDatabase} from "../utils/firebaseDatabase";
import PageHeader from "./PageHeader";

const Account = () =>
{
	const [user] = useAuthState(getAuth(app));
	const navigate = useNavigate();
	const {data: storedDisplayName} = useUserDisplayName(user?.uid);
	const {data: needsDisplayName} = useUserNeedsDisplayName(user?.uid);
	const [editedDisplayName, setEditedDisplayName] = useState<string>();
	// Pre-fill from the public database name, never the sign-in provider's real name
	const hasDefaultDisplayName = needsDisplayName && storedDisplayName === DEFAULT_DISPLAY_NAME;
	const displayName = editedDisplayName ?? (hasDefaultDisplayName ? "" : (storedDisplayName ?? ""));
	const queryClient = useQueryClient();

	const updateDisplayNameMutation = useMutation(
		{
			mutationFn: async (newDisplayName: string) =>
			{
				await updateProfile(
					user!,
					{
						displayName: newDisplayName,
					},
				);

				const userRef = ref(getFirebaseDatabase(), `/users/${user!.uid}`);
				await update(
					userRef,
					{
						displayName: newDisplayName,
						needsDisplayName: null,
					},
				);

				return newDisplayName;
			},
			onSuccess: (newDisplayName) =>
			{
				queryClient.setQueryData(userDisplayNameQueryKey(user!.uid), newDisplayName);
				queryClient.setQueryData(userNeedsDisplayNameQueryKey(user!.uid), false);
				navigate(
					{
						to: "/user/$userId",
						params:
						{
							userId: user!.uid,
						},
					},
				);
			},
		},
	);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) =>
	{
		event.preventDefault();
		setEditedDisplayName(event.target.value);
	};

	const handleSaveAccount = (event: React.MouseEvent<HTMLButtonElement>) =>
	{
		event.preventDefault();
		updateDisplayNameMutation.mutate(displayName);
	};

	const handleCancel = (event: React.MouseEvent<HTMLButtonElement>) =>
	{
		event.preventDefault();
		navigate(
			{
				to: "/user/$userId",
				params:
				{
					userId: user!.uid,
				},
			},
		);
	};

	if (!user)
	{
		return (
			<div className="p-5 rounded-lg jumbotron">
				<h1 className="display-4">{"Account Settings"}</h1>
				<p className="lead">
					{"Please log in with Google, GitHub, or email in order to edit your account settings."}
				</p>
			</div>
		);
	}

	return (
		<Container>
			<PageHeader title="Edit account settings" />
			<Row>
				<Form className="w-100">
					<Form.Group as={Row} className="mb-3">
						<Form.Label column sm="2">
							{"Display Name"}
						</Form.Label>
						<Col sm={10}>
							<FormControl
								autoFocus
								type="text"
								name="displayName"
								placeholder="DisplayName"
								value={displayName}
								onChange={handleChange}
							/>
						</Col>
					</Form.Group>

					<Form.Group as={Row} className="mb-3">
						<Col
							sm={
							{
								span: 10,
								offset: 2,
							}}
						>
							<Button
								type="button"
								variant="warning"
								size="lg"
								onClick={handleSaveAccount}
								disabled={updateDisplayNameMutation.isPending}
							>
								<FontAwesomeIcon icon={faSave} size="lg" />
								{updateDisplayNameMutation.isPending ? " Saving..." : " Save"}
							</Button>
							<Button
								type="button"
								size="lg"
								onClick={handleCancel}
								disabled={updateDisplayNameMutation.isPending}
							>
								<FontAwesomeIcon icon={faBan} size="lg" />
								{" Cancel"}
							</Button>
						</Col>
					</Form.Group>
				</Form>
			</Row>
		</Container>
	);
};

export default Account;
