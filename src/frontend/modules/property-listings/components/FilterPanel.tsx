'use client';

import { useState, useEffect, useId } from 'react';
import { Button } from '@/shared/components/Button';
import type { ListingFilters } from '../types';

export interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: ListingFilters;
  onApply: (filters: ListingFilters) => void;
  onClear: () => void;
}

const CITIES = ['Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Cartago'];

const PUBLISHED_OPTIONS: { label: string; value: ListingFilters['publishedWithin'] }[] = [
  { label: 'Últimas 24 horas', value: '24h' },
  { label: 'Última semana', value: '7d' },
  { label: 'Último mes', value: '30d' },
  { label: 'Últimos 3 meses', value: '90d' },
  { label: 'Cualquier fecha', value: 'any' },
];

const PROPERTY_TYPES = ['Apartamento', 'Casa', 'Estudio', 'Habitación'];

const ROOM_OPTIONS = ['1', '2', '3', '4', '5+'];
const BATHROOM_OPTIONS = ['1', '2', '3', '4+'];

/** Format a raw numeric string as COP display: "120000" → "$120.000" */
function formatCOP(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return '$' + Number(digits).toLocaleString('es-CO');
}

/** Strip formatting back to digits only */
function stripCOP(display: string): string {
  return display.replace(/\D/g, '');
}

function parseRoomValue(val: string): number | undefined {
  if (val === '') return undefined;
  if (val === '5+') return 5;
  return Number(val);
}

function parseBathroomValue(val: string): number | undefined {
  if (val === '') return undefined;
  if (val === '4+') return 4;
  return Number(val);
}

function roomsToString(val: number | undefined): string {
  if (val === undefined) return '';
  if (val >= 5) return '5+';
  return String(val);
}

function bathroomsToString(val: number | undefined): string {
  if (val === undefined) return '';
  if (val >= 4) return '4+';
  return String(val);
}

export default function FilterPanel({
  isOpen,
  onClose,
  currentFilters,
  onApply,
  onClear,
}: FilterPanelProps) {
  const uid = useId();

  const [city, setCity] = useState(currentFilters.city ?? '');
  const [neighborhood, setNeighborhood] = useState(currentFilters.neighborhood ?? '');
  const [publishedWithin, setPublishedWithin] = useState<string>(currentFilters.publishedWithin ?? '');
  const [propertyType, setPropertyType] = useState(currentFilters.propertyType ?? '');
  const [priceMinRaw, setPriceMinRaw] = useState(currentFilters.priceMin?.toString() ?? '');
  const [priceMaxRaw, setPriceMaxRaw] = useState(currentFilters.priceMax?.toString() ?? '');
  const [rooms, setRooms] = useState(roomsToString(currentFilters.rooms));
  const [bathrooms, setBathrooms] = useState(bathroomsToString(currentFilters.bathrooms));
  const [areaMinRaw, setAreaMinRaw] = useState(currentFilters.areaMin?.toString() ?? '');
  const [areaMaxRaw, setAreaMaxRaw] = useState(currentFilters.areaMax?.toString() ?? '');

  // Note: Numeric inputs (price, area) use local state only.
  // Since filters require explicit "Aplicar filtros" action,
  // debounce is not needed here (no API calls on each keystroke).
  // If reactive filtering is added later, wire useDebounce from @/shared/hooks/useDebounce.

  // Sync local state when currentFilters change externally
  useEffect(() => {
    setCity(currentFilters.city ?? '');
    setNeighborhood(currentFilters.neighborhood ?? '');
    setPublishedWithin(currentFilters.publishedWithin ?? '');
    setPropertyType(currentFilters.propertyType ?? '');
    setPriceMinRaw(currentFilters.priceMin?.toString() ?? '');
    setPriceMaxRaw(currentFilters.priceMax?.toString() ?? '');
    setRooms(roomsToString(currentFilters.rooms));
    setBathrooms(bathroomsToString(currentFilters.bathrooms));
    setAreaMinRaw(currentFilters.areaMin?.toString() ?? '');
    setAreaMaxRaw(currentFilters.areaMax?.toString() ?? '');
  }, [currentFilters]);

  // Reset neighborhood when city is cleared
  useEffect(() => {
    if (!city) setNeighborhood('');
  }, [city]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleApply = () => {
    const filters: ListingFilters = {};
    if (city) filters.city = city;
    if (neighborhood) filters.neighborhood = neighborhood;
    if (publishedWithin) filters.publishedWithin = publishedWithin as ListingFilters['publishedWithin'];
    if (propertyType) filters.propertyType = propertyType;
    // Use raw values (not debounced) since this is an explicit user action
    if (priceMinRaw) filters.priceMin = Number(priceMinRaw);
    if (priceMaxRaw) filters.priceMax = Number(priceMaxRaw);
    const roomVal = parseRoomValue(rooms);
    if (roomVal !== undefined) filters.rooms = roomVal;
    const bathVal = parseBathroomValue(bathrooms);
    if (bathVal !== undefined) filters.bathrooms = bathVal;
    if (areaMinRaw) filters.areaMin = Number(areaMinRaw);
    if (areaMaxRaw) filters.areaMax = Number(areaMaxRaw);
    onApply(filters);
    onClose();
  };

  const handleClear = () => {
    setCity('');
    setNeighborhood('');
    setPublishedWithin('');
    setPropertyType('');
    setPriceMinRaw('');
    setPriceMaxRaw('');
    setRooms('');
    setBathrooms('');
    setAreaMinRaw('');
    setAreaMaxRaw('');
    onClear();
  };

  if (!isOpen) return null;

  const selectClass =
    'appearance-none bg-neutral-50 border border-neutral-300 rounded-card px-3 py-2 pr-10 text-body text-neutral-900 w-full min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M5%208l5%205%205-5%22%20stroke%3D%22%234B5563%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E")] bg-[length:20px_20px] bg-[right_12px_center] bg-no-repeat';
  const textInputClass =
    'bg-neutral-50 border border-neutral-300 rounded-card px-3 py-2 text-body text-neutral-900 w-full min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
  const priceInputClass =
    'bg-white border border-neutral-300 rounded-card px-3 py-2 text-body text-neutral-900 w-full min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
  const areaInputClass =
    'bg-neutral-50 border border-neutral-300 rounded-card px-3 py-2 text-body text-neutral-900 w-full min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
  const labelClass = 'text-body font-semibold text-neutral-900';

  const cityId = `${uid}-city`;
  const neighborhoodId = `${uid}-neighborhood`;
  const publishedId = `${uid}-published`;
  const propertyTypeId = `${uid}-propertyType`;
  const priceMinId = `${uid}-priceMin`;
  const priceMaxId = `${uid}-priceMax`;
  const roomsId = `${uid}-rooms`;
  const bathroomsId = `${uid}-bathrooms`;
  const areaMinId = `${uid}-areaMin`;
  const areaMaxId = `${uid}-areaMax`;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col h-[100dvh]">
      {/* Header */}
      <header className="flex items-center border-b border-neutral-300 px-mobile-margin py-3 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-card"
          aria-label="Volver"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h2 className="flex-1 text-center text-h1 font-bold text-neutral-900">Filtros</h2>
        {/* Spacer for centering */}
        <div className="min-w-[44px]" />
      </header>

      {/* Scrollable fields */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-mobile-margin md:px-desktop-margin py-section-gap">
        <div className="max-w-[416px] mx-auto space-y-section-gap">
        {/* Ciudad */}
        <div className="space-y-element-gap">
          <label htmlFor={cityId} className={labelClass}>Ciudad</label>
          <select
            id={cityId}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={selectClass}
          >
            <option value="">Seleccionar ciudad</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Zona / Barrio */}
        <div className="space-y-element-gap">
          <label htmlFor={neighborhoodId} className={labelClass}>Zona / Barrio</label>
          <input
            id={neighborhoodId}
            type="text"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            disabled={!city}
            placeholder={city ? 'Escribe un barrio' : ''}
            className={`${textInputClass} ${!city ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          {!city && (
            <p className="text-small text-neutral-600">Primero selecciona una ciudad</p>
          )}
        </div>

        {/* Fecha de publicación */}
        <div className="space-y-element-gap">
          <label htmlFor={publishedId} className={labelClass}>Fecha de publicación</label>
          <select
            id={publishedId}
            value={publishedWithin}
            onChange={(e) => setPublishedWithin(e.target.value)}
            className={selectClass}
          >
            <option value="">Cualquier fecha</option>
            {PUBLISHED_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Tipo de propiedad */}
        <div className="space-y-element-gap">
          <label htmlFor={propertyTypeId} className={labelClass}>Tipo de propiedad</label>
          <select
            id={propertyTypeId}
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className={selectClass}
          >
            <option value="">Todos los tipos</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Precio mensual */}
        <div className="space-y-element-gap">
          <span className={labelClass}>Precio mensual</span>
          <div className="flex gap-element-gap">
            <div className="flex-1">
              <label htmlFor={priceMinId} className="sr-only">Precio mínimo</label>
              <input
                id={priceMinId}
                type="text"
                inputMode="numeric"
                placeholder="$Mínimo"
                value={formatCOP(priceMinRaw)}
                onChange={(e) => setPriceMinRaw(stripCOP(e.target.value))}
                className={priceInputClass}
              />
            </div>
            <div className="flex-1">
              <label htmlFor={priceMaxId} className="sr-only">Precio máximo</label>
              <input
                id={priceMaxId}
                type="text"
                inputMode="numeric"
                placeholder="$Máximo"
                value={formatCOP(priceMaxRaw)}
                onChange={(e) => setPriceMaxRaw(stripCOP(e.target.value))}
                className={priceInputClass}
              />
            </div>
          </div>
        </div>

        {/* Habitaciones */}
        <div className="space-y-element-gap">
          <label htmlFor={roomsId} className={labelClass}>Número de habitaciones</label>
          <select
            id={roomsId}
            value={rooms}
            onChange={(e) => setRooms(e.target.value)}
            className={selectClass}
          >
            <option value="">Cualquiera</option>
            {ROOM_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Baños */}
        <div className="space-y-element-gap">
          <label htmlFor={bathroomsId} className={labelClass}>Número de baños</label>
          <select
            id={bathroomsId}
            value={bathrooms}
            onChange={(e) => setBathrooms(e.target.value)}
            className={selectClass}
          >
            <option value="">Cualquiera</option>
            {BATHROOM_OPTIONS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Área (m²) */}
        <div className="space-y-element-gap">
          <span className={labelClass}>Área (m²)</span>
          <div className="flex gap-element-gap">
            <div className="flex-1">
              <label htmlFor={areaMinId} className="sr-only">Área mínima</label>
              <input
                id={areaMinId}
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="Mínimo"
                value={areaMinRaw}
                onChange={(e) => setAreaMinRaw(e.target.value)}
                className={areaInputClass}
              />
            </div>
            <div className="flex-1">
              <label htmlFor={areaMaxId} className="sr-only">Área máxima</label>
              <input
                id={areaMaxId}
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="Máximo"
                value={areaMaxRaw}
                onChange={(e) => setAreaMaxRaw(e.target.value)}
                className={areaInputClass}
              />
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="shrink-0 px-mobile-margin md:px-desktop-margin pb-section-gap pt-element-gap border-t border-neutral-300">
        <div className="max-w-[416px] mx-auto space-y-element-gap">
          <Button variant="primary" onClick={handleApply}>
            Aplicar filtros
          </Button>
          <Button variant="secondary" onClick={handleClear}>
            Limpiar filtros
          </Button>
        </div>
      </div>
    </div>
  );
}
