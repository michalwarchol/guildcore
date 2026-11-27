import type {
  FieldValues,
  Path,
  UseFormSetError,
  UseFormSetFocus,
} from 'react-hook-form';
import { ApiError, type FieldName } from '../api/errors';

export function applyApiError<T extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<T>,
  setFocus: UseFormSetFocus<T>,
  order: readonly (FieldName & Path<T>)[],
): void {
  for (const field of order) {
    const message = error.fieldErrors[field];
    if (message) {
      setError(field, { message });
    }
  }
  if (error.formMessage) {
    setError('root', { message: error.formMessage });
  }
  const first = order.find((field) => error.fieldErrors[field]);
  if (first) {
    setFocus(first);
  }
}
