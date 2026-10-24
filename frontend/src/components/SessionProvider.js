'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '@/lib/api';

const SessionContext = createContext(null);

// UI-01: conserva el token y el usuario autenticado.
export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api('/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user: loggedUser } = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(token);
    setUser(loggedUser);
    return loggedUser;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return <SessionContext.Provider value={{ user, loading, login, logout }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
