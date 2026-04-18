import type {
  PortfolioUnit,
  CreatePortfolioUnitRequest,
  UpdatePortfolioUnitRequest,
} from '@modules/landlord-portfolio/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const portfolioService = {
  async getUnits(token: string): Promise<PortfolioUnit[]> {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/portfolio/units`, {
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

  async createUnit(data: CreatePortfolioUnitRequest, token: string): Promise<PortfolioUnit> {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/portfolio/units`, {
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

  async updateUnit(id: string, data: UpdatePortfolioUnitRequest, token: string): Promise<PortfolioUnit> {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/portfolio/units/${id}`, {
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
};
