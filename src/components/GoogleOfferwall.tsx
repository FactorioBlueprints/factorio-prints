import type React from 'react';
import {useEffect, useRef} from 'react';
import {offerwallConfig} from '../base';

declare global {
	interface Window {
		googlefc: {
			offerwall?: {
				customchoice?: {
					registry?: CustomOfferwallChoice;
				};
			};
		};
	}
}

enum InitializeResponseEnum {
	CUSTOM_CHOICE_DISABLED = 'CUSTOM_CHOICE_DISABLED',
	ACCESS_GRANTED = 'ACCESS_GRANTED',
	ACCESS_NOT_GRANTED = 'ACCESS_NOT_GRANTED',
}

interface InitializeParams {
	language: string;
	theme: 'light' | 'dark';
}

class CustomOfferwallChoice {
	private isInitialized = false;
	private hasAccess = false;
	private onAccessGrantedCallback?: () => void;
	private onAccessDeniedCallback?: () => void;

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async initialize(_params: InitializeParams): Promise<InitializeResponseEnum> {
		try {
			this.isInitialized = true;

			// Check if user already has access (e.g., from previous session)
			const hasExistingAccess = this.checkExistingAccess();
			if (hasExistingAccess) {
				this.hasAccess = true;
				return InitializeResponseEnum.ACCESS_GRANTED;
			}

			return InitializeResponseEnum.ACCESS_NOT_GRANTED;
		} catch (error) {
			console.error('Failed to initialize Offerwall:', error);
			return InitializeResponseEnum.CUSTOM_CHOICE_DISABLED;
		}
	}

	async show(): Promise<boolean> {
		try {
			// Show rewarded ad or other monetization option
			const accessGranted = await this.showMonetizationOption();

			if (accessGranted) {
				this.hasAccess = true;
				this.storeAccessGranted();
				if (this.onAccessGrantedCallback) {
					this.onAccessGrantedCallback();
				}
			} else {
				if (this.onAccessDeniedCallback) {
					this.onAccessDeniedCallback();
				}
			}

			return accessGranted;
		} catch (error) {
			console.error('Failed to show Offerwall:', error);
			return false;
		}
	}

	private checkExistingAccess(): boolean {
		// Check localStorage or session for existing access
		const accessTimestamp = localStorage.getItem('offerwall_access_timestamp');
		if (accessTimestamp) {
			const accessTime = parseInt(accessTimestamp, 10);
			const currentTime = Date.now();
			const accessDurationMs = offerwallConfig.accessDurationHours * 60 * 60 * 1000;

			// Grant access if within configured duration
			if (currentTime - accessTime < accessDurationMs) {
				return true;
			}
		}
		return false;
	}

	private async showMonetizationOption(): Promise<boolean> {
		return new Promise((resolve) => {
			// This would typically show a rewarded ad
			// For now, we'll simulate it with a confirmation dialog
			const userChoice = window.confirm(offerwallConfig.messages.accessPrompt);

			if (userChoice) {
				// Simulate ad viewing
				setTimeout(() => {
					resolve(true);
				}, 2000);
			} else {
				resolve(false);
			}
		});
	}

	private storeAccessGranted(): void {
		localStorage.setItem('offerwall_access_timestamp', Date.now().toString());
	}

	setAccessGrantedCallback(callback: () => void): void {
		this.onAccessGrantedCallback = callback;
	}

	setAccessDeniedCallback(callback: () => void): void {
		this.onAccessDeniedCallback = callback;
	}
}

interface GoogleOfferwallProps {
	onAccessGranted?: () => void;
	onAccessDenied?: () => void;
	enabled?: boolean;
}

const GoogleOfferwall: React.FC<GoogleOfferwallProps> = ({onAccessGranted, onAccessDenied, enabled = true}) => {
	const offerwallInstanceRef = useRef<CustomOfferwallChoice | null>(null);

	useEffect(() => {
		if (!enabled) return;

		// Initialize the Offerwall
		const initializeOfferwall = () => {
			try {
				// Create global googlefc object if it doesn't exist
				window.googlefc = window.googlefc || {};
				window.googlefc.offerwall = window.googlefc.offerwall || {};
				window.googlefc.offerwall.customchoice = window.googlefc.offerwall.customchoice || {};

				// Create and register the custom choice
				const offerwallChoice = new CustomOfferwallChoice();

				if (onAccessGranted) {
					offerwallChoice.setAccessGrantedCallback(onAccessGranted);
				}

				if (onAccessDenied) {
					offerwallChoice.setAccessDeniedCallback(onAccessDenied);
				}

				window.googlefc.offerwall.customchoice.registry = offerwallChoice;
				offerwallInstanceRef.current = offerwallChoice;
			} catch (error) {
				console.error('Failed to initialize Google Offerwall:', error);
			}
		};

		// Initialize immediately
		initializeOfferwall();

		// Cleanup function
		return () => {
			if (window.googlefc?.offerwall?.customchoice) {
				window.googlefc.offerwall.customchoice.registry = undefined;
			}
		};
	}, [enabled, onAccessGranted, onAccessDenied]);

	// Component doesn't render anything visible
	// The Offerwall is controlled by Google's Privacy & Messaging system
	return null;
};

export default GoogleOfferwall;
