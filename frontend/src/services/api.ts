import { API_URL } from '../utils/format';

export class ApiError extends Error {
  status: number;
  details?: Record<string, unknown>;

  constructor(status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type Listener = () => void;

const noop = () => {};

export class Api {
  private token: string | null = null;
  private authListener: Listener | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('bf_token', token);
    } else {
      localStorage.removeItem('bf_token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    this.token = localStorage.getItem('bf_token');
    return this.token;
  }

  onUnauthorized(listener: Listener | null) {
    this.authListener = listener;
  }

  async request<T>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      body?: unknown;
      auth?: boolean;
    } = {},
  ): Promise<T> {
    return this.raw<T>(path, options);
  }

  async raw<T>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      body?: unknown;
      auth?: boolean;
      raw?: boolean;
    } = {},
  ): Promise<T> {
    const { method = 'GET', body, auth = true } = options;

    const headers: Record<string, string> = {};
    if (body !== undefined && !(body instanceof URLSearchParams)) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this.getToken();
    if (auth && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? (body instanceof URLSearchParams ? body : JSON.stringify(body)) : undefined,
      });
    } catch (err) {
      throw new ApiError(0, `Impossible de contacter le serveur (${API_URL}).`);
    }

    if (response.status === 401 && auth) {
      this.setToken(null);
      this.authListener?.();
    }

    const contentType = response.headers.get('content-type') ?? '';
    const data = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);

    if (!response.ok) {
      const message =
        (data && typeof data === 'object' && (data as { detail?: unknown }).detail) ||
        `Erreur ${response.status}`;
      throw new ApiError(response.status, String(message), typeof data === 'object' ? (data as Record<string, unknown>) : undefined);
    }

    return data as T;
  }

  get<T>(path: string, auth = true) {
    return this.raw<T>(path, { method: 'GET', auth });
  }

  post<T>(path: string, body?: unknown, auth = true) {
    return this.raw<T>(path, { method: 'POST', body, auth });
  }

  patch<T>(path: string, body?: unknown, auth = true) {
    return this.raw<T>(path, { method: 'PATCH', body, auth });
  }

  put<T>(path: string, body?: unknown, auth = true) {
    return this.raw<T>(path, { method: 'PUT', body, auth });
  }

  delete<T>(path: string, auth = true) {
    return this.raw<T>(path, { method: 'DELETE', auth });
  }
}

export const api = new Api();