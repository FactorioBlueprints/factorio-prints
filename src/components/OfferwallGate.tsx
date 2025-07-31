import {useLocation} from '@tanstack/react-router';
import type React from 'react';
import {useEffect, useState} from 'react';
import {offerwallConfig} from '../base';

interface OfferwallGateProps {
	children: React.ReactNode;
}

const OfferwallGate: React.FC<OfferwallGateProps> = ({children}) => {
	const location = useLocation();
	const [hasAccess, setHasAccess] = useState(true);
	const [showOfferwall, setShowOfferwall] = useState(false);

	useEffect(() => {
		// Check if current route is protected
		const isProtectedRoute = offerwallConfig.protectedRoutes.some((route) => location.pathname.startsWith(route));

		if (!isProtectedRoute || !offerwallConfig.enabled) {
			setHasAccess(true);
			return;
		}

		// Check existing access
		const checkAccess = () => {
			const accessTimestamp = localStorage.getItem('offerwall_access_timestamp');
			if (accessTimestamp) {
				const accessTime = parseInt(accessTimestamp, 10);
				const currentTime = Date.now();
				const accessDurationMs = offerwallConfig.accessDurationHours * 60 * 60 * 1000;

				if (currentTime - accessTime < accessDurationMs) {
					return true;
				}
			}
			return false;
		};

		const hasExistingAccess = checkAccess();
		setHasAccess(hasExistingAccess);

		// In test mode, show offerwall immediately if no access
		if (offerwallConfig.testMode && !hasExistingAccess) {
			setShowOfferwall(true);
		}
	}, [location.pathname]);

	const handleWatchAd = () => {
		// Simulate watching ad
		setShowOfferwall(false);

		// Show loading state
		const loadingMessage = document.createElement('div');
		loadingMessage.textContent = 'Loading ad...';
		loadingMessage.style.cssText = `
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			background: #333;
			color: white;
			padding: 20px;
			border-radius: 8px;
			z-index: 9999;
		`;
		document.body.appendChild(loadingMessage);

		setTimeout(() => {
			// Grant access
			localStorage.setItem('offerwall_access_timestamp', Date.now().toString());
			setHasAccess(true);
			document.body.removeChild(loadingMessage);
			alert(offerwallConfig.messages.accessGranted);
		}, 2000);
	};

	const handleDecline = () => {
		setShowOfferwall(false);
		alert(offerwallConfig.messages.accessDenied);
		// Navigate back or to home
		window.history.back();
	};

	// Show offerwall overlay
	if (showOfferwall) {
		return (
			<div
				style={{
					position: 'fixed',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					backgroundColor: 'rgba(0, 0, 0, 0.8)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 9998,
				}}
			>
				<div
					style={{
						backgroundColor: '#1e1e1e',
						padding: '30px',
						borderRadius: '8px',
						maxWidth: '400px',
						textAlign: 'center',
						border: '2px solid #444',
					}}
				>
					<h2 style={{marginBottom: '20px', color: '#fff'}}>Access Required</h2>
					<p style={{marginBottom: '30px', color: '#ccc'}}>{offerwallConfig.messages.accessPrompt}</p>
					<div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
						<button
							onClick={handleWatchAd}
							style={{
								padding: '10px 20px',
								backgroundColor: '#4CAF50',
								color: 'white',
								border: 'none',
								borderRadius: '4px',
								cursor: 'pointer',
								fontSize: '16px',
							}}
						>
							Watch Ad
						</button>
						<button
							onClick={handleDecline}
							style={{
								padding: '10px 20px',
								backgroundColor: '#f44336',
								color: 'white',
								border: 'none',
								borderRadius: '4px',
								cursor: 'pointer',
								fontSize: '16px',
							}}
						>
							Go Back
						</button>
					</div>
					<p style={{marginTop: '20px', fontSize: '12px', color: '#888'}}>
						Access granted for {offerwallConfig.accessDurationHours} hours after viewing
					</p>
				</div>
			</div>
		);
	}

	// Block access if needed
	if (!hasAccess) {
		return (
			<div style={{padding: '50px', textAlign: 'center'}}>
				<h2>Access Denied</h2>
				<p>{offerwallConfig.messages.accessDenied}</p>
			</div>
		);
	}

	// Grant access
	return <>{children}</>;
};

export default OfferwallGate;
