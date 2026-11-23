import { createContext, ReactNode, useContext, useState } from "react";
import { authApi, User } from "../api/client";

type AuthContextValue = {
  user: User | null; // null = nobody is logged in
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  setUser: (user: User | null) => void; // after register or profile update
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Wrap the whole app in <AuthProvider> (see App.tsx)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    const loggedIn = await authApi.login(email, password); // POST /auth/login
    setUser(loggedIn);
    return loggedIn;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Use in any screen: const { user, logout } = useAuth();
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
