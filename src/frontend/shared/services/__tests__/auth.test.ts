import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../auth';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('authService.login', () => {
  it('returns LoginResponse on success', async () => {
    const body = { accessToken: 'tok', userId: 'u1', roles: ['TENANT'] };
    mockFetch.mockResolvedValue(jsonResponse(200, body));

    const result = await authService.login({ mail: 'a@b.com', password: '12345678' });
    expect(result).toEqual(body);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws "Credenciales inválidas" on 401', async () => {
    mockFetch.mockResolvedValue(jsonResponse(401, {}));
    await expect(authService.login({ mail: 'a@b.com', password: 'wrong' }))
      .rejects.toThrow('Credenciales inválidas');
  });

  it('throws server error on 500', async () => {
    mockFetch.mockResolvedValue(jsonResponse(500, {}));
    await expect(authService.login({ mail: 'a@b.com', password: '12345678' }))
      .rejects.toThrow('Error del servidor. Intenta de nuevo más tarde.');
  });

  it('throws network error when fetch fails', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(authService.login({ mail: 'a@b.com', password: '12345678' }))
      .rejects.toThrow('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
  });
});

describe('authService.register', () => {
  const payload = {
    fullName: 'Test User',
    userType: 'TENANT' as const,
    documentTypeCode: 'CC',
    documentNumber: '123456',
    mail: 'a@b.com',
    phoneNumber: '3001234567',
    password: '12345678',
    role: 'TENANT' as const,
    personType: 'natural' as const,
    naturalDetails: { firstName: 'Test', lastName: 'User' },
  };

  it('resolves on 201', async () => {
    mockFetch.mockResolvedValue(jsonResponse(201, {}));
    await expect(authService.register(payload)).resolves.toBeUndefined();
  });

  it('throws "El correo electrónico ya está registrado" on 409', async () => {
    mockFetch.mockResolvedValue(jsonResponse(409, {}));
    await expect(authService.register(payload))
      .rejects.toThrow('El correo electrónico ya está registrado');
  });

  it('throws server error on 500', async () => {
    mockFetch.mockResolvedValue(jsonResponse(500, {}));
    await expect(authService.register(payload))
      .rejects.toThrow('Error del servidor. Intenta de nuevo más tarde.');
  });

  it('throws backend message on 400', async () => {
    mockFetch.mockResolvedValue(jsonResponse(400, { message: 'Datos inválidos' }));
    await expect(authService.register(payload))
      .rejects.toThrow('Datos inválidos');
  });

  it('throws network error when fetch fails', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(authService.register(payload))
      .rejects.toThrow('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
  });
});

describe('authService.getProfile', () => {
  it('returns UserProfile on success', async () => {
    const profile = { id: 'u1', mail: 'a@b.com', roles: ['TENANT'], isActive: true };
    mockFetch.mockResolvedValue(jsonResponse(200, profile));

    const result = await authService.getProfile('my-token');
    expect(result).toEqual(profile);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/profile'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer my-token' }),
      }),
    );
  });

  it('throws "Sesión expirada" on 401', async () => {
    mockFetch.mockResolvedValue(jsonResponse(401, {}));
    await expect(authService.getProfile('expired-token'))
      .rejects.toThrow('Sesión expirada');
  });

  it('throws server error on 500', async () => {
    mockFetch.mockResolvedValue(jsonResponse(500, {}));
    await expect(authService.getProfile('tok'))
      .rejects.toThrow('Error del servidor. Intenta de nuevo más tarde.');
  });

  it('throws network error when fetch fails', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(authService.getProfile('tok'))
      .rejects.toThrow('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
  });
});

describe('authService.getDocumentTypes', () => {
  it('returns DocumentType[] on success', async () => {
    const types = [{ code: 'CC', name: 'Cédula de Ciudadanía' }];
    mockFetch.mockResolvedValue(jsonResponse(200, types));

    const result = await authService.getDocumentTypes();
    expect(result).toEqual(types);
  });

  it('throws server error on 500', async () => {
    mockFetch.mockResolvedValue(jsonResponse(500, {}));
    await expect(authService.getDocumentTypes())
      .rejects.toThrow('Error del servidor. Intenta de nuevo más tarde.');
  });

  it('throws network error when fetch fails', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(authService.getDocumentTypes())
      .rejects.toThrow('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
  });
});
