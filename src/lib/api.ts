import { User, FileItem, StorageStats, AuthResponse } from '../types.ts';

const TOKEN_KEY = 'shoppyvault_auth_token';

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

export const api = {
  // Auth
  async signup(data: { email: string; password: string; name: string; role: string }): Promise<AuthResponse> {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to create account');
    }
    authStorage.setToken(result.token);
    return result;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to sign in');
    }
    authStorage.setToken(result.token);
    return result;
  },

  async syncFirebaseUser(data: { id: string; email: string; name: string; role?: string }): Promise<AuthResponse> {
    const res = await fetch('/api/auth/firebase-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to synchronize user session');
    }
    authStorage.setToken(result.token);
    return result;
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
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

    const res = await fetch('/api/auth/me', {
      headers: getHeaders()
    });

    if (!res.ok) {
      authStorage.removeToken();
      return null;
    }

    return await res.json();
  },

  // Files
  async getFiles(params?: { search?: string; category?: string; sort?: string }): Promise<{ files: FileItem[]; stats: StorageStats }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.category) query.set('category', params.category);
    if (params?.sort) query.set('sort', params.sort);

    const res = await fetch(`/api/files?${query.toString()}`, {
      headers: getHeaders()
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to fetch files');
    }

    return result;
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

    const res = await fetch('/api/files/upload', {
      method: 'POST',
      headers,
      body: formData
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to upload files');
    }

    return result;
  },

  async deleteFile(fileId: string): Promise<{ fileId: string; stats: StorageStats }> {
    const res = await fetch(`/api/files/${fileId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to delete file');
    }

    return result;
  },

  getViewUrl(fileId: string): string {
    const token = authStorage.getToken();
    return `/api/files/${fileId}/view?token=${encodeURIComponent(token || '')}`;
  },

  getDownloadUrl(fileId: string): string {
    const token = authStorage.getToken();
    return `/api/files/${fileId}/download?token=${encodeURIComponent(token || '')}`;
  }
};
