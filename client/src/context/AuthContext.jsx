import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api
        .get("/auth/me")
        .then((res) => {
          if (res.data.success) {
            setUser(res.data.data.user);
          } else {
            logout();
          }
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const data = res.data;
    if (!data.success) throw new Error(data.error?.message || "Login failed");

    localStorage.setItem("token", data.data.token);
    setToken(data.data.token);
    setUser(data.data.user);
    return data.data.user;
  };

  const register = async (name, email, password, role = "LEARNER") => {
    const res = await api.post("/auth/register", { name, email, password, role });
    const data = res.data;
    if (!data.success) throw new Error(data.error?.message || "Registration failed");

    localStorage.setItem("token", data.data.token);
    setToken(data.data.token);
    setUser(data.data.user);
    return data.data.user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
