const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  code: string;
  details?: any;

  constructor(message: string, code: string = 'API_ERROR', details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Forward HTTP-only cookies
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorCode = data?.error?.code || response.statusText;
    const errorMessage = data?.error?.message || 'An unexpected network error occurred.';
    throw new ApiError(errorMessage, errorCode, data?.error?.details);
  }

  if (data && 'success' in data && data.success === false) {
    throw new ApiError(data.error?.message || 'Request failed', data.error?.code);
  }

  return data?.data !== undefined ? data.data : data;
}
