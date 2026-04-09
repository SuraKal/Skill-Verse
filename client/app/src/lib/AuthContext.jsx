import React, { createContext, useContext } from "react";
import { MOCK_USER } from "./mockData";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const value = {
    user: MOCK_USER,
    isAuthenticated: true,
    isLoadingAuth: false,
    isLoadingPublicSettings: false,
    authError: null,
    logout: () => {},
    navigateToLogin: () => {},
    checkAppState: () => {},
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
