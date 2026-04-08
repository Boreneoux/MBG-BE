export class AppError extends Error {
  public isOperational = true;

  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
