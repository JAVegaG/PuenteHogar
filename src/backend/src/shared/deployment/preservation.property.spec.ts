// Feature: deployment-fixes, Property 2: Preservation — Controller Routes and Service Patterns Unchanged
// **Validates: Requirements 3.3, 3.4, 3.5, 3.7, 3.8**
//
// These preservation tests follow observation-first methodology:
// They observe the current state of the codebase and encode it as properties
// that must remain true AFTER the fix is applied.
//
// Observations:
// - NestJS controllers use bare decorators (@Controller('auth'), @Controller('portfolio'), etc.)
// - Frontend services use `${API_URL}/path` pattern with centralized API_URL
// - ALB routes /api/* to backend target group and default to frontend
// - Production config has natGateways: 1 and full Redis config
//
// On UNFIXED code, these tests PASS (confirming baseline behavior to preserve).
// After the fix, these tests MUST STILL PASS (confirming no regressions).

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// ─── File paths ──────────────────────────────────────────────────────────────

const BACKEND_ROOT = path.resolve(__dirname, '..', '..', '..');
const FRONTEND_ROOT = path.resolve(BACKEND_ROOT, '..', 'frontend');
const INFRA_ROOT = path.resolve(BACKEND_ROOT, '..', 'infra');

const MODULES_DIR = path.resolve(BACKEND_ROOT, 'modules');
const FRONTEND_SERVICES_DIR = path.resolve(FRONTEND_ROOT, 'shared', 'services');
const ENVIRONMENTS_TS_PATH = path.resolve(INFRA_ROOT, 'lib', 'config', 'environments.ts');

// ─── Controller files and their expected bare routes ─────────────────────────

interface ControllerInfo {
    module: string;
    file: string;
    expectedRoute: string;
}

const CONTROLLERS: ControllerInfo[] = [
    { module: 'users', file: 'users.controller.ts', expectedRoute: 'auth' },
    { module: 'landlord-portfolio', file: 'landlord-portfolio.controller.ts', expectedRoute: 'portfolio' },
    { module: 'property-listings', file: 'property-listings.controller.ts', expectedRoute: 'listings' },
    { module: 'contracts', file: 'contracts.controller.ts', expectedRoute: 'contracts' },
    { module: 'payments', file: 'payments.controller.ts', expectedRoute: 'payments' },
    { module: 'accounting', file: 'accounting.controller.ts', expectedRoute: 'accounting' },
    { module: 'rental-tracking', file: 'rental-tracking.controller.ts', expectedRoute: 'tracking' },
    { module: 'notifications', file: 'notifications.controller.ts', expectedRoute: 'notifications' },
];

// ─── Frontend service files ──────────────────────────────────────────────────

const FRONTEND_SERVICE_FILES = [
    'auth.ts',
    'api.ts',
    'portfolio.ts',
    'contract.ts',
    'lease.ts',
    'notification.ts',
    'accounting.ts',
    'tenant.ts',
    'role.ts',
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readFileContent(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Extracts the @Controller() decorator path from a controller file.
 * Returns the route string inside the decorator, or null if not found.
 */
function extractControllerRoute(filePath: string): string | null {
    const content = readFileContent(filePath);
    const match = content.match(/@Controller\(\s*['"]([^'"]*)['"]\s*\)/);
    return match ? match[1] : null;
}

/**
 * Checks that a controller route does NOT have an /api prefix.
 * Controllers should use bare routes like 'auth', 'portfolio', etc.
 */
function controllerRouteHasNoApiPrefix(route: string): boolean {
    return !route.startsWith('api/') && !route.startsWith('/api/') && route !== 'api';
}

/**
 * Checks that a frontend service file uses the ${API_URL}/path pattern
 * and does NOT hardcode /api in fetch URLs.
 */
function frontendServiceUsesApiUrlPattern(serviceFile: string): {
    usesApiUrlVariable: boolean;
    noHardcodedApiPrefix: boolean;
} {
    const filePath = path.resolve(FRONTEND_SERVICES_DIR, serviceFile);
    const content = readFileContent(filePath);

    // Must declare API_URL from NEXT_PUBLIC_API_URL
    const usesApiUrlVariable =
        content.includes("process.env.NEXT_PUBLIC_API_URL") &&
        content.includes('API_URL');

    // Must NOT have hardcoded /api in fetch calls
    // Look for fetch(`/api/...`) or fetch('/api/...') patterns (hardcoded, not via variable)
    // The pattern ${API_URL}/path is fine — we're checking for literal '/api/' in fetch strings
    const fetchLines = content.split('\n').filter(line =>
        line.includes('fetch(') || line.includes('fetch (`')
    );

    // Check that no fetch call uses a hardcoded '/api/' prefix directly
    // Valid: `${API_URL}/auth/login` (uses variable)
    // Invalid: `'/api/auth/login'` or `"/api/auth/login"` (hardcoded)
    const hasHardcodedApi = fetchLines.some(line => {
        // Match fetch calls with hardcoded /api/ (not via template literal variable)
        return /fetch\(\s*['"]\/api\//.test(line);
    });

    return {
        usesApiUrlVariable,
        noHardcodedApiPrefix: !hasHardcodedApi,
    };
}

// ─── Generators ──────────────────────────────────────────────────────────────

/** Generator for controller info objects */
const arbitraryController = fc.constantFrom(
    ...CONTROLLERS.filter((c) =>
        fs.existsSync(path.resolve(MODULES_DIR, c.module, c.file)),
    ),
);

/** Generator for frontend service files that exist */
const arbitraryFrontendServiceFile = fc.constantFrom(
    ...FRONTEND_SERVICE_FILES.filter((f) =>
        fs.existsSync(path.resolve(FRONTEND_SERVICES_DIR, f)),
    ),
);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Preservation Property Tests — Controller Routes and Service Patterns Unchanged', () => {
    describe('Property 2a: Controller decorators use bare routes (no /api prefix in controller code)', () => {
        it('for all controller files, @Controller() decorator path does NOT contain /api prefix', () => {
            fc.assert(
                fc.property(arbitraryController, (controller) => {
                    const filePath = path.resolve(MODULES_DIR, controller.module, controller.file);
                    const route = extractControllerRoute(filePath);

                    // Route must exist
                    if (route === null) return false;

                    // Route must match the expected bare route
                    if (route !== controller.expectedRoute) return false;

                    // Route must NOT have /api prefix
                    return controllerRouteHasNoApiPrefix(route);
                }),
                { numRuns: 100 },
            );
        });

        it('no controller file contains @Controller with api/ prefix anywhere in the file', () => {
            fc.assert(
                fc.property(arbitraryController, (controller) => {
                    const filePath = path.resolve(MODULES_DIR, controller.module, controller.file);
                    const content = readFileContent(filePath);

                    // Should NOT find @Controller('api/...') or @Controller("api/...")
                    const hasApiPrefixInDecorator = /@Controller\(\s*['"]api\//.test(content);
                    const hasSlashApiPrefixInDecorator = /@Controller\(\s*['"]\/api/.test(content);

                    return !hasApiPrefixInDecorator && !hasSlashApiPrefixInDecorator;
                }),
                { numRuns: 100 },
            );
        });
    });

    describe('Property 2b: Frontend services use ${API_URL}/path pattern (no hardcoded /api in service files)', () => {
        it('all frontend service files declare API_URL from NEXT_PUBLIC_API_URL', () => {
            fc.assert(
                fc.property(arbitraryFrontendServiceFile, (serviceFile) => {
                    const result = frontendServiceUsesApiUrlPattern(serviceFile);
                    return result.usesApiUrlVariable;
                }),
                { numRuns: 50 },
            );
        });

        it('no frontend service file has hardcoded /api/ prefix in fetch calls', () => {
            fc.assert(
                fc.property(arbitraryFrontendServiceFile, (serviceFile) => {
                    const result = frontendServiceUsesApiUrlPattern(serviceFile);
                    return result.noHardcodedApiPrefix;
                }),
                { numRuns: 50 },
            );
        });

        it('frontend services use template literal pattern ${API_URL}/path for all fetch calls', () => {
            fc.assert(
                fc.property(arbitraryFrontendServiceFile, (serviceFile) => {
                    const filePath = path.resolve(FRONTEND_SERVICES_DIR, serviceFile);
                    const content = readFileContent(filePath);

                    // All fetch calls should use `${API_URL}/...` pattern
                    const fetchCalls = content.match(/fetch\(`[^`]*`/g) || [];

                    // Every template literal fetch must reference API_URL
                    return fetchCalls.every((call) => call.includes('${API_URL}'));
                }),
                { numRuns: 50 },
            );
        });
    });

    describe('Property 2c: Production environment config retains natGateways: 1 and full Redis/ElastiCache configuration', () => {
        it('production config has natGateways: 1', () => {
            fc.assert(
                fc.property(fc.constant(null), () => {
                    const content = readFileContent(ENVIRONMENTS_TS_PATH);

                    // Extract the productionConfig block
                    const prodConfigMatch = content.match(
                        /export\s+const\s+productionConfig[\s\S]*?^};/m,
                    );
                    if (!prodConfigMatch) return false;

                    const prodConfig = prodConfigMatch[0];

                    // Production must have natGateways: 1
                    return /natGateways:\s*1/.test(prodConfig);
                }),
                { numRuns: 1 },
            );
        });

        it('production config has full Redis/ElastiCache configuration (nodeType and numCacheNodes)', () => {
            fc.assert(
                fc.property(fc.constant(null), () => {
                    const content = readFileContent(ENVIRONMENTS_TS_PATH);

                    // Extract the productionConfig block
                    const prodConfigMatch = content.match(
                        /export\s+const\s+productionConfig[\s\S]*?^};/m,
                    );
                    if (!prodConfigMatch) return false;

                    const prodConfig = prodConfigMatch[0];

                    // Production must have redis config with nodeType and numCacheNodes
                    const hasNodeType = /nodeType:\s*['"]cache\./.test(prodConfig);
                    const hasNumCacheNodes = /numCacheNodes:\s*\d+/.test(prodConfig);

                    return hasNodeType && hasNumCacheNodes;
                }),
                { numRuns: 1 },
            );
        });

        it('production config numCacheNodes is at least 2 for high availability', () => {
            fc.assert(
                fc.property(fc.constant(null), () => {
                    const content = readFileContent(ENVIRONMENTS_TS_PATH);

                    // Extract the productionConfig block
                    const prodConfigMatch = content.match(
                        /export\s+const\s+productionConfig[\s\S]*?^};/m,
                    );
                    if (!prodConfigMatch) return false;

                    const prodConfig = prodConfigMatch[0];

                    // Production must have numCacheNodes >= 2
                    const match = prodConfig.match(/numCacheNodes:\s*(\d+)/);
                    if (!match) return false;

                    return parseInt(match[1], 10) >= 2;
                }),
                { numRuns: 1 },
            );
        });

        it('production config retains multi-AZ database for reliability', () => {
            fc.assert(
                fc.property(fc.constant(null), () => {
                    const content = readFileContent(ENVIRONMENTS_TS_PATH);

                    // Extract the productionConfig block
                    const prodConfigMatch = content.match(
                        /export\s+const\s+productionConfig[\s\S]*?^};/m,
                    );
                    if (!prodConfigMatch) return false;

                    const prodConfig = prodConfigMatch[0];

                    // Production must have multiAz: true
                    return /multiAz:\s*true/.test(prodConfig);
                }),
                { numRuns: 1 },
            );
        });
    });
});
