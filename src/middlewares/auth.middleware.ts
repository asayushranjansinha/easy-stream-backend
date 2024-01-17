import UserInstance from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from 'express';

export const verifyJWT = asyncHandler(async (req: Request, _: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as jwt.JwtPayload;

        const user = await UserInstance
            .findById(decodedToken?._id)
            .select("-password -refreshToken");

        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        req.user = user // here is the error
        next();
    } catch (error: any) {
        throw new ApiError(401, error?.message || "Invalid access token");
    }
});
