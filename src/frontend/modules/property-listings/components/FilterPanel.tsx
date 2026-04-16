'use client';

import { useState, useEffect, useId } from 'react';
import { useDebounce } from '@/shared/hooks/useDebounce';
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

  // Debounce numeric inputs for smooth local state updates
  const priceMin = useDebounce(priceMinRaw, 400);
  const priceMax = useDebounce(priceMaxRaw, 400);
  const areaMin = useDebounce(areaMinRaw, 400);
  const areaMax = useDebounce(areaMaxRaw, 400);

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

  const handleApply = () => {
    const filters: ListingFilters = {};
    if (city) filters.city = city;
    if (neighborhood) filters.neighborhood = neighborhood;
    if (publishedWithin) filters.publishedWithin = publishedWithin as ListingFilters['publishedWithin'];
    if (propertyType) filters.propertyType = propertyType;
    if (priceMin) filters.priceMin = Number(priceMin);
    if (priceMax) filters.priceMax = Number(priceMax);
    const roomVal = parseRoomValue(rooms);
    if (roomVal !== undefined) filters.rooms = roomVal;
    const bathVal = parseBathroomValue(bathrooms);
    if (bathVal !== undefined) filters.bathrooms = bathVal;
    if (areaMin) filters.areaMin = Number(areaMin);
    if (areaMax) filters.areaMax = Number(areaMax);
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

  const dropdownClass =
    'bg-neutral-50 border border-neutral-300 rounded-card px-3 py-2 text-body text-neutral-900 w-full min-h-[44px]';
  const priceInputClass =
    'bg-white border border-neutral-300 rounded-card px-3 py-2 text-body text-neutral-900 w-full min-h-[44px]';
  const areaInputClass =
    'bg-neutral-50 border border-neutral-300 rounded-card px-3 py-2 text-body text-neutral-900 w-full min-h-[44px]';
  const labelClass = 'text-caption font-semibold text-neutral-900';

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
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <header className="flex items-center border-b border-neutral-300 px-mobile-margin py-3 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center"
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
        <h2 className="flex-1 text-center text-h1 text-neutral-900">Filtros</h2>
        {/* Spacer for centering */}
        <div className="min-w-[44px]" />
      </header>

      {/* Scrollable fields */}
      <div className="flex-1 overflow-y-auto px-mobile-margin py-section-gap space-y-section-gap">
        {/* Ciudad */}
        <div className="space-y-element-gap">
          <label htmlFor={cityId} className={labelClass}>Ciudad</label>
          <select
            id={cityId}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={dropdownClass}
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
            className={`${dropdownClass} ${!city ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            className={dropdownClass}
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
            className={dropdownClass}
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
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="Mínimo"
                value={priceMinRaw}
                onChange={(e) => setPriceMinRaw(e.target.value)}
                className={priceInputClass}
              />
            </div>
            <div className="flex-1">
              <label htmlFor={priceMaxId} className="sr-only">Precio máximo</label>
              <input
                id={priceMaxId}
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="Máximo"
                value={priceMaxRaw}
                onChange={(e) => setPriceMaxRaw(e.target.value)}
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
            className={dropdownClass}
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
            className={dropdownClass}
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

      {/* Action buttons */}
      <div className="shrink-0 px-mobile-margin pb-section-gap pt-element-gap space-y-element-gap border-t border-neutral-300">
        <Button variant="primary" onClick={handleApply}>
          Aplicar filtros
        </Button>
        <Button variant="secondary" onClick={handleClear}>
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}
