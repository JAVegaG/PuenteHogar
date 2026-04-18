import { formatRelativeDate } from '@/shared/utils/formatRelativeDate';

export function formatPortfolioDate(isoDate: string): string {
  return formatRelativeDate(isoDate).replace('Publicado', 'Agregado');
}
