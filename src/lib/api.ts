import { User, FileItem, StorageStats, AuthResponse } from '../types.ts';

const TOKEN_KEY = 'shoppyvault_auth_token';

// Base URL for the backend.
// - Local dev: leave VITE_API_URL unset → '' → requests go to same origin (Vite proxy)
// - Vercel:    set VITE_API_URL=https://your-backend.onrender.com in project settings
const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export const authStorage = {
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken: (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
  },
  removeToken: () => {
    localStorage.removeItem(TOKEN_KEY);
  }
};

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {};
  const token = authStorage.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Central fetch wrapper.
 * - Prefixes the backend base URL
 * - Guards against non-JSON responses (e.g., Vercel's HTML 404 page)
 * - Throws a clean Error with the server's `error` field when present
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);

  const contentType = res.headers.get('content-type') || '';

  // If the server didn't return JSON, surface a clear error instead of
  // letting `res.json()` blow up with `Unexpected token 'T'...`
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(
      `Expected JSON from ${path} but got ${contentType || 'unknown content-type'}: ${text.slice(0, 120)}`
    );
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed: ${res.status}`);
  }

  return data as T;
}

export const api = {
  // ───────────────────────────── Auth ─────────────────────────────

  async signup(data: { email: string; password: string; name: string; role: string }): Promise<AuthResponse> {
    const result = await request<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    authStorage.setToken(result.token);
    return result;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const result = await request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    authStorage.setToken(result.token);
    return result;
  },

  async syncFirebaseUser(data: { id: string; email: string; name: string; role?: string }): Promise<AuthResponse> {
    const result = await request<AuthResponse>('/api/auth/firebase-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    authStorage.setToken(result.token);
    return result;
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: getHeaders()
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      authStorage.removeToken();
    }
  },

  async getCurrentUser(): Promise<{ user: User; stats: StorageStats } | null> {
    const token = authStorage.getToken();
    if (!token) return null;

    try {
      const data = await request<{ user: User; stats: StorageStats }>('/api/auth/me', {
        headers: getHeaders()
      });
      return data;
    } catch {
      // Invalid / expired token → clear it so the user is signed out cleanly
      authStorage.removeToken();
      return null;
    }
  },

  // ───────────────────────────── Files ─────────────────────────────

  async getFiles(params?: { search?: string; category?: string; sort?: string }): Promise<{ files: FileItem[]; stats: StorageStats }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.category) query.set('category', params.category);
    if (params?.sort) query.set('sort', params.sort);

    const qs = query.toString();
    return request<{ files: FileItem[]; stats: StorageStats }>(
      `/api/files${qs ? `?${qs}` : ''}`,
      { headers: getHeaders() }
    );
  },

  async uploadFiles(
    files: File[],
    options?: { notes?: string; tags?: string[] }
  ): Promise<{ files: FileItem[]; stats: StorageStats }> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    if (options?.notes) {
      formData.append('notes', options.notes);
    }
    if (options?.tags && options.tags.length > 0) {
      formData.append('tags', options.tags.join(','));
    }

    const token = authStorage.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // NOTE: do NOT set Content-Type — browser sets it with the boundary for FormData

    return request<{ files: FileItem[]; stats: StorageStats }>('/api/files/upload', {
      method: 'POST',
      headers,
      body: formData
    });
  },

  async deleteFile(fileId: string): Promise<{ fileId: string; stats: StorageStats }> {
    return request<{ fileId: string; stats: StorageStats }>(`/api/files/${fileId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  },

  getViewUrl(fileId: string): string {
    const token = authStorage.getToken();
    return `${API_URL}/api/files/${fileId}/view?token=${encodeURIComponent(token || '')}`;
  },

  getDownloadUrl(fileId: string): string {
    const token = authStorage.getToken();
    return `${API_URL}/api/files/${fileId}/download?token=${encodeURIComponent(token || '')}`;
  }
};
