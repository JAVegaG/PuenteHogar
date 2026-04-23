# Implementation Plan: Contract File Management

## Overview

Replace the placeholder S3 file handling in the contracts module with real file upload, presigned URL download, file replacement, and contract deletion. Changes span backend (NestJS controller, use cases, repository, adapter), frontend service (`contractService`), and frontend UI (`ContractWizard`, `ContractDetailView`). Each task builds incrementally — backend ports/interfaces first, then use cases, then controller wiring, then frontend service, then UI.

## Tasks

- [x] 1. Extend backend ports, DTOs, and install presigned URL dependency
  - [x] 1.1 Install `@aws-sdk/s3-request-presigner` package in `src/backend`
    - Run `npm install @aws-sdk/s3-request-presigner` in `src/backend`
    - _Requirements: 2.3, 2.4_

  - [x] 1.2 Extend `IObjectStorage` port with `getPresignedUrl` method
    - Add `getPresignedUrl(objectKey: string, expiresInSeconds?: number): Promise<string>` to `src/backend/modules/contracts/domain/ports/object-storage.port.ts`
    - _Requirements: 2.3, 2.4_

  - [x] 1.3 Extend `IContractRepository` port with new methods
    - Add `updateFileUrl(contractId: string, newFileUrl: string): Promise<ContractEntity>` to `src/backend/modules/contracts/domain/ports/contract-repository.port.ts`
    - Add `deleteContract(contractId: string): Promise<void>`
    - Add `findSigningsByContractId(contractId: string): Promise<SigningInfo[]>` with `SigningInfo` type `{ contractPartyId: string; role: string; signingStatusName: string }`
    - _Requirements: 3.1, 4.1, 5.1_

  - [x] 1.4 Create `CreateContractDto` for multipart form fields
    - Create `src/backend/modules/contracts/application/dtos/create-contract.dto.ts` with `leaseId`, `startDate`, `endDate?` fields
    - Use `class-validator` decorators and `@ApiProperty` / `@ApiPropertyOptional`
    - This replaces `UploadContractDto` for the multipart endpoint
    - _Requirements: 7.1_

  - [x] 1.5 Add `SigningDetailDto` and extend `ContractSummaryDto` with `signingDetails`
    - Create `SigningDetailDto` with `role: string` and `hasSigned: boolean` in `src/backend/modules/contracts/application/dtos/contract-summary.dto.ts`
    - Add optional `signingDetails?: SigningDetailDto[]` field to `ContractSummaryDto`
    - _Requirements: 5.4, 5.5_

- [x] 2. Implement `ContractObjectStorageAdapter.getPresignedUrl()` and modify `uploadFile` return
  - [x] 2.1 Implement `getPresignedUrl` in `ContractObjectStorageAdapter`
    - Import `GetObjectCommand` from `@aws-sdk/client-s3` and `getSignedUrl` from `@aws-sdk/s3-request-presigner`
    - Implement `getPresignedUrl(objectKey, expiresInSeconds = 900)` that creates a `GetObjectCommand` and calls `getSignedUrl(client, command, { expiresIn })`
    - Update `src/backend/modules/contracts/infrastructure/adapters/object-storage.adapter.ts`
    - _Requirements: 2.3, 2.4_

  - [x] 2.2 Modify `uploadFile` to return S3 object key instead of full URL
    - Change `uploadFile` to return the generated object key (from `generateObjectKey`) instead of `buildObjectUrl()`
    - The presigned URL will be generated at read time by `GetContractSummaryUseCase`
    - _Requirements: 1.2, 1.3_

  - [ ]* 2.3 Write property test: Object key generation preserves filename and uses correct prefix (Property 1)
    - **Property 1: Object key generation preserves filename and uses correct prefix**
    - Generate random valid filenames with `fast-check`, call `generateObjectKey('contracts', filename)`, verify key starts with `contracts/`, call `parseObjectKey` and verify recovered filename matches
    - Create test file at `src/backend/modules/contracts/application/use-cases/object-key.property.spec.ts`
    - **Validates: Requirements 1.3**

- [x] 3. Implement repository methods
  - [x] 3.1 Implement `updateFileUrl` in `PrismaContractRepository`
    - Find the `File` record associated with the contract, update its `file_url` field with the new S3 object key
    - Return the updated `ContractEntity`
    - _Requirements: 3.1_

  - [x] 3.2 Implement `deleteContract` in `PrismaContractRepository`
    - Use a Prisma `$transaction` to cascade delete: `SigningLog` → `Signing` → `File` → `ContractParty` → `ContractsRaw` (related) → `Contract`
    - _Requirements: 4.1, 5.1_

  - [x] 3.3 Implement `findSigningsByContractId` in `PrismaContractRepository`
    - Query `ContractParty` → `Signing` → `SigningStatus` for the given contract
    - Return array of `{ contractPartyId, role, signingStatusName }`
    - _Requirements: 5.1, 5.2_

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Modify `UploadContractUseCase` for real S3 upload
  - [x] 5.1 Refactor `UploadContractUseCase.execute()` to accept file buffer
    - Change signature to accept `file: { buffer: Buffer; originalname: string; size: number; mimetype: string }` and `dto: CreateContractDto` (without `fileUrl`)
    - Inject `CONTRACT_OBJECT_STORAGE` (`IObjectStorage`) into the use case
    - Validate MIME type (`application/pdf`) and file size (≤ 10 MB) from the file object
    - Call `this.objectStorage.uploadFile(file.buffer, file.originalname, file.mimetype)` to get the S3 object key
    - Store the object key (not full URL) in the `File` record via `repository.create()`
    - Catch `ObjectStorage*Exception` types and translate to appropriate HTTP exceptions (422 for validation, 502 for infrastructure)
    - Log `CONTRACT_UPLOADED` audit event
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

  - [ ]* 5.2 Write property test: Non-PDF MIME types are always rejected (Property 2)
    - **Property 2: Non-PDF MIME types are always rejected**
    - Generate random MIME type strings that are NOT `application/pdf` with `fast-check`, call the validation logic, verify rejection with `UnprocessableEntityException`
    - Create test file at `src/backend/modules/contracts/application/use-cases/upload-contract.property.spec.ts`
    - **Validates: Requirements 1.4, 3.5**

  - [ ]* 5.3 Write property test: Files exceeding 10 MB are always rejected (Property 3)
    - **Property 3: Files exceeding 10 MB are always rejected**
    - Generate random file sizes > 10,485,760 with `fast-check`, call the validation logic, verify rejection with `UnprocessableEntityException`
    - Add to `src/backend/modules/contracts/application/use-cases/upload-contract.property.spec.ts`
    - **Validates: Requirements 1.5, 3.6**

- [x] 6. Implement `ReplaceContractFileUseCase`
  - [x] 6.1 Create `ReplaceContractFileUseCase`
    - Create `src/backend/modules/contracts/application/use-cases/replace-contract-file.use-case.ts`
    - Inject `CONTRACT_REPOSITORY`, `CONTRACT_OBJECT_STORAGE`, `AuditLoggerService`
    - Validate: contract exists, user is LANDLORD party, status is `PENDING`, file is valid PDF ≤ 10 MB
    - Upload new file to S3 via `objectStorage.uploadFile()`, update `File` record via `repository.updateFileUrl()`
    - Return updated `ContractSummaryDto` with presigned URL
    - Catch and translate `ObjectStorage*Exception` types
    - Log `CONTRACT_FILE_REPLACED` audit event
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.11_

  - [ ]* 6.2 Write property test: File replacement rejected for non-PENDING contracts (Property 4)
    - **Property 4: File replacement is rejected for any non-PENDING contract**
    - Generate contracts with status `SIGNATURE_PENDING` or `SIGNED`, call replace logic, verify 409 Conflict
    - Create test file at `src/backend/modules/contracts/application/use-cases/replace-contract-file.property.spec.ts`
    - **Validates: Requirements 3.2, 3.3, 6.3**

  - [ ]* 6.3 Write property test: Non-landlord users rejected for modifications (Property 5)
    - **Property 5: Non-landlord users are rejected for contract modifications**
    - Generate random user IDs that don't match the landlord party, call replace/delete logic, verify 403 Forbidden
    - Add to `src/backend/modules/contracts/application/use-cases/replace-contract-file.property.spec.ts`
    - **Validates: Requirements 3.4, 4.2, 5.3**

- [x] 7. Implement `DeleteContractUseCase`
  - [x] 7.1 Create `DeleteContractUseCase`
    - Create `src/backend/modules/contracts/application/use-cases/delete-contract.use-case.ts`
    - Inject `CONTRACT_REPOSITORY`, `AuditLoggerService`
    - Validate: contract exists (404 if not), user is LANDLORD party (403 if not)
    - Status guards: `PENDING` → allow; `SIGNATURE_PENDING` → query signings, allow only if tenant has no `COMPLETED` signing; `SIGNED` → reject 409
    - Call `repository.deleteContract(contractId)` in transaction
    - Log `CONTRACT_DELETED` audit event
    - Return `{ message: 'Contrato eliminado exitosamente' }`
    - _Requirements: 4.1, 4.2, 4.3, 4.9, 5.1, 5.2, 5.3, 6.1_

  - [ ]* 7.2 Write property test: Deletion guard based on status and signing state (Property 6)
    - **Property 6: Contract deletion guard based on status and signing state**
    - Generate all combinations of contract status × signing state (PENDING, SIGNATURE_PENDING with landlord-only signed, SIGNATURE_PENDING with both signed, SIGNED), call delete logic, verify allowed/rejected matches the rule
    - Create test file at `src/backend/modules/contracts/application/use-cases/delete-contract.property.spec.ts`
    - **Validates: Requirements 4.1, 5.1, 5.2, 6.1**

- [x] 8. Modify `GetContractSummaryUseCase` for presigned URLs and signing details
  - [x] 8.1 Update `GetContractSummaryUseCase` to generate presigned URLs
    - Inject `CONTRACT_OBJECT_STORAGE` (`IObjectStorage`) into the use case
    - After fetching the contract, call `objectStorage.getPresignedUrl(contract.fileUrl)` to generate a time-limited download URL
    - Set the presigned URL in `ContractSummaryDto.fileUrl` instead of the raw S3 object key
    - _Requirements: 2.1, 2.3, 2.4_

  - [x] 8.2 Add `signingDetails` to `GetContractSummaryUseCase` response
    - Call `repository.findSigningsByContractId(contractId)` to get per-party signing status
    - Map to `SigningDetailDto[]` where `hasSigned = signingStatusName === 'COMPLETED'`
    - Include in the returned `ContractSummaryDto`
    - _Requirements: 5.4, 5.5_

  - [ ]* 8.3 Write property test: Presigned URLs only generated for contract parties (Property 7)
    - **Property 7: Presigned URLs are only generated for contract parties**
    - Generate random user IDs that are NOT in the contract's parties, call `GetContractSummaryUseCase.execute()`, verify 403 Forbidden and no presigned URL generation
    - Create test file at `src/backend/modules/contracts/application/use-cases/get-contract-summary.property.spec.ts`
    - **Validates: Requirements 2.5**

- [x] 9. Update `ContractsController` with multipart and new endpoints
  - [x] 9.1 Modify `POST /contracts` to accept multipart/form-data
    - Add `@UseInterceptors(FileInterceptor('file'))` from `@nestjs/platform-express`
    - Accept `@UploadedFile() file: Express.Multer.File` and `@Body() dto: CreateContractDto`
    - Validate file is present (422 if missing)
    - Pass file object and dto to `UploadContractUseCase.execute()`
    - Update Swagger decorators for multipart
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 9.2 Add `PUT /contracts/:id/file` endpoint for file replacement
    - Add `@UseInterceptors(FileInterceptor('file'))` with `@UploadedFile()` and `@Param('id')`
    - Validate file is present (422 if missing)
    - Call `ReplaceContractFileUseCase.execute(id, file, userId)`
    - Add Swagger decorators: `@ApiOperation`, `@ApiOkResponse`, `@ApiConflictResponse`, `@ApiForbiddenResponse`, `@ApiUnprocessableEntityResponse`
    - _Requirements: 7.5, 3.1_

  - [x] 9.3 Add `DELETE /contracts/:id` endpoint
    - Call `DeleteContractUseCase.execute(id, userId)`
    - Add Swagger decorators: `@ApiOperation`, `@ApiOkResponse`, `@ApiConflictResponse`, `@ApiForbiddenResponse`, `@ApiNotFoundResponse`
    - _Requirements: 4.1, 5.1, 6.1_

  - [x] 9.4 Register new use cases in `ContractsModule`
    - Add `ReplaceContractFileUseCase` and `DeleteContractUseCase` to providers in `src/backend/modules/contracts/contracts.module.ts`
    - Inject them into `ContractsController` constructor
    - _Requirements: 3.1, 4.1_

- [x] 10. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Update frontend `contractService` for FormData and new endpoints
  - [x] 11.1 Modify `createContract` to send FormData with actual file
    - Change `createContract` to accept `{ file: File; leaseId: string; startDate: string; endDate?: string }` and `token`
    - Build `FormData` with `file`, `leaseId`, `startDate`, `endDate`
    - Send with `fetch` using `multipart/form-data` (omit `Content-Type` header so browser sets boundary)
    - Update `UploadContractRequest` interface accordingly (remove `fileUrl`, `fileSizeBytes`, `mimeType`; add `file: File`)
    - _Requirements: 7.6, 8.2_

  - [x] 11.2 Add `replaceContractFile` method
    - New method: `replaceContractFile(contractId: string, file: File, token: string): Promise<ContractSummary>`
    - Build `FormData` with `file`, send `PUT /contracts/:id/file`
    - Handle error responses (409, 403, 422)
    - _Requirements: 7.7, 3.9_

  - [x] 11.3 Add `deleteContract` method
    - New method: `deleteContract(contractId: string, token: string): Promise<void>`
    - Send `DELETE /contracts/:id`
    - Handle error responses (409, 403, 404)
    - _Requirements: 4.6, 5.7_

  - [x] 11.4 Update `ContractSummary` type with `signingDetails`
    - Add `signingDetails?: Array<{ role: string; hasSigned: boolean }>` to the `ContractSummary` interface
    - _Requirements: 5.4, 5.5_

- [x] 12. Update `ContractWizard` to submit real file via FormData
  - [x] 12.1 Modify `handleSubmit` in `ContractWizard`
    - Replace the placeholder URL logic with a call to the updated `contractService.createContract()` passing `formData.file`
    - Change loading text from "Creando contrato..." to "Subiendo contrato..."
    - Handle 422 errors (show validation message) and 502 errors (show storage error with retry suggestion)
    - Navigate to contract detail page on success
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 13. Update `ContractDetailView` with replace, delete, and presigned URL
  - [x] 13.1 Add "Reemplazar documento" button and file replacement flow
    - Show "Reemplazar documento" button when `status === 'PENDING'`
    - On click, open a file picker restricted to PDF files
    - On file select, call `contractService.replaceContractFile()` and update the download link on success
    - Show error message on failure, preserve current state
    - _Requirements: 3.7, 3.8, 3.9, 3.10_

  - [x] 13.2 Add "Eliminar contrato" button with `ConfirmationDialog`
    - Show "Eliminar contrato" button when `status === 'PENDING'` OR (`status === 'SIGNATURE_PENDING'` AND tenant has not signed, computed from `signingDetails`)
    - Hide button when `status === 'SIGNED'` or both parties have signed
    - On click, open `ConfirmationDialog` with title "Eliminar contrato", message "¿Estás seguro de que deseas eliminar este contrato? Esta acción no se puede deshacer.", confirmLabel "Eliminar"
    - On confirm, call `contractService.deleteContract()` and navigate to `/mis-contratos` on success
    - On cancel, close dialog
    - On 409 error, show explanatory message
    - On other errors, show error message and keep view visible
    - _Requirements: 4.4, 4.5, 4.6, 4.7, 4.8, 5.4, 5.5, 5.6, 5.7, 5.8, 6.2, 6.3_

  - [x] 13.3 Hide "Reemplazar documento" button for non-PENDING statuses
    - Ensure button is not rendered when `status === 'SIGNATURE_PENDING'` or `status === 'SIGNED'`
    - _Requirements: 6.3_

- [x] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 7 universal correctness properties defined in the design
- The S3 object key (not full URL) is stored in `File.file_url`; presigned URLs are generated at read time with 15-min TTL
- The `@aws-sdk/s3-request-presigner` package is required for presigned URL generation
