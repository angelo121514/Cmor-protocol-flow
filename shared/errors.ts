/** Lee un mensaje de error sin asumir que el valor capturado sea una instancia Error. */
export function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message;
  return typeof error === 'string' ? error : '';
}
