import type {
  PortfolioUnit,
  CreatePortfolioUnitRequest,
  UpdatePortfolioUnitRequest,
  PaginatedPortfolios,
  PortfolioSummary,
  CreatePortfolioRequest,
  CreateUnitRequest,
  EnrichedUnitResponse,
  PropertyType,
} from '@modules/landlord-portfolio/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const portfolioService = {
  async getUnits(portfolioId: string, token: string): Promise<PortfolioUnit[]> {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/portfolio/${portfolioId}/units`, {
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
      if (res.status === 403) throw new Error('No tienes permiso para realizar esta acción');
      if (res.status === 404) throw new Error('Unidad de portafolio no encontrada');
      if (res.status >= 500) throw new Error('Error del servidor. Intenta de nuevo más tarde.');
      throw new Error('Error del servidor. Intenta de nuevo más tarde.');
    }

    return res.json();
  },

  async createUnit(portfolioId: string, data: CreatePortfolioUnitRequest, token: string): Promise<PortfolioUnit> {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/portfolio/${portfolioId}/units`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
    } catch {
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
    }

    if (!res.ok) {
      if (res.status === 401) throw new Error('Sesión expirada');
      if (res.status === 403) throw new Error('No tienes permiso para realizar esta acción');
      if (res.status === 404) throw new Error('Unidad de portafolio no encontrada');
      if (res.status >= 500) throw new Error('Error del servidor. Intenta de nuevo más tarde.');
      throw new Error('Error del servidor. Intenta de nuevo más tarde.');
    }

    return res.json();
  },

  async updateUnit(portfolioId: string, id: string, data: UpdatePortfolioUnitRequest, token: string): Promise<PortfolioUnit> {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/portfolio/${portfolioId}/units/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
    } catch {
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
    }

    if (!res.ok) {
      if (res.status === 401) throw new Error('Sesión expirada');
      if (res.status === 403) throw new Error('No tienes permiso para realizar esta acción');
      if (res.status === 404) throw new Error('Unidad de portafolio no encontrada');
      if (res.status >= 500) throw new Error('Error del servidor. Intenta de nuevo más tarde.');
      throw new Error('Error del servidor. Intenta de nuevo más tarde.');
    }

    return res.json();
  },

  async getPortfolios(token: string, page: number = 1, limit: number = 6): Promise<PaginatedPortfolios> {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/portfolio?page=${page}&limit=${limit}`, {
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
      if (res.status === 403) throw new Error('No tienes permiso para realizar esta acción');
      if (res.status === 404) throw new Error('Recurso no encontrado');
      if (res.status >= 500) throw new Error('Error del servidor. Intenta de nuevo más tarde.');
      throw new Error('Error del servidor. Intenta de nuevo más tarde.');
    }

    return res.json();
  },

  async createPortfolio(data: CreatePortfolioRequest, token: string): Promise<PortfolioSummary> {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/portfolio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
    } catch {
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
    }

    if (!res.ok) {
      if (res.status === 401) throw new Error('Sesión expirada');
      if (res.status === 403) throw new Error('No tienes permiso para realizar esta acción');
      if (res.status === 404) throw new Error('Recurso no encontrado');
      if (res.status >= 500) throw new Error('Error del servidor. Intenta de nuevo más tarde.');
      throw new Error('Error del servidor. Intenta de nuevo más tarde.');
    }

    return res.json();
  },

  async createEnrichedUnit(portfolioId: string, data: CreateUnitRequest, token: string): Promise<EnrichedUnitResponse> {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/portfolio/${portfolioId}/units`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
    } catch {
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
    }

    if (!res.ok) {
      if (res.status === 401) throw new Error('Sesión expirada');
      if (res.status === 403) throw new Error('No tienes permiso para realizar esta acción');
      if (res.status === 404) throw new Error('Recurso no encontrado');
      if (res.status >= 500) throw new Error('Error del servidor. Intenta de nuevo más tarde.');
      throw new Error('Error del servidor. Intenta de nuevo más tarde.');
    }

    return res.json();
  },

  async getPropertyTypes(): Promise<PropertyType[]> {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/portfolio/property-types`, {
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
