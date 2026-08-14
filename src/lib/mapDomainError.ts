import {
  ValidationError,
  NotFoundError,
  InsufficientStockError,
  ConflictError,
  ForbiddenError,
} from "@/domain/errors";

/**
 * Never let a raw error (DB message, stack trace) reach the browser — map
 * every known domain error to a short user-facing message, and swallow
 * anything else behind a generic one. Shared by every Server Action that
 * wraps an application-layer use case.
 */
export function mapDomainError(error: unknown): string {
  if (
    error instanceof ValidationError ||
    error instanceof NotFoundError ||
    error instanceof InsufficientStockError ||
    error instanceof ConflictError
  ) {
    return error.message;
  }
  if (error instanceof ForbiddenError) {
    return "You do not have permission to perform this action.";
  }
  console.error("Unhandled domain error", error);
  return "Something went wrong. Please try again.";
}
