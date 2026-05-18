// Universal fetch wrapper that injects the access token + base URL
export const useApi = () => {
  const config = useRuntimeConfig();
  const auth = useAuthStore();

  async function call<T = any>(path: string, opts: any = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    };
    if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;

    try {
      return await $fetch<T>(path, {
        baseURL: config.public.apiBase,
        credentials: 'include',
        ...opts,
        headers,
      });
    } catch (err: any) {
      // Auto-refresh on 401 once
      if (err?.statusCode === 401 && !opts._retried && auth.accessToken) {
        const refreshed = await auth.refresh();
        if (refreshed) {
          return call(path, { ...opts, _retried: true });
        }
      }
      throw err;
    }
  }

  return {
    get:    <T = any>(path: string, query?: any) => call<T>(path, { method: 'GET', query }),
    post:   <T = any>(path: string, body?: any) => call<T>(path, { method: 'POST', body }),
    patch:  <T = any>(path: string, body?: any) => call<T>(path, { method: 'PATCH', body }),
    delete: <T = any>(path: string) => call<T>(path, { method: 'DELETE' }),
  };
};
