import { NextFunction, Request, Response } from "express";

type AsyncFunction = (
    req: Request,
    res: Response,
    next: NextFunction
) => Promise<void>;  

const asyncHandler = (requestHandler: AsyncFunction) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Wrap the asynchronous function and handle promise rejections
        Promise.resolve(requestHandler(req, res, next)).catch((err) => {
            // Log the error (adjust based on your logging strategy)
            console.error("AsyncHandler Error:", err);
            // Forward the error to Express's next function
            next(err);
        });
    };
}

export { asyncHandler };
