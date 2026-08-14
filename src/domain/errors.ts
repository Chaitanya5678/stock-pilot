// Domain-level error types. Application/UI layers translate these into the
// appropriate HTTP status or user-facing message; the domain layer itself
// stays framework-free.

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Input failed validation before any business rule was even evaluated. */
export class ValidationError extends DomainError {}

/** A referenced entity (item, machine, machine unit, user, ...) does not exist. */
export class NotFoundError extends DomainError {}

/** A uniqueness or state constraint was violated (e.g. duplicate SKU/email). */
export class ConflictError extends DomainError {}

/** The requested stock change would violate the non-negative stock invariant. */
export class InsufficientStockError extends DomainError {}

/** The authenticated user's role does not permit the requested operation. */
export class ForbiddenError extends DomainError {}

/** No authenticated user is present. */
export class UnauthenticatedError extends DomainError {}
