import { describe, it, expect } from 'vitest';

/**
 * ProtectedRoute logic tests.
 *
 * The component follows three rules:
 *   1. isLoading → show spinner (don't redirect, don't render children)
 *   2. !isLoading && !isAuthenticated → redirect to /auth/login, render nothing
 *   3. !isLoading && isAuthenticated → render children
 *
 * Since the project doesn't have jsdom / @testing-library/react,
 * we validate the decision matrix as a pure logic table.
 */

type Decision = 'spinner' | 'redirect' | 'children';

function protectedRouteDecision(isLoading: boolean, isAuthenticated: boolean): Decision {
  if (isLoading) return 'spinner';
  if (!isAuthenticated) return 'redirect';
  return 'children';
}

describe('ProtectedRoute decision logic', () => {
  it('shows spinner while loading', () => {
    expect(protectedRouteDecision(true, false)).toBe('spinner');
    expect(protectedRouteDecision(true, true)).toBe('spinner');
  });

  it('redirects when not loading and not authenticated', () => {
    expect(protectedRouteDecision(false, false)).toBe('redirect');
  });

  it('renders children when not loading and authenticated', () => {
    expect(protectedRouteDecision(false, true)).toBe('children');
  });
});
