'use client';

import { useState, useEffect, useId, useMemo, useCallback } from 'react';
import { Button } from '@/shared/components/Button';
import { portfolioService } from '@/shared/services/portfolio';
import type { PropertyType, Department, City } from '@/modules/landlord-portfolio/types';
import type { ListingFilters } from '../types';

export interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: ListingFilters;
  onApply: (filters: ListingFilters) => void;
  onClear: () => void;
}

const PUBLISHED_OPTIONS: { label: string; value: ListingFilters['publishedWithin'] }[] = [
  { label: 'Últimas 24 horas', value: '24h' },
  { label: 'Última semana', value: '7d' },
  { label: 'Último mes', value: '30d' },
  { label: 'Últimos 3 meses', value: '90d' },
  { label: 'Cualquier fecha', value: 'any' },
];

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

/** Strip non-digit characters from area input */
function stripNonDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Validate a numeric input string. Returns error message or null. */
function validateNumericInput(value: string): string | null {
  if (!value) return null;
  if (/[^0-9]/.test(value)) return 'Solo se permiten números';
  return null;
}

/** Validate that min is not greater than max. Returns error message or null. */
function validateMinMax(min: string, max: string): string | null {
  if (!min || !max) return null;
  if (Number(min) > Number(max)) return 'El mínimo no puede ser mayor al máximo';
  return null;
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

  const [department, setDepartment] = useState(currentFilters.department ?? '');
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

  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [departmentError, setDepartmentError] = useState(false);
  const [cityError, setCityError] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Fetch departments from backend on mount
  const fetchDepartments = useCallback(() => {
    setDepartmentError(false);
    portfolioService.getDepartments()
      .then((deps) => setDepartments(deps))
      .catch(() => setDepartmentError(true));
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Fetch cities when department changes
  const fetchCities = useCallback((deptCode: string) => {
    if (!deptCode) {
      setCities([]);
      return;
    }
    setCityError(false);
    setLoadingCities(true);
    portfolioService.getCitiesByDepartment(deptCode)
      .then((c) => setCities(c))
      .catch(() => setCityError(true))
      .finally(() => setLoadingCities(false));
  }, []);

  useEffect(() => {
    fetchCities(department);
  }, [department, fetchCities]);

  // Fetch property types from catalog on mount
  useEffect(() => {
    let cancelled = false;
    portfolioService.getPropertyTypes()
      .then((types) => {
        if (!cancelled) setPropertyTypes(types);
      })
      .catch(() => {
        // Graceful degradation — leave propertyTypes as empty array
      });
    return () => { cancelled = true; };
  }, []);

  // Track whether user typed invalid characters (for inline error display)
  const [priceMinError, setPriceMinError] = useState<string | null>(null);
  const [priceMaxError, setPriceMaxError] = useState<string | null>(null);
  const [areaMinError, setAreaMinError] = useState<string | null>(null);
  const [areaMaxError, setAreaMaxError] = useState<string | null>(null);

  // Derived min > max errors
  const priceRangeError = useMemo(
    () => validateMinMax(priceMinRaw, priceMaxRaw),
    [priceMinRaw, priceMaxRaw],
  );
  const areaRangeError = useMemo(
    () => validateMinMax(areaMinRaw, areaMaxRaw),
    [areaMinRaw, areaMaxRaw],
  );

  // API saturation protection review (task 12.2):
  // ✅ Numeric inputs (price min/max, area min/max) use local state only — no API calls on keystroke.
  // ✅ Explicit action pattern: filters are only applied when user clicks "Aplicar filtros" (handleApply).
  // ✅ useDebounce is NOT needed here because no field change triggers an API call directly.
  // ✅ useListings already uses AbortController to cancel in-flight requests on filter changes.
  // ✅ Pagination rapid clicks are safe: AbortController cancels stale requests automatically.
  // If reactive filtering is added later, wire useDebounce from @/shared/hooks/useDebounce.

  // Sync local state when currentFilters change externally
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDepartment(currentFilters.department ?? '');
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
    // Clear errors when filters are synced externally
    setPriceMinError(null);
    setPriceMaxError(null);
    setAreaMinError(null);
    setAreaMaxError(null);
  }, [currentFilters]);

  // Reset city and neighborhood when department is cleared
  // (This handles the cascading clear when department changes)
  // Note: The department change handler below handles the explicit user action.
  // This effect handles the case where department is cleared externally.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!department) {
      setCity('');
      setNeighborhood('');
    }
  }, [department]);

  // Reset neighborhood when city is cleared
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDept = e.target.value;
    setDepartment(newDept);
    setCity('');
    setNeighborhood('');
  };

  const handlePriceMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const stripped = stripCOP(rawInput);
    const error = validateNumericInput(rawInput.replace(/[$.,\s]/g, ''));
    setPriceMinError(error);
    setPriceMinRaw(stripped);
  };

  const handlePriceMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const stripped = stripCOP(rawInput);
    const error = validateNumericInput(rawInput.replace(/[$.,\s]/g, ''));
    setPriceMaxError(error);
    setPriceMaxRaw(stripped);
  };

  const handleAreaMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const error = validateNumericInput(rawInput);
    setAreaMinError(error);
    setAreaMinRaw(stripNonDigits(rawInput));
  };

  const handleAreaMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const error = validateNumericInput(rawInput);
    setAreaMaxError(error);
    setAreaMaxRaw(stripNonDigits(rawInput));
  };

  const hasErrors = !!(priceMinError || priceMaxError || areaMinError || areaMaxError || priceRangeError || areaRangeError);

  const handleApply = () => {
    if (hasErrors) return;

    const filters: ListingFilters = {};
    if (department) filters.department = department;
    if (city) filters.city = city;
    if (neighborhood) filters.neighborhood = neighborhood;
    if (publishedWithin) filters.publishedWithin = publishedWithin as ListingFilters['publishedWithin'];
    if (propertyType) filters.propertyType = propertyType;
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
    setDepartment('');
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
    setPriceMinError(null);
    setPriceMaxError(null);
    setAreaMinError(null);
    setAreaMaxError(null);
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
  const inputErrorClass = '!border-error';
  const labelClass = 'text-body font-semibold text-neutral-900';

  const departmentId = `${uid}-department`;
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

  const priceMinErrorId = `${uid}-priceMin-error`;
  const priceMaxErrorId = `${uid}-priceMax-error`;
  const priceRangeErrorId = `${uid}-priceRange-error`;
  const areaMinErrorId = `${uid}-areaMin-error`;
  const areaMaxErrorId = `${uid}-areaMax-error`;
  const areaRangeErrorId = `${uid}-areaRange-error`;

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
          {/* Departamento */}
          <div className="space-y-element-gap">
            <label htmlFor={departmentId} className={labelClass}>Departamento</label>
            {departmentError ? (
              <div className="space-y-2">
                <p className="text-caption text-error">No se pudieron cargar las opciones</p>
                <button
                  type="button"
                  onClick={fetchDepartments}
                  className="text-caption font-medium text-primary underline min-h-[44px] min-w-[44px] inline-flex items-center"
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <select
                id={departmentId}
                value={department}
                onChange={handleDepartmentChange}
                className={selectClass}
              >
                <option value="">Seleccionar departamento</option>
                {departments.map((d) => (
                  <option key={d.code} value={d.code}>{d.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Ciudad */}
          <div className="space-y-element-gap">
            <label htmlFor={cityId} className={labelClass}>Ciudad</label>
            {cityError ? (
              <div className="space-y-2">
                <p className="text-caption text-error">No se pudieron cargar las opciones</p>
                <button
                  type="button"
                  onClick={() => fetchCities(department)}
                  className="text-caption font-medium text-primary underline min-h-[44px] min-w-[44px] inline-flex items-center"
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <select
                id={cityId}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!department || loadingCities}
                className={`${selectClass} ${!department ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">
                  {!department
                    ? 'Primero selecciona un departamento'
                    : loadingCities
                      ? 'Cargando ciudades...'
                      : 'Seleccionar ciudad'}
                </option>
                {cities.map((c) => (
                  <option key={c.code} value={c.name}>{c.name}</option>
                ))}
              </select>
            )}
            {!department && !departmentError && (
              <p className="text-small text-neutral-600">Primero selecciona un departamento</p>
            )}
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
              {propertyTypes.map((pt) => (
                <option key={pt.code} value={pt.code}>{pt.description}</option>
              ))}
            </select>
          </div>

          {/* Precio mensual */}
          <div className="space-y-element-gap">
            <span className={labelClass}>Precio mensual</span>
            <div className="flex gap-element-gap">
              <div className="flex-1 space-y-1">
                <label htmlFor={priceMinId} className="sr-only">Precio mínimo</label>
                <input
                  id={priceMinId}
                  type="text"
                  inputMode="numeric"
                  placeholder="$Mínimo"
                  value={formatCOP(priceMinRaw)}
                  onChange={handlePriceMinChange}
                  aria-invalid={!!(priceMinError || priceRangeError)}
                  aria-describedby={priceMinError ? priceMinErrorId : priceRangeError ? priceRangeErrorId : undefined}
                  className={`${priceInputClass} ${priceMinError || priceRangeError ? inputErrorClass : ''}`}
                />
                {priceMinError && (
                  <p id={priceMinErrorId} className="text-caption text-error" role="alert">{priceMinError}</p>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <label htmlFor={priceMaxId} className="sr-only">Precio máximo</label>
                <input
                  id={priceMaxId}
                  type="text"
                  inputMode="numeric"
                  placeholder="$Máximo"
                  value={formatCOP(priceMaxRaw)}
                  onChange={handlePriceMaxChange}
                  aria-invalid={!!(priceMaxError || priceRangeError)}
                  aria-describedby={priceMaxError ? priceMaxErrorId : priceRangeError ? priceRangeErrorId : undefined}
                  className={`${priceInputClass} ${priceMaxError || priceRangeError ? inputErrorClass : ''}`}
                />
                {priceMaxError && (
                  <p id={priceMaxErrorId} className="text-caption text-error" role="alert">{priceMaxError}</p>
                )}
              </div>
            </div>
            {priceRangeError && !priceMinError && !priceMaxError && (
              <p id={priceRangeErrorId} className="text-caption text-error" role="alert">{priceRangeError}</p>
            )}
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
              <div className="flex-1 space-y-1">
                <label htmlFor={areaMinId} className="sr-only">Área mínima</label>
                <input
                  id={areaMinId}
                  type="text"
                  inputMode="numeric"
                  placeholder="Mínimo"
                  value={areaMinRaw}
                  onChange={handleAreaMinChange}
                  aria-invalid={!!(areaMinError || areaRangeError)}
                  aria-describedby={areaMinError ? areaMinErrorId : areaRangeError ? areaRangeErrorId : undefined}
                  className={`${areaInputClass} ${areaMinError || areaRangeError ? inputErrorClass : ''}`}
                />
                {areaMinError && (
                  <p id={areaMinErrorId} className="text-caption text-error" role="alert">{areaMinError}</p>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <label htmlFor={areaMaxId} className="sr-only">Área máxima</label>
                <input
                  id={areaMaxId}
                  type="text"
                  inputMode="numeric"
                  placeholder="Máximo"
                  value={areaMaxRaw}
                  onChange={handleAreaMaxChange}
                  aria-invalid={!!(areaMaxError || areaRangeError)}
                  aria-describedby={areaMaxError ? areaMaxErrorId : areaRangeError ? areaRangeErrorId : undefined}
                  className={`${areaInputClass} ${areaMaxError || areaRangeError ? inputErrorClass : ''}`}
                />
                {areaMaxError && (
                  <p id={areaMaxErrorId} className="text-caption text-error" role="alert">{areaMaxError}</p>
                )}
              </div>
            </div>
            {areaRangeError && !areaMinError && !areaMaxError && (
              <p id={areaRangeErrorId} className="text-caption text-error" role="alert">{areaRangeError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="shrink-0 px-mobile-margin md:px-desktop-margin pb-section-gap pt-element-gap border-t border-neutral-300">
        <div className="max-w-[416px] mx-auto space-y-element-gap">
          <Button variant="primary" onClick={handleApply} disabled={hasErrors}>
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
