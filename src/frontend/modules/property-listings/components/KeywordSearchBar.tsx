'use client';

import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { portfolioService } from '@/shared/services/portfolio';
import { fetchAdditionalFeatures } from '@/shared/services/api';
import type { PropertyType, Department, City } from '@/modules/landlord-portfolio/types';
import type { ListingFilters, AdditionalFeature } from '../types';

export interface KeywordSearchBarProps {
    onSearch: (filters: ListingFilters) => void;
    currentFilters: ListingFilters;
}

export interface Suggestion {
    dimension: 'department' | 'city' | 'propertyType' | 'additionalFeature';
    value: string;
    label: string;
}

interface CatalogData {
    departments: Department[];
    cities: City[];
    propertyTypes: PropertyType[];
    additionalFeatures: AdditionalFeature[];
}

/**
 * Pure function for filtering suggestions from prefetched catalog data.
 * Performs case-insensitive substring matching against catalog entries.
 * Exported for testability.
 */
export function filterSuggestions(query: string, catalogs: CatalogData): Suggestion[] {
    if (!query.trim()) return [];

    const normalizedQuery = query.toLowerCase().trim();
    const suggestions: Suggestion[] = [];

    // Match departments
    for (const dept of catalogs.departments) {
        if (dept.name.toLowerCase().includes(normalizedQuery)) {
            suggestions.push({
                dimension: 'department',
                value: dept.code,
                label: `departamento: ${dept.name}`,
            });
        }
    }

    // Match cities
    for (const city of catalogs.cities) {
        if (city.name.toLowerCase().includes(normalizedQuery)) {
            suggestions.push({
                dimension: 'city',
                value: city.name,
                label: `ciudad: ${city.name}`,
            });
        }
    }

    // Match property types
    for (const pt of catalogs.propertyTypes) {
        if (pt.description.toLowerCase().includes(normalizedQuery)) {
            suggestions.push({
                dimension: 'propertyType',
                value: pt.code,
                label: `tipo: ${pt.description}`,
            });
        }
    }

    // Match main additional features
    for (const feature of catalogs.additionalFeatures) {
        if (feature.name.toLowerCase().includes(normalizedQuery)) {
            suggestions.push({
                dimension: 'additionalFeature',
                value: feature.id,
                label: `característica: ${feature.name}`,
            });
        }
    }

    return suggestions;
}

export default function KeywordSearchBar({ onSearch, currentFilters }: KeywordSearchBarProps) {
    const uid = useId();
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [catalogs, setCatalogs] = useState<CatalogData>({
        departments: [],
        cities: [],
        propertyTypes: [],
        additionalFeatures: [],
    });
    const [chips, setChips] = useState<Suggestion[]>([]);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLUListElement>(null);

    // Prefetch catalogs on mount
    useEffect(() => {
        let cancelled = false;

        async function prefetch() {
            try {
                const [departments, propertyTypes, features] = await Promise.all([
                    portfolioService.getDepartments(),
                    portfolioService.getPropertyTypes(),
                    fetchAdditionalFeatures(),
                ]);

                if (cancelled) return;

                // Fetch cities for all active departments
                const cityPromises = departments.map((dept) =>
                    portfolioService.getCitiesByDepartment(dept.code).catch(() => [] as City[])
                );
                const cityArrays = await Promise.all(cityPromises);

                if (cancelled) return;

                const allCities = cityArrays.flat();
                const mainFeatures = features.filter((f) => f.main && f.active);

                setCatalogs({
                    departments,
                    cities: allCities,
                    propertyTypes,
                    additionalFeatures: mainFeatures,
                });
            } catch {
                // Graceful degradation — suggestions unavailable but component still renders
            }
        }

        prefetch();
        return () => { cancelled = true; };
    }, []);

    // Sync chips from currentFilters
    useEffect(() => {
        const newChips: Suggestion[] = [];

        if (currentFilters.department) {
            const dept = catalogs.departments.find((d) => d.code === currentFilters.department);
            if (dept) {
                newChips.push({
                    dimension: 'department',
                    value: dept.code,
                    label: `departamento: ${dept.name}`,
                });
            }
        }

        if (currentFilters.city) {
            newChips.push({
                dimension: 'city',
                value: currentFilters.city,
                label: `ciudad: ${currentFilters.city}`,
            });
        }

        if (currentFilters.propertyType) {
            const pt = catalogs.propertyTypes.find((p) => p.code === currentFilters.propertyType);
            if (pt) {
                newChips.push({
                    dimension: 'propertyType',
                    value: pt.code,
                    label: `tipo: ${pt.description}`,
                });
            }
        }

        if (currentFilters.additionalFeatures) {
            for (const [featureId] of Object.entries(currentFilters.additionalFeatures)) {
                const feature = catalogs.additionalFeatures.find((f) => f.id === featureId);
                if (feature) {
                    newChips.push({
                        dimension: 'additionalFeature',
                        value: feature.id,
                        label: `característica: ${feature.name}`,
                    });
                }
            }
        }

        setChips(newChips);
    }, [currentFilters, catalogs]);

    // Debounced suggestion filtering
    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setInputValue(value);

            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }

            if (!value.trim()) {
                setSuggestions([]);
                setShowDropdown(false);
                return;
            }

            debounceRef.current = setTimeout(() => {
                const filtered = filterSuggestions(value, catalogs);
                setSuggestions(filtered);
                setShowDropdown(filtered.length > 0);
            }, 300);
        },
        [catalogs]
    );

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
        setChips((prev) => {
            // Replace existing chip of same dimension (except additionalFeature which can have multiple)
            if (suggestion.dimension === 'additionalFeature') {
                const exists = prev.some(
                    (c) => c.dimension === suggestion.dimension && c.value === suggestion.value
                );
                if (exists) return prev;
                return [...prev, suggestion];
            }
            const filtered = prev.filter((c) => c.dimension !== suggestion.dimension);
            return [...filtered, suggestion];
        });
        setInputValue('');
        setSuggestions([]);
        setShowDropdown(false);
        inputRef.current?.focus();
    }, []);

    const handleChipRemove = useCallback((chipToRemove: Suggestion) => {
        setChips((prev) =>
            prev.filter(
                (c) => !(c.dimension === chipToRemove.dimension && c.value === chipToRemove.value)
            )
        );
    }, []);

    const handleSearch = useCallback(() => {
        const filters: ListingFilters = {};

        for (const chip of chips) {
            switch (chip.dimension) {
                case 'department':
                    filters.department = chip.value;
                    break;
                case 'city':
                    filters.city = chip.value;
                    break;
                case 'propertyType':
                    filters.propertyType = chip.value;
                    break;
                case 'additionalFeature':
                    if (!filters.additionalFeatures) {
                        filters.additionalFeatures = {};
                    }
                    filters.additionalFeatures[chip.value] = 'true';
                    break;
            }
        }

        onSearch(filters);
    }, [chips, onSearch]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            const target = e.target as Node;
            if (
                inputRef.current &&
                !inputRef.current.contains(target) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(target)
            ) {
                setShowDropdown(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const inputId = `${uid}-keyword-search`;
    const listboxId = `${uid}-suggestions`;

    return (
        <div className="w-full space-y-2">
            {/* Search input row */}
            <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                    <label htmlFor={inputId} className="sr-only">
                        Buscar por palabra clave
                    </label>
                    <input
                        ref={inputRef}
                        id={inputId}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onFocus={() => {
                            if (suggestions.length > 0) setShowDropdown(true);
                        }}
                        placeholder="Buscar departamento, ciudad, tipo..."
                        autoComplete="off"
                        role="combobox"
                        aria-expanded={showDropdown}
                        aria-controls={listboxId}
                        aria-autocomplete="list"
                        className="bg-neutral-50 border border-neutral-300 rounded-card px-3 py-2 text-body text-neutral-900 w-full min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />

                    {/* Suggestion dropdown */}
                    {showDropdown && suggestions.length > 0 && (
                        <ul
                            ref={dropdownRef}
                            id={listboxId}
                            role="listbox"
                            className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-neutral-300 rounded-card shadow-lg max-h-[240px] overflow-y-auto"
                        >
                            {suggestions.map((suggestion, index) => (
                                <li
                                    key={`${suggestion.dimension}-${suggestion.value}-${index}`}
                                    role="option"
                                    aria-selected={false}
                                    className="px-3 py-2 text-caption text-neutral-700 cursor-pointer hover:bg-neutral-100 min-h-[44px] flex items-center"
                                    onClick={() => handleSuggestionClick(suggestion)}
                                >
                                    {suggestion.label}
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* No suggestions message */}
                    {showDropdown && suggestions.length === 0 && inputValue.trim() && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-neutral-300 rounded-card shadow-lg px-3 py-2">
                            <p className="text-caption text-neutral-500">Sin sugerencias</p>
                        </div>
                    )}
                </div>

                {/* Buscar button */}
                <button
                    type="button"
                    onClick={handleSearch}
                    className="bg-[#1d4ed8] text-white rounded-[6px] min-h-[44px] min-w-[44px] px-4 inline-flex items-center justify-center font-semibold text-body whitespace-nowrap"
                >
                    Buscar
                </button>
            </div>

            {/* Tag chips */}
            {chips.length > 0 && (
                <div className="flex flex-wrap gap-2" aria-label="Filtros activos">
                    {chips.map((chip) => (
                        <span
                            key={`${chip.dimension}-${chip.value}`}
                            className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-caption px-2 py-1 rounded-full"
                        >
                            {chip.label}
                            <button
                                type="button"
                                onClick={() => handleChipRemove(chip)}
                                className="min-w-[20px] min-h-[20px] inline-flex items-center justify-center rounded-full hover:bg-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                aria-label={`Eliminar filtro ${chip.label}`}
                            >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                    <path
                                        d="M9 3L3 9M3 3l6 6"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
