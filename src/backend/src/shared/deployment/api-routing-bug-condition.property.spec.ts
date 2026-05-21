// Feature: deployment-fixes, Property 1: Bug Condition — Frontend API Calls Fail to Reach Backend
// **Validates: Requirements 2.3**
//
// This exploration test verifies the bug condition:
//   input.type == "FRONTEND_API_CALL" AND NOT input.path.startsWith("/api/")
//
// The test checks two conditions that MUST both hold for correct routing:
// 1. NestJS main.ts calls app.setGlobalPrefix('api') so all routes are served under /api/*
// 2. Frontend NEXT_PUBLIC_API_URL resolves to '/api' so fetch calls become /api/auth/login, /api/portfolio, etc.
//
// On UNFIXED code, this test is EXPECTED TO FAIL because:
// - main.ts does NOT call setGlobalPrefix('api')
// - Frontend API_URL defaults to '' (empty string)
// This failure confirms the routing bug exists.

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// ─── File paths ──────────────────────────────────────────────────────────────

const BACKEND_ROOT = path.resolve(__dirname, '..', '..', '..');
const FRONTEND_ROOT = path.resolve(BACKEND_ROOT, '..', 'frontend');

const MAIN_TS_PATH = path.resolve(BACKEND_ROOT, 'src', 'main.ts');
const FRONTEND_SERVICES_DIR = path.resolve(FRONTEND_ROOT, 'shared', 'services');
const FRONTEND_DOCKERFILE_PATH = path.resolve(BACKEND_ROOT, '..', 'infra', 'docker', 'frontend.Dockerfile');

// ─── Backend endpoint paths that the frontend calls ──────────────────────────

const BACKEND_ENDPOINT_PATHS = [
    'auth/login',
    'auth/register',
    'auth/profile',
    'auth/document-types',
    'portfolio',
    'listings',
    'contracts',
    'payments',
    'accounting',
    'tracking',
    'notifications',
] as const;

// ─── Frontend service files that make API calls ──────────────────────────────

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

function mainTsHasGlobalPrefix(): boolean {
    const content = readFileContent(MAIN_TS_PATH);
    // Check for app.setGlobalPrefix('api') or app.setGlobalPrefix("api")
    return /app\.setGlobalPrefix\(\s*['"]api['"]\s*\)/.test(content);
}

function frontendDockerfileHasApiUrl(): boolean {
    if (!fs.existsSync(FRONTEND_DOCKERFILE_PATH)) {
        // If Dockerfile doesn't exist, check cannot pass
        return false;
    }
    const content = readFileContent(FRONTEND_DOCKERFILE_PATH);
    // Check for ENV NEXT_PUBLIC_API_URL=/api (or similar patterns)
    return /NEXT_PUBLIC_API_URL\s*=\s*\/api/.test(content);
}

function frontendServiceUsesApiUrl(serviceFile: string): boolean {
    const filePath = path.resolve(FRONTEND_SERVICES_DIR, serviceFile);
    if (!fs.existsSync(filePath)) {
        return true; // Skip non-existent files (not all services may exist yet)
    }
    const content = readFileContent(filePath);
    // The service must use API_URL from NEXT_PUBLIC_API_URL
    // Check that it references NEXT_PUBLIC_API_URL or API_URL variable
    return content.includes('NEXT_PUBLIC_API_URL') || content.includes('API_URL');
}

/**
 * Simulates what URL the frontend would construct for a given endpoint path.
 * In the UNFIXED state: API_URL = '' → fetch('/auth/login') → hits frontend (ALB default route)
 * In the FIXED state: API_URL = '/api' → fetch('/api/auth/login') → hits backend (ALB /api/* rule)
 */
function simulateFrontendApiCall(endpointPath: string): { url: string; reachesBackend: boolean } {
    // Read the actual NEXT_PUBLIC_API_URL value from Dockerfile or env
    const hasApiUrlInDockerfile = frontendDockerfileHasApiUrl();

    // Simulate the API_URL value
    const apiUrl = hasApiUrlInDockerfile ? '/api' : '';

    const constructedUrl = `${apiUrl}/${endpointPath}`;

    // ALB routes /api/* to backend, everything else to frontend
    const reachesBackend = constructedUrl.startsWith('/api/');

    return { url: constructedUrl, reachesBackend };
}

// ─── Generators ──────────────────────────────────────────────────────────────

/** Generator for backend endpoint paths that the frontend needs to reach */
const arbitraryBackendEndpoint = fc.constantFrom(...BACKEND_ENDPOINT_PATHS);

/** Generator for frontend service files */
const arbitraryFrontendServiceFile = fc.constantFrom(
    ...FRONTEND_SERVICE_FILES.filter((f) => fs.existsSync(path.resolve(FRONTEND_SERVICES_DIR, f))),
);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Bug Condition Exploration — Frontend API Calls Fail to Reach Backend', () => {
    describe('Property 1: NestJS main.ts MUST have global /api prefix', () => {
        it('main.ts calls app.setGlobalPrefix("api") so all routes are served under /api/*', () => {
            fc.assert(
                fc.property(arbitraryBackendEndpoint, (endpointPath) => {
                    // For ANY backend endpoint, the NestJS app must serve it under /api/*
                    // This requires setGlobalPrefix('api') in main.ts
                    const hasPrefix = mainTsHasGlobalPrefix();

                    // The endpoint would be accessible at /api/{endpointPath} only if global prefix is set
                    // Without the prefix, the endpoint is at /{endpointPath} which the ALB won't route to backend
                    return hasPrefix;
                }),
                { numRuns: 50 },
            );
        });
    });

    describe('Property 1: Frontend API calls MUST use /api prefix to reach backend', () => {
        it('for any backend endpoint, the frontend constructs a URL starting with /api/', () => {
            fc.assert(
                fc.property(arbitraryBackendEndpoint, (endpointPath) => {
                    // Simulate what the frontend does when calling this endpoint
                    const { url, reachesBackend } = simulateFrontendApiCall(endpointPath);

                    // The constructed URL MUST start with /api/ to match ALB routing rules
                    // If it doesn't, the request hits the frontend target group (404 or HTML response)
                    return reachesBackend;
                }),
                { numRuns: 50 },
            );
        });
    });

    describe('Property 1: Frontend services use centralized API_URL from NEXT_PUBLIC_API_URL', () => {
        it('all frontend service files reference NEXT_PUBLIC_API_URL or API_URL variable', () => {
            fc.assert(
                fc.property(arbitraryFrontendServiceFile, (serviceFile) => {
                    return frontendServiceUsesApiUrl(serviceFile);
                }),
                { numRuns: 20 },
            );
        });
    });

    describe('Property 1: Combined routing verification', () => {
        it('NestJS has global prefix AND frontend uses /api URL — both conditions required for correct routing', () => {
            fc.assert(
                fc.property(arbitraryBackendEndpoint, (endpointPath) => {
                    // BOTH conditions must hold for the routing to work:
                    // 1. NestJS serves routes under /api/* (global prefix)
                    const backendServesUnderApi = mainTsHasGlobalPrefix();

                    // 2. Frontend constructs URLs with /api prefix
                    const { reachesBackend } = simulateFrontendApiCall(endpointPath);

                    // Both must be true for the system to work correctly
                    return backendServesUnderApi && reachesBackend;
                }),
                { numRuns: 50 },
            );
        });
    });
});
