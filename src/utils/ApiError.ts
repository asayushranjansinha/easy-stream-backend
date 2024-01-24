class ApiError extends Error {
  statusCode: number;
  data?: any;
  success?: boolean;
  errors: any[];

  constructor(
    statusCode: number,
    message = "Something went wrong",
    errors: any[] = [],
    stack?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;

    stack ? (this.stack = stack) : Error.captureStackTrace(this, this.constructor);
  }
}

export { ApiError };
