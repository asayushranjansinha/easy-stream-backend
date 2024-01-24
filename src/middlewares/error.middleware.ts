import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

function errorHandlerMiddleware(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (error instanceof ApiError) {
        const { statusCode, message, errors } = error;
        return res.status(statusCode).json({
            success: false,
            message,
            errors,
        });
    } else {
        // Handle other types of errors
        console.error('Unhandled error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            errors: [],
        });
    }
}

export { errorHandlerMiddleware };
