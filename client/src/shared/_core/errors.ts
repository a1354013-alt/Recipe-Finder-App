/**
 * Base HTTP error class with status code.
 * Throw this from route handlers to send specific HTTP errors.
 */
export class HttpError extends Error {
  public code?: string;
  
  constructor(
    public statusCode: number,
    message: string,
    code?: string
  ) {
    super(message);
    this.name = "HttpError";
    this.code = code;
  }
}

// Convenience constructors
export const BadRequestError = (msg: string, code?: string) => new HttpError(400, msg, code);
export const UnauthorizedError = (msg: string, code?: string) => new HttpError(401, msg, code);
export const ForbiddenError = (msg: string, code?: string) => new HttpError(403, msg, code);
export const NotFoundError = (msg: string, code?: string) => new HttpError(404, msg, code);
