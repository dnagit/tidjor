import { defineStore } from 'pinia';

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    accessToken: '' as string,
  }),

  getters: {
    isAuthenticated: (s) => !!s.user,
    isAdmin: (s) => s.user?.role === 'ADMIN',
    isModerator: (s) => s.user?.role === 'ADMIN' || s.user?.role === 'MODERATOR',
  },

  actions: {
    setSession(token: string, user: User) {
      this.accessToken = token;
      this.user = user;
      if (process.client) localStorage.setItem('tj_token', token);
    },

    async login(email: string, password: string) {
      const config = useRuntimeConfig();
      const data = await $fetch<{ accessToken: string; user: User }>('/api/auth/login', {
        baseURL: config.public.apiBase,
        method: 'POST',
        credentials: 'include',
        body: { email, password },
      });
      this.setSession(data.accessToken, data.user);
      return data;
    },

    async register(email: string, password: string, displayName: string) {
      const config = useRuntimeConfig();
      const data = await $fetch<{ accessToken: string; user: User }>('/api/auth/register', {
        baseURL: config.public.apiBase,
        method: 'POST',
        credentials: 'include',
        body: { email, password, displayName },
      });
      this.setSession(data.accessToken, data.user);
      return data;
    },

    async refresh(): Promise<boolean> {
      try {
        const config = useRuntimeConfig();
        const data = await $fetch<{ accessToken: string }>('/api/auth/refresh', {
          baseURL: config.public.apiBase,
          method: 'POST',
          credentials: 'include',
        });
        this.accessToken = data.accessToken;
        if (process.client) localStorage.setItem('tj_token', data.accessToken);
        await this.fetchMe();
        return true;
      } catch { return false; }
    },

    async fetchMe() {
      if (!this.accessToken) return;
      const config = useRuntimeConfig();
      const data = await $fetch<{ user: User }>('/api/auth/me', {
        baseURL: config.public.apiBase,
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      this.user = data.user;
    },

    async logout() {
      const config = useRuntimeConfig();
      await $fetch('/api/auth/logout', {
        baseURL: config.public.apiBase,
        method: 'POST',
        credentials: 'include',
      }).catch(() => {});
      this.user = null;
      this.accessToken = '';
      if (process.client) localStorage.removeItem('tj_token');
    },

    async hydrate() {
      if (!process.client) return;
      const t = localStorage.getItem('tj_token');
      if (t) {
        this.accessToken = t;
        try { await this.fetchMe(); }
        catch { await this.refresh(); }
      }
    },

    loginWithProvider(provider: 'google' | 'facebook' | 'line') {
      const config = useRuntimeConfig();
      window.location.href = `${config.public.apiBase}/api/auth/${provider}`;
    },
  },
});
