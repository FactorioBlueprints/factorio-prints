import {Link, useRouterState} from "@tanstack/react-router";
import {getAuth} from "firebase/auth";
import type React from "react";
import Alert from "react-bootstrap/Alert";
import {useAuthState} from "react-firebase-hooks/auth";

import {app} from "../base";
import {useUserNeedsDisplayName} from "../hooks/useUser";

const DisplayNamePrompt: React.FC = () =>
{
	const [user] = useAuthState(getAuth(app));
	const pathname = useRouterState(
		{
			select: (state) => state.location.pathname,
		},
	);
	const {data: needsDisplayName} = useUserNeedsDisplayName(user?.uid);

	if (!needsDisplayName || pathname === "/account")
	{
		return null;
	}

	return (
		<Alert variant="info" className="mb-0 rounded-0">
			{"Welcome! "}
			<Link to="/account">{"Choose a display name"}</Link>
			{" to show on your blueprints."}
		</Alert>
	);
};

export default DisplayNamePrompt;
