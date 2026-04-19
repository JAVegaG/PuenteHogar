# Implementation Plan: Object Storage Real Implementation

## Overview

Replace the MVP stub adapters in `property-listings` and `contracts` modules with real AWS S3 SDK v3 implementations. The approach is bottom-up: install the SDK, build shared infrastructure (factory, utilities, exceptions), then wire the real adapters into each module. Property-based tests validate correctness properties on pure utility functions; unit tests cover adapters with mocked SDK.

## Tasks

- [x] 1. Install AWS S3 SDK and extend configuration
  - [x] 1.1 Add `@aws-sdk/client-s3` as a production dependency in `src/backend/package.json`
    - Run `npm install @aws-sdk/client-s3` from `src/backend/`
    - _Requirements: 1.1_

  - [x] 1.2 Add `region` to `objectStorage` config in `src/backend/src/config/configuration.ts`
    - Extend `AppConfig.objectStorage` interface to include `region: string`
    - Read from `OBJECT_STORAGE_REGION` env var with default `'us-east-1'`
    - Update `.env.example` with `OBJECT_STORAGE_REGION` placeholder
    - _Requirements: 1.2, 1.3_

- [x] 2. Create shared S3 infrastructure
  - [x] 2.1 Create custom exception classes in `src/backend/src/shared/s3/object-storage.exceptions.ts`
    - `ObjectStorageException` (base, generic S3 / network errors)
    - `ObjectStorageCredentialsException extends ObjectStorageException` (403 AccessDenied)
    - `ObjectStorageBucketNotFoundException extends ObjectStorageException` (NoSuchBucket)
    - `ObjectStorageValidationException extends ObjectStorageException` (local validation failures)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 2.2 Create shared utility functions in `src/backend/src/shared/s3/object-key.utils.ts`
    - `generateObjectKey(prefix, filename)` → `{prefix}/{timestamp}-{uuid}-{filename}`
    - `parseObjectKey(key)` → `{ prefix, timestamp, uuid, filename }`
    - `buildObjectUrl(bucket, region, key)` → `https://{bucket}.s3.{region}.amazonaws.com/{key}`
    - `validateBuffer(buffer, filename)` → throws `ObjectStorageValidationException` if empty
    - `validateFilename(filename)` → throws `ObjectStorageValidationException` if empty/whitespace
    - _Requirements: 2.2, 3.2, 5.1, 5.2, 5.3, 5.4, 4.4, 4.5_

  - [x] 2.3 Create `S3ClientFactory` in `src/backend/src/shared/s3/s3-client.factory.ts`
    - Injectable NestJS service that creates and caches an `S3Client` instance
    - Read `region` and `endpoint` from `ConfigService`
    - Enable `forcePathStyle: true` only when `endpoint` is defined (LocalStack/MinIO)
    - Cache the client instance (singleton behavior)
    - _Requirements: 1.4_

  - [x] 2.4 Create barrel export `src/backend/src/shared/s3/index.ts`
    - Re-export `S3ClientFactory`, all exceptions, and all utility functions
    - _Requirements: N/A (project structure)_

- [x] 3. Checkpoint — Verify shared infrastructure compiles
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement property-listings ObjectStorageAdapter with real S3
  - [x] 4.1 Replace stub in `src/backend/modules/property-listings/infrastructure/adapters/object-storage.adapter.ts`
    - Inject `S3ClientFactory` and `ConfigService`
    - In `uploadPhoto()`: validate buffer, filename, and mimeType ∈ `{image/jpeg, image/png, image/webp}`
    - Generate object key with prefix `listings` using `generateObjectKey()`
    - Execute `PutObjectCommand` with `ContentType` set to `mimeType`
    - Return URL via `buildObjectUrl()`
    - Map S3 SDK errors to custom exceptions (network → `ObjectStorageException`, 403 → `ObjectStorageCredentialsException`, NoSuchBucket → `ObjectStorageBucketNotFoundException`)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1_

  - [x] 4.2 Update `PropertyListingsModule` to provide `S3ClientFactory`
    - Import `S3ClientFactory` into the module providers so it can be injected into the adapter
    - _Requirements: 2.1_

  - [ ]* 4.3 Write unit tests for `ObjectStorageAdapter` in `src/backend/modules/property-listings/infrastructure/adapters/object-storage.adapter.spec.ts`
    - Mock `S3ClientFactory.getClient()` and `S3Client.send()`
    - Test: successful upload returns correct URL format
    - Test: `ContentType` header is passed correctly to `PutObjectCommand`
    - Test: rejects empty buffer without calling S3
    - Test: rejects empty/whitespace filename without calling S3
    - Test: rejects invalid MIME type (e.g. `application/pdf`) without calling S3
    - Test: network error maps to `ObjectStorageException`
    - Test: 403 error maps to `ObjectStorageCredentialsException`
    - Test: NoSuchBucket maps to `ObjectStorageBucketNotFoundException`
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Implement contracts ContractObjectStorageAdapter with real S3
  - [x] 5.1 Replace stub in `src/backend/modules/contracts/infrastructure/adapters/object-storage.adapter.ts`
    - Inject `S3ClientFactory` and `ConfigService`
    - In `uploadFile()`: validate buffer, filename, and mimeType === `application/pdf`
    - Generate object key with prefix `contracts` using `generateObjectKey()`
    - Execute `PutObjectCommand` with `ContentType` set to `mimeType`
    - Return URL via `buildObjectUrl()`
    - Map S3 SDK errors to custom exceptions (same mapping as property-listings adapter)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.2_

  - [x] 5.2 Update `ContractsModule` to provide `S3ClientFactory`
    - Import `S3ClientFactory` into the module providers so it can be injected into the adapter
    - _Requirements: 3.1_

  - [ ]* 5.3 Write unit tests for `ContractObjectStorageAdapter` in `src/backend/modules/contracts/infrastructure/adapters/object-storage.adapter.spec.ts`
    - Mock `S3ClientFactory.getClient()` and `S3Client.send()`
    - Test: successful upload returns correct URL format
    - Test: `ContentType` header is passed correctly to `PutObjectCommand`
    - Test: rejects empty buffer without calling S3
    - Test: rejects non-PDF MIME type (e.g. `image/jpeg`) without calling S3
    - Test: error mapping (network, 403, NoSuchBucket)
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3_

- [x] 6. Checkpoint — Verify adapters compile and unit tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Write property-based tests for correctness properties
  - [ ]* 7.1 Write property test: Object Key format invariant
    - **Property 1: Invariante de formato de Object Key**
    - **Validates: Requirements 2.2, 3.2, 5.1, 5.2, 5.3**
    - File: `src/backend/src/shared/s3/object-key.utils.property.spec.ts`
    - Use `fc.constantFrom('listings', 'contracts')` × `fc.string({ minLength: 1 })` filtered to exclude `/`
    - Assert output matches `{prefix}/{timestamp}-{uuid}-{filename}` regex pattern
    - Minimum 100 iterations

  - [ ]* 7.2 Write property test: Object URL format
    - **Property 2: Formato de URL de objeto**
    - **Validates: Requirements 2.3, 3.3**
    - File: `src/backend/src/shared/s3/object-key.utils.property.spec.ts`
    - Use `fc.string({ minLength: 1 })` × 3 for bucket, region, key (filtered no whitespace-only)
    - Assert output matches `https://{bucket}.s3.{region}.amazonaws.com/{key}`
    - Minimum 100 iterations

  - [ ]* 7.3 Write property test: MIME type rejection
    - **Property 3: Rechazo de MIME types no permitidos**
    - **Validates: Requirements 2.5, 3.5**
    - File: `src/backend/src/shared/s3/object-key.utils.property.spec.ts`
    - Use `fc.string()` filtered to exclude allowed MIME sets
    - Assert validation throws `ObjectStorageValidationException`
    - Minimum 100 iterations

  - [ ]* 7.4 Write property test: Empty/whitespace filename rejection
    - **Property 4: Rechazo de filenames vacíos o solo whitespace**
    - **Validates: Requirements 4.5**
    - File: `src/backend/src/shared/s3/object-key.utils.property.spec.ts`
    - Use `fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'))` + `fc.constant('')`
    - Assert `validateFilename()` throws `ObjectStorageValidationException`
    - Minimum 100 iterations

  - [ ]* 7.5 Write property test: Object Key round-trip
    - **Property 5: Round-trip de Object Key (parse ↔ reconstruct)**
    - **Validates: Requirements 5.4**
    - File: `src/backend/src/shared/s3/object-key.utils.property.spec.ts`
    - Generate key via `generateObjectKey()`, parse with `parseObjectKey()`, reconstruct and assert equality
    - Minimum 100 iterations

- [ ] 8. Write unit tests for S3ClientFactory
  - [ ]* 8.1 Write unit tests for `S3ClientFactory` in `src/backend/src/shared/s3/s3-client.factory.spec.ts`
    - Test: creates client with configured region
    - Test: uses custom endpoint with `forcePathStyle: true` when endpoint is defined
    - Test: omits endpoint config when endpoint is empty/undefined
    - Test: caches client instance (returns same reference on second call)
    - _Requirements: 1.2, 1.3, 1.4_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 5 universal correctness properties from the design document using `fast-check` (already in devDependencies)
- Unit tests for adapters mock the S3 SDK to avoid real AWS calls
- The existing port interfaces (`IObjectStorage`) in both modules remain unchanged — only the adapter implementations change
