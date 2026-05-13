import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type AuthError,
} from "firebase/auth";
import { API_BASE_URL, API_ENDPOINTS } from "../config/api";
import { auth, isFirebaseConfigured } from "../config/firebase";
import { clearAuthToken, setAuthToken } from "./api";

type VerifyResponse = {
  success: boolean;
  message: string;
  data: {
    token: string;
    user?: {
      _id: string;
      firebaseUid?: string;
      email: string;
      name?: string;
      role: string;
    };
  };
};

/**
 * Exchange a Firebase ID token for a backend JWT with retry logic.
 *
 * Sends the Firebase token in the Authorization header (not the body),
 * as required by the /api/auth/verify spec.
 */
async function exchangeFirebaseToken(firebaseIdToken: string, retryCount = 0): Promise<VerifyResponse["data"]> {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.verify}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${firebaseIdToken}`,
      },
      body: JSON.stringify({ role: "vendor" }),
    });

    const payload = (await response.json().catch(() => null)) as VerifyResponse | null;

    if (!response.ok) {
      // Handle rate limiting (429) with retry
      if (response.status === 429 && retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        console.warn(`Rate limited. Retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return exchangeFirebaseToken(firebaseIdToken, retryCount + 1);
      }

      console.error("Token exchange failed:", { status: response.status, payload });
      throw new Error(payload?.message || "Vendor login verification failed");
    }

    if (!payload?.data?.token) {
      console.error("No token in response:", payload);
      throw new Error("No token returned from server");
    }

    // If user data is missing, create a default user object
    const user = payload.data.user || {
      _id: "vendor_user",
      email: "vendor@speedcopy.com",
      role: "vendor",
      name: "Vendor User",
    };

    return { ...payload.data, user };
  } catch (error) {
    // If it's a network error and we haven't exceeded retries, retry
    if (retryCount < maxRetries && error instanceof TypeError) {
      const delay = baseDelay * Math.pow(2, retryCount);
      console.warn(`Network error. Retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return exchangeFirebaseToken(firebaseIdToken, retryCount + 1);
    }
    throw error;
  }
}

/**
 * Sign in with Firebase email/password, then exchange the Firebase ID token
 * for a short backend JWT. Stores the backend JWT — not the Firebase token.
 */
export async function loginWithFirebase(email: string, password: string) {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase login is not configured for this vendor app");
  }

  try {
    // Step 1: Firebase sign-in
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Step 2: Get Firebase ID token (used only once)
    const firebaseIdToken = await userCredential.user.getIdToken();

    // Step 3: Exchange for backend JWT
    const data = await exchangeFirebaseToken(firebaseIdToken);

    // Step 4: Store the backend JWT (not the Firebase token)
    setAuthToken(data.token);

    return data;
  } catch (error) {
    const authError = error as AuthError & { message?: string };

    if (authError.code === "auth/invalid-credential") {
      throw new Error(
        "Firebase rejected these credentials. Check the vendor account in the configured Firebase project."
      );
    }

    throw new Error(authError.message || "Vendor login failed");
  }
}

/**
 * Sign out from Firebase and clear the stored backend JWT.
 */
export async function logoutFirebase() {
  try {
    await signOut(auth);
  } finally {
    clearAuthToken();
    localStorage.removeItem("vendor_session");
  }
}

/**
 * Sync the vendor auth session on app load.
 *
 * On Firebase auth state change:
 * - If a user is present and no backend JWT is stored, re-exchange the token.
 * - If no user, clear everything and call onUnauthenticated.
 *
 * This avoids re-verifying on every auth state tick when a valid JWT already exists.
 */
export function syncVendorAuthSession(onUnauthenticated: () => void) {
  let nullAuthGraceTimer: number | null = null;

  const cleanupTimer = () => {
    if (nullAuthGraceTimer !== null) {
      window.clearTimeout(nullAuthGraceTimer);
      nullAuthGraceTimer = null;
    }
  };

  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    cleanupTimer();

    if (!firebaseUser) {
      // Firebase can briefly emit null during hydration right after login.
      // Give it a short grace window before forcing a logout redirect.
      nullAuthGraceTimer = window.setTimeout(() => {
        if (!auth.currentUser) {
          clearAuthToken();
          localStorage.removeItem("vendor_session");
          onUnauthenticated();
        }
      }, 1200);
      return;
    }

    // If we already have a backend JWT stored, trust it — no need to re-verify.
    const { getAuthToken } = await import("./api");
    if (getAuthToken()) {
      return;
    }

    // No JWT stored — re-exchange the Firebase token to get a fresh backend JWT.
    try {
      const firebaseIdToken = await firebaseUser.getIdToken();
      const data = await exchangeFirebaseToken(firebaseIdToken);

      if (!data.token) {
        clearAuthToken();
        localStorage.removeItem("vendor_session");
        onUnauthenticated();
        return;
      }

      setAuthToken(data.token);
    } catch {
      clearAuthToken();
      localStorage.removeItem("vendor_session");
      onUnauthenticated();
    }
  });

  return () => {
    cleanupTimer();
    unsubscribe();
  };
}
