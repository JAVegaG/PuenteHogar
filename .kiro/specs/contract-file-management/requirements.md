# Requirements Document

## Introduction

This feature replaces the placeholder S3 file handling in the contracts module with real file upload, storage, and retrieval. Currently, when a landlord creates a contract, the frontend generates a fake URL and the `ContractObjectStorageAdapter` is never invoked with the actual file bytes — the PDF is selected locally but never uploaded. This feature closes that gap by implementing real S3 upload during contract creation, enabling PDF download from the contract detail page, allowing landlords to replace the PDF on PENDING contracts, and adding contract deletion with status-based guards.

## Glossary

- **Platform**: The web-based rental management system (frontend + backend)
- **Contracts_API**: The NestJS backend controller handling contract operations at `/contracts`
- **Contract_Wizard**: The existing multi-step form component (StepTenant, StepTerms, StepDocument) for creating contracts
- **Contract_Detail_Page**: The Next.js frontend page at `/mis-contratos/[id]` that shows contract details
- **Contracts_Service**: The frontend service module (`contractService`) that communicates with the Contracts_API
- **ObjectStorageAdapter**: The `ContractObjectStorageAdapter` infrastructure adapter that uploads files to S3 via `S3ClientFactory`. A parallel `ObjectStorageAdapter` exists in the `property-listings` module for photo uploads — both share the same `@src/shared/s3` utilities (`S3ClientFactory`, `generateObjectKey`, `buildObjectUrl`, `validateBuffer`, `validateFilename`, exception classes). The only differences are allowed MIME types and S3 key prefix (`contracts` vs `listings`). The design phase should evaluate whether to consolidate into a single configurable shared adapter or keep them separate per module.
- **Landlord**: An authenticated user with the LANDLORD role who owns the portfolio and its contracts
- **Contract**: A `Contract` record in the `contracts` schema, linked to a lease, with status tracking and file attachments
- **Contract_File**: A `File` record in the `contracts` schema associated with a contract, storing the S3 URL of the uploaded PDF
- **Confirmation_Dialog**: A modal UI component that requires explicit user confirmation before executing a destructive action
- **PENDING**: Contract status indicating the contract has been uploaded but no signing process has been initiated
- **SIGNATURE_PENDING**: Contract status indicating the signing process has been initiated and at least one party has signed
- **SIGNED**: Contract status indicating all parties have signed the contract

## Requirements

### Requirement 1: Real S3 File Upload During Contract Creation

**User Story:** As a landlord, I want the contract PDF I select during contract creation to be uploaded to S3 and stored with a real URL, so that the document is actually persisted and retrievable.

#### Acceptance Criteria

1. WHEN the landlord submits the contract creation form with a selected PDF file, THE Contract_Wizard SHALL upload the file to the Contracts_API as a multipart form request containing the PDF binary data, lease ID, start date, end date, file size, and MIME type
2. WHEN the Contracts_API receives a contract creation request with a PDF file, THE Contracts_API SHALL pass the file buffer to the ObjectStorageAdapter for upload to S3 and store the returned S3 URL in the Contract_File record
3. WHEN the ObjectStorageAdapter uploads a file to S3, THE ObjectStorageAdapter SHALL generate a unique object key using the `contracts` prefix and the original filename, and return the full S3 URL
4. IF the file MIME type is not `application/pdf`, THEN THE Contracts_API SHALL return a 422 Unprocessable Entity response with the message "Solo se permiten archivos PDF"
5. IF the file size exceeds 10 MB, THEN THE Contracts_API SHALL return a 422 Unprocessable Entity response with the message "El archivo no puede superar 10 MB"
6. IF the S3 upload fails due to a credentials error, THEN THE Contracts_API SHALL return a 502 Bad Gateway response with a storage configuration error message
7. IF the S3 upload fails due to a missing bucket, THEN THE Contracts_API SHALL return a 502 Bad Gateway response with a bucket not found error message
8. IF the S3 upload fails due to a general communication error, THEN THE Contracts_API SHALL return a 502 Bad Gateway response with a generic storage error message
9. WHEN the contract is created successfully, THE Contracts_API SHALL return the contract summary including a presigned download URL for the uploaded file
10. THE Contracts_API SHALL log a `CONTRACT_UPLOADED` audit event with the contract ID and the landlord user ID after successful creation

### Requirement 2: Contract PDF Download

**User Story:** As a landlord, I want to download the contract PDF from the contract detail page, so that I can review or print the actual document.

#### Acceptance Criteria

1. WHEN the landlord navigates to the Contract_Detail_Page, THE Contract_Detail_Page SHALL display a download link pointing to a time-limited presigned URL generated by the backend
2. WHEN the landlord taps the download link, THE Platform SHALL open the PDF file in a new browser tab using the presigned URL
3. THE Contracts_API SHALL include a presigned file URL (not the raw S3 object key) in the contract summary response returned by `GET /contracts/:id`
4. THE presigned URL SHALL expire after 15 minutes; if the landlord needs to download again after expiry, refreshing the contract detail page SHALL generate a new presigned URL
5. WHEN a user who is NOT a party of the contract requests `GET /contracts/:id`, THE Contracts_API SHALL return a 403 Forbidden response — the presigned URL is never generated for unauthorized users
6. THE S3 bucket SHALL store contract files with private ACL — direct S3 URLs SHALL NOT be publicly accessible

### Requirement 3: Edit Contract File (Replace PDF) When PENDING

**User Story:** As a landlord, I want to replace the uploaded PDF on a contract that is still PENDING, so that I can correct mistakes before any signing happens.

#### Acceptance Criteria

1. WHEN a PUT request with a new PDF file is sent to `/contracts/:id/file` for a contract with status PENDING, THE Contracts_API SHALL upload the new file to S3 via the ObjectStorageAdapter, update the Contract_File record with the new S3 URL, and return the updated contract summary
2. WHEN a PUT request is sent to `/contracts/:id/file` for a contract with status SIGNATURE_PENDING, THE Contracts_API SHALL return a 409 Conflict response with the message "No se puede reemplazar el archivo de un contrato en proceso de firma"
3. WHEN a PUT request is sent to `/contracts/:id/file` for a contract with status SIGNED, THE Contracts_API SHALL return a 409 Conflict response with the message "No se puede reemplazar el archivo de un contrato firmado"
4. WHEN a PUT request is sent to `/contracts/:id/file` by a user who is not the landlord party of the contract, THE Contracts_API SHALL return a 403 Forbidden response
5. IF the replacement file MIME type is not `application/pdf`, THEN THE Contracts_API SHALL return a 422 Unprocessable Entity response
6. IF the replacement file size exceeds 10 MB, THEN THE Contracts_API SHALL return a 422 Unprocessable Entity response
7. WHEN the contract status is PENDING, THE Contract_Detail_Page SHALL display a "Reemplazar documento" button
8. WHEN the landlord taps the "Reemplazar documento" button, THE Contract_Detail_Page SHALL open a file picker restricted to PDF files
9. WHEN the landlord selects a new PDF file, THE Contract_Detail_Page SHALL upload the file to `PUT /contracts/:id/file` and update the download link with the new URL upon success
10. IF the file replacement request fails, THEN THE Contract_Detail_Page SHALL display an error message and preserve the current contract state
11. THE Contracts_API SHALL log a `CONTRACT_FILE_REPLACED` audit event with the contract ID and the landlord user ID after successful file replacement

### Requirement 4: Delete Contract When PENDING

**User Story:** As a landlord, I want to delete a contract that is still PENDING, so that I can discard it entirely and start over if needed.

#### Acceptance Criteria

1. WHEN a DELETE request is sent to `/contracts/:id` for a contract with status PENDING, THE Contracts_API SHALL delete the contract, its associated parties, its associated files, and return a 200 OK response
2. WHEN a DELETE request is sent to `/contracts/:id` by a user who is not the landlord party of the contract, THE Contracts_API SHALL return a 403 Forbidden response
3. WHEN a DELETE request is sent to `/contracts/:id` for a non-existent contract, THE Contracts_API SHALL return a 404 Not Found response
4. WHEN the contract status is PENDING, THE Contract_Detail_Page SHALL display a "Eliminar contrato" button
5. WHEN the landlord taps the "Eliminar contrato" button, THE Contract_Detail_Page SHALL display a Confirmation_Dialog asking the landlord to confirm the deletion
6. WHEN the landlord confirms the deletion in the Confirmation_Dialog, THE Contract_Detail_Page SHALL send a DELETE request to `/contracts/:id` and navigate to `/mis-contratos` upon success
7. WHEN the landlord cancels the Confirmation_Dialog, THE Contract_Detail_Page SHALL close the dialog without making any changes
8. IF the delete request fails, THEN THE Contract_Detail_Page SHALL display an error message and keep the contract detail view visible
9. THE Contracts_API SHALL log a `CONTRACT_DELETED` audit event with the contract ID and the landlord user ID after successful deletion

### Requirement 5: Delete Contract When SIGNATURE_PENDING (Landlord-Only Signed)

**User Story:** As a landlord, I want to delete a contract where only I have signed and the tenant has not yet signed, so that I can correct the contract before the tenant commits.

#### Acceptance Criteria

1. WHEN a DELETE request is sent to `/contracts/:id` for a contract with status SIGNATURE_PENDING where only the landlord party has a completed signing record, THE Contracts_API SHALL delete the contract, its associated parties, signings, and files, and return a 200 OK response
2. WHEN a DELETE request is sent to `/contracts/:id` for a contract with status SIGNATURE_PENDING where the tenant party also has a completed signing record, THE Contracts_API SHALL return a 409 Conflict response with the message "No se puede eliminar un contrato que ya fue firmado por ambas partes"
3. WHEN a DELETE request is sent to `/contracts/:id` by a user who is not the landlord party of the contract, THE Contracts_API SHALL return a 403 Forbidden response
4. WHEN the contract status is SIGNATURE_PENDING and only the landlord has signed, THE Contract_Detail_Page SHALL display a "Eliminar contrato" button
5. WHEN the contract status is SIGNATURE_PENDING and both parties have signed, THE Contract_Detail_Page SHALL NOT display a "Eliminar contrato" button
6. WHEN the landlord taps the "Eliminar contrato" button on a SIGNATURE_PENDING contract, THE Contract_Detail_Page SHALL display a Confirmation_Dialog asking the landlord to confirm the deletion
7. WHEN the landlord confirms the deletion, THE Contract_Detail_Page SHALL send a DELETE request to `/contracts/:id` and navigate to `/mis-contratos` upon success
8. IF the delete request returns a 409 Conflict, THEN THE Contract_Detail_Page SHALL display a message explaining that the contract cannot be deleted because both parties have signed

### Requirement 6: Prevent Deletion of Signed Contracts

**User Story:** As a landlord, I want the platform to prevent deletion of fully signed contracts, so that legally binding documents are preserved.

#### Acceptance Criteria

1. WHEN a DELETE request is sent to `/contracts/:id` for a contract with status SIGNED, THE Contracts_API SHALL return a 409 Conflict response with the message "No se puede eliminar un contrato firmado"
2. WHEN the contract status is SIGNED, THE Contract_Detail_Page SHALL NOT display a "Eliminar contrato" button
3. WHEN the contract status is SIGNED, THE Contract_Detail_Page SHALL NOT display a "Reemplazar documento" button

### Requirement 7: Multipart File Upload Endpoint

**User Story:** As a developer, I want the contract creation endpoint to accept multipart form data with the actual PDF file, so that the backend can upload the file to S3 instead of receiving a pre-generated URL.

#### Acceptance Criteria

1. THE Contracts_API SHALL accept `POST /contracts` requests with `multipart/form-data` content type containing a `file` field (PDF binary), `leaseId` field, `startDate` field, and optional `endDate` field
2. THE Contracts_API SHALL validate that the `file` field contains a non-empty PDF file before processing
3. THE Contracts_API SHALL extract the file buffer, original filename, file size, and MIME type from the multipart request
4. THE Contracts_API SHALL reject requests where the `file` field is missing with a 422 Unprocessable Entity response
5. THE Contracts_API SHALL accept `PUT /contracts/:id/file` requests with `multipart/form-data` content type containing a `file` field (PDF binary) for file replacement
6. THE Contracts_Service SHALL send contract creation requests as `multipart/form-data` instead of JSON, including the PDF file binary
7. THE Contracts_Service SHALL send file replacement requests as `multipart/form-data` to `PUT /contracts/:id/file`

### Requirement 8: Frontend File Upload in Contract Wizard

**User Story:** As a landlord, I want the contract wizard to actually upload my selected PDF file when I submit the form, so that the real document is stored and not a placeholder.

#### Acceptance Criteria

1. WHEN the landlord selects a PDF file in the StepDocument component, THE Contract_Wizard SHALL retain the File object in memory for submission
2. WHEN the landlord submits the contract creation form, THE Contract_Wizard SHALL construct a FormData object containing the PDF file, lease ID, start date, and optional end date
3. WHEN the contract creation request is in progress, THE Contract_Wizard SHALL display a loading state on the submit button with the text "Subiendo contrato..."
4. WHEN the contract is created successfully, THE Contract_Wizard SHALL navigate the landlord to the contract detail page for the new contract
5. IF the upload fails due to a file validation error (422), THEN THE Contract_Wizard SHALL display the validation error message from the server
6. IF the upload fails due to a storage error (502), THEN THE Contract_Wizard SHALL display a message indicating a temporary storage problem and suggest retrying
