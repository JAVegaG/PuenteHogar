export function formatPrice(price: number): string {
  const formatted = price.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `$${formatted}`;
}
