/**
 * Base exception for generic S3 / network errors.
 * Thrown when the S3 service returns a network error or HTTP 5xx.
 */
export class ObjectStorageException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ObjectStorageException';
    }
}

/**
 * Thrown when S3 returns HTTP 403 (AccessDenied),
 * indicating a credentials configuration problem.
 */
export class ObjectStorageCredentialsException extends ObjectStorageException {
    constructor(message: string) {
        super(message);
        this.name = 'ObjectStorageCredentialsException';
    }
}

/**
 * Thrown when S3 returns NoSuchBucket,
 * indicating the configured bucket does not exist.
 */
export class ObjectStorageBucketNotFoundException extends ObjectStorageException {
    constructor(message: string) {
        super(message);
        this.name = 'ObjectStorageBucketNotFoundException';
    }
}

/**
 * Thrown for local validation failures before any S3 call
 * (e.g. empty buffer, invalid filename, disallowed MIME type).
 */
export class ObjectStorageValidationException extends ObjectStorageException {
    constructor(message: string) {
        super(message);
        this.name = 'ObjectStorageValidationException';
    }
}
