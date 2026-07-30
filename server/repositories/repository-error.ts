export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}

export function toRepositoryError(error: unknown, fallbackMessage: string) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "PGRST116"
  ) {
    return new RepositoryError("Resource not found.", 404);
  }

  return new RepositoryError(fallbackMessage);
}
