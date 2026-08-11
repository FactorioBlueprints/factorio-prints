import { captureException } from "@sentry/react";
import { FirebaseError } from "firebase/app";
import {
  type AuthProvider,
  GithubAuthProvider,
  GoogleAuthProvider,
  getAuth,
  sendSignInLinkToEmail,
  signInWithPopup,
} from "firebase/auth";
import { useCallback, useMemo, useState } from "react";
import { app } from "../base";

export interface UseAuthProvidersReturn {
  googleProvider: GoogleAuthProvider;
  githubProvider: GithubAuthProvider;
  authenticateWithProvider: (provider: AuthProvider) => Promise<void>;
  authenticateWithEmail: (email: string) => Promise<void>;
  authenticationError?: string;
  isEmailSending: boolean;
}

const ignoredProviderAuthenticationErrorCodes = new Set([
  "auth/cancelled-popup-request",
  "auth/popup-closed-by-user",
]);

const expectedProviderAuthenticationErrorCodes = new Set([
  "auth/network-request-failed",
  "auth/popup-blocked",
]);

const providerAuthenticationErrorMessages = new Map([
  [
    "auth/account-exists-with-different-credential",
    "An account already exists with this email address.",
  ],
  [
    "auth/network-request-failed",
    "Unable to reach the authentication service. Check your connection and try again.",
  ],
  ["auth/operation-not-allowed", "This sign-in method is currently unavailable."],
  [
    "auth/popup-blocked",
    "The sign-in popup was blocked. Allow popups for this site and try again.",
  ],
  ["auth/unauthorized-domain", "Sign-in is not configured for this domain."],
]);

export const getProviderAuthenticationErrorMessage = (error: unknown): string => {
  if (error instanceof FirebaseError) {
    return (
      providerAuthenticationErrorMessages.get(error.code) ?? "Unable to sign in. Please try again."
    );
  }
  return "Unable to sign in. Please try again.";
};

export const useAuthProviders = (onAuthSuccess?: () => void): UseAuthProvidersReturn => {
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [authenticationError, setAuthenticationError] = useState<string>();

  const googleProvider = useMemo(() => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "consent select_account" });
    return provider;
  }, []);

  const githubProvider = useMemo(() => {
    const provider = new GithubAuthProvider();
    provider.setCustomParameters({ allow_signup: "true" });
    return provider;
  }, []);

  const authenticateWithProvider = useCallback(
    async (provider: AuthProvider) => {
      setAuthenticationError(undefined);
      try {
        await signInWithPopup(getAuth(app), provider);
        onAuthSuccess?.();
      } catch (error: unknown) {
        const authenticationErrorCode = error instanceof FirebaseError ? error.code : "unknown";
        if (ignoredProviderAuthenticationErrorCodes.has(authenticationErrorCode)) {
          return;
        }

        setAuthenticationError(getProviderAuthenticationErrorMessage(error));
        if (expectedProviderAuthenticationErrorCodes.has(authenticationErrorCode)) {
          return;
        }

        captureException(error, {
          tags: {
            component: "authentication",
            operation: "provider-sign-in",
          },
          extra: { authenticationErrorCode },
        });
      }
    },
    [onAuthSuccess],
  );

  const authenticateWithEmail = useCallback(
    async (emailAddress: string) => {
      if (!emailAddress.trim()) {
        return;
      }

      setAuthenticationError(undefined);
      setIsEmailSending(true);

      const actionCodeSettings = {
        url: `${window.location.origin}/auth/email-callback`,
        handleCodeInApp: true,
      };

      try {
        await sendSignInLinkToEmail(getAuth(app), emailAddress, actionCodeSettings);
        localStorage.setItem("emailForSignIn", emailAddress);
        alert("Check your email for a sign-in link!");
        onAuthSuccess?.();
      } catch {
        alert("Failed to send sign-in email. Please try again.");
      } finally {
        setIsEmailSending(false);
      }
    },
    [onAuthSuccess],
  );

  return {
    googleProvider,
    githubProvider,
    authenticateWithProvider,
    authenticateWithEmail,
    authenticationError,
    isEmailSending,
  };
};
