import { useAuth as useClerkAuth } from "@clerk/expo";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import {
  clearSession,
  getToken,
  getUser,
  saveSession,
  type StoredUser,
} from "./auth";
import { setPushOptIn } from "./push-preferences";

type AuthContextValue = {
  ready: boolean;
  token: string | null;
  user: StoredUser | null;
  skipMeValidation: boolean;
  authFlowBusy: boolean;
  setAuthFlowBusy: (busy: boolean) => void;
  signIn: (token: string, user: StoredUser) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { signOut: clerkSignOut } = useClerkAuth();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [ready, setReady] = useState(false);
  const [skipMeValidation, setSkipMeValidation] = useState(false);
  const [authFlowBusy, setAuthFlowBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([getToken(), getUser()]);
        setToken(t);
        setUser(u);
      } catch {
        // Ne jamais bloquer le boot sur une erreur de stockage local.
        setToken(null);
        setUser(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  async function signIn(nextToken: string, nextUser: StoredUser) {
    await saveSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
    setSkipMeValidation(true);
  }

  async function signOut() {
    await setPushOptIn(false);
    await clearSession();
    setSkipMeValidation(false);
    setAuthFlowBusy(false);
    setToken(null);
    setUser(null);
    try {
      await clerkSignOut();
    } catch {
      // Clerk peut déjà être déconnecté
    }
  }

  return (
    <AuthContext.Provider
      value={{
        ready,
        token,
        user,
        skipMeValidation,
        authFlowBusy,
        setAuthFlowBusy,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}
