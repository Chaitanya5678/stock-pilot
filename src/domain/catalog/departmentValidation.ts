import { ValidationError } from "@/domain/errors";

export interface DepartmentInput {
  name: string;
}

export interface NormalizedDepartmentInput {
  name: string;
}

/** docs/BUSINESS_RULES.md §11: department name required, <=40 chars, unique (case-insensitive). */
export function validateDepartmentInput(input: DepartmentInput): NormalizedDepartmentInput {
  const name = input.name.trim();
  if (!name || name.length > 40) {
    throw new ValidationError("Department name must be between 1 and 40 characters");
  }
  return { name };
}
