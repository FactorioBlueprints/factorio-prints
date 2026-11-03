import {faBan, faSave, faTrash} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useNavigate} from "@tanstack/react-router";
import {getAuth, updateProfile} from "firebase/auth";
import {ref, update} from "firebase/database";
import type React from "react";
import {useState} from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import FormControl from "react-bootstrap/FormControl";
import Modal from "react-bootstrap/Modal";
import Row from "react-bootstrap/Row";
import {useAuthState} from "react-firebase-hooks/auth";

import {isRequiresRecentLoginError} from "../api/accountDeletion";
import {app} from "../base";
import {type BlueprintDeletionChoice, useDeleteAccount} from "../hooks/useDeleteAccount";
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

	const {deleteAccount, reauthenticateAndDelete} = useDeleteAccount();
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [blueprintChoice, setBlueprintChoice] = useState<BlueprintDeletionChoice>();
	const needsReauthentication = isRequiresRecentLoginError(deleteAccount.error);
	const deletionPending = deleteAccount.isPending || reauthenticateAndDelete.isPending;
	const deletionError = needsReauthentication
		? reauthenticateAndDelete.error
		: (deleteAccount.error ?? reauthenticateAndDelete.error);

	const handleHideDeleteModal = () =>
	{
		if (deletionPending)
		{
			return;
		}
		setShowDeleteModal(false);
		setBlueprintChoice(undefined);
		deleteAccount.reset();
		reauthenticateAndDelete.reset();
	};

	const handleDeleteAccount = () =>
	{
		if (blueprintChoice)
		{
			deleteAccount.mutate(
				{
					user: user!,
					blueprints: blueprintChoice,
				},
			);
		}
	};

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

			<Row className="mt-5">
				<Col>
					<h2 className="h4">{"Delete account"}</h2>
					<p>{"Permanently delete your account. This cannot be undone."}</p>
					<Button type="button" variant="danger" onClick={() => setShowDeleteModal(true)}>
						<FontAwesomeIcon icon={faTrash} />
						{" Delete account..."}
					</Button>
				</Col>
			</Row>

			<Modal show={showDeleteModal} onHide={handleHideDeleteModal}>
				<Modal.Header closeButton>
					<Modal.Title>{"Delete your account?"}</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<p>{"What should happen to the blueprints you've posted?"}</p>
					<Form.Check
						type="radio"
						id="delete-account-keep-blueprints"
						name="blueprintChoice"
						label={'Keep my blueprints, without my name (shown as "Deleted user")'}
						checked={blueprintChoice === "keep"}
						onChange={() => setBlueprintChoice("keep")}
						disabled={deletionPending || needsReauthentication}
					/>
					<Form.Check
						type="radio"
						id="delete-account-delete-blueprints"
						name="blueprintChoice"
						label={"Delete my blueprints"}
						checked={blueprintChoice === "delete"}
						onChange={() => setBlueprintChoice("delete")}
						disabled={deletionPending || needsReauthentication}
					/>
					{needsReauthentication && (
						<Alert variant="warning" className="mt-3 mb-0">
							{"For your security, please sign in again to confirm deleting your account."}
						</Alert>
					)}
					{deletionError && (
						<Alert variant="danger" className="mt-3 mb-0">
							{deletionError.message}
						</Alert>
					)}
				</Modal.Body>
				<Modal.Footer>
					{needsReauthentication ? (
						<Button
							variant="danger"
							onClick={() => reauthenticateAndDelete.mutate(user)}
							disabled={deletionPending}
						>
							{reauthenticateAndDelete.isPending ? "Deleting..." : "Sign in again and delete"}
						</Button>
					) : (
						<Button
							variant="danger"
							onClick={handleDeleteAccount}
							disabled={!blueprintChoice || deletionPending}
						>
							{deleteAccount.isPending ? "Deleting..." : "Delete my account"}
						</Button>
					)}
					<Button onClick={handleHideDeleteModal} disabled={deletionPending}>
						{"Cancel"}
					</Button>
				</Modal.Footer>
			</Modal>
		</Container>
	);
};

export default Account;
