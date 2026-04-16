export function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMinutes < 1) return 'Publicado hace un momento';
  if (diffMinutes < 60)
    return `Publicado hace ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
  if (diffHours < 24)
    return `Publicado hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  if (diffDays < 7)
    return `Publicado hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  if (diffWeeks < 5)
    return `Publicado hace ${diffWeeks} ${diffWeeks === 1 ? 'semana' : 'semanas'}`;
  return `Publicado hace ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;
}
