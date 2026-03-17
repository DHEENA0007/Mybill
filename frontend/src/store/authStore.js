import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login as apiLogin, logout as apiLogout, getMe } from '../api/auth';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (credentials) => {
        const { data } = await apiLogin(credentials);
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        set({
          accessToken: data.access,
          refreshToken: data.refresh,
          isAuthenticated: true,
          // store user+permissions from login response immediately
          user: data.user || null,
        });
        // fetch full user profile with permissions
        const me = await getMe();
        set({ user: me.data });
        return data;
      },

      logout: async () => {
        const refresh = get().refreshToken;
        try { if (refresh) await apiLogout(refresh); } catch {}
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
);

export default useAuthStore;
