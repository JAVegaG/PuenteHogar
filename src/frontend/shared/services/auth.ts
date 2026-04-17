import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UserProfile,
  DocumentType,
} from '@modules/users/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
    }

    if (!res.ok) {
      if (res.status === 401) throw new Error('Credenciales inválidas');
      if (res.status >= 500) throw new Error('Error del servidor. Intenta de nuevo más tarde.');
      throw new Error('Error del servidor. Intenta de nuevo más tarde.');
    }

    return res.json();
  },

  async register(data: RegisterRequest): Promise<void> {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
    }

    if (!res.ok) {
      if (res.status === 409) throw new Error('El correo electrónico ya está registrado');
      if (res.status >= 500) throw new Error('Error del servidor. Intenta de nuevo más tarde.');
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || 'Error del servidor. Intenta de nuevo más tarde.');
    }
  },

  async getProfile(token: string): Promise<UserProfile> {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
    }

    if (!res.ok) {
      if (res.status === 401) throw new Error('Sesión expirada');
      if (res.status >= 500) throw new Error('Error del servidor. Intenta de nuevo más tarde.');
      throw new Error('Error del servidor. Intenta de nuevo más tarde.');
    }

    return res.json();
  },

  async getDocumentTypes(): Promise<DocumentType[]> {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/auth/document-types`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
    }

    if (!res.ok) {
      if (res.status >= 500) throw new Error('Error del servidor. Intenta de nuevo más tarde.');
      throw new Error('Error del servidor. Intenta de nuevo más tarde.');
    }

    return res.json();
  },
};
