import { Request, Response } from 'express';

// Models
import UserInstance from '../models/user.model';

// Utilities for handling asynchronous operations
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler";
import { deleteLocalFile } from '../utils/localFileOperations';

// Cloudinary operations
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary";

// Custom error and response handling utilities
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { generateAccessAndRefereshTokens } from '../utils/utils';


const registerUser = asyncHandler(async (req: Request, res: Response) => {
    // Extracting files information from request
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Extracting user information from request body
    const { username, email, fullname, password } = req.body;

    // Extracting local paths for avatar and cover image
    const avatarLocalPath = files?.avatar?.[0]?.path;
    const coverImageLocalPath = files?.coverImage?.[0]?.path;

    // Checking if any required field is empty
    if ([fullname, email, username, password].some((field) => !field || field.trim() === '')) {
        // Delete local files
        if (avatarLocalPath) {
            deleteLocalFile(avatarLocalPath);
        }
        if (coverImageLocalPath) {
            deleteLocalFile(coverImageLocalPath);
        }

        throw new ApiError(400, "All fields are required");
    }

    // Checking if a user with the provided email or username already exists
    const existedUser = await UserInstance.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        // Delete local files
        if (avatarLocalPath) {
            deleteLocalFile(avatarLocalPath);
        }
        if (coverImageLocalPath) {
            deleteLocalFile(coverImageLocalPath);
        }
        throw new ApiError(409, "User with email or username already exists");
    }

    // Checking if avatar local path is available
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }

    // Uploading avatar and cover image to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath, "Avatar");
    const coverImage = await uploadOnCloudinary(coverImageLocalPath, "Cover Image");

    // Checking if avatar upload was successful
    if (!avatar) {
        throw new ApiError(400, "Avatar upload failed");
    }

    // Creating a new user with the provided information
    const user = await UserInstance.create({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password,
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || ''
    });

    // Fetching the created user excluding sensitive information
    const createdUser = await UserInstance.findById(user._id)
        .select("-password -refreshToken");

    // Checking if user creation was successful
    if (!createdUser) {
        // Delete cloudinary images 
        await deleteFromCloudinary(avatar.public_id);

        throw new ApiError(500, "Something went wrong while registering user");
    }

    // Sending a success response with the created user information
    res.status(201).json({
        ApiResponse: new ApiResponse(200, createdUser, "User registered successfully")
    });

});

const loginUser = asyncHandler(async (req: Request, res: Response) => {
    const { email, username, password } = req.body

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await UserInstance.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await UserInstance.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )

})

const logoutUser = asyncHandler(async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            throw new ApiError(401, "Unauthorized request")
        }
        await UserInstance.findByIdAndUpdate(
            userId,
            {
                $unset: {
                    refreshToken: 1
                }
            },
            {
                new: true
            }
        );

        const options = {
            httpOnly: true,
            secure: true
        }

        res
            .status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json(new ApiResponse(200, {}, "User logged Out"))
    } catch (error) {

    }
})

const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET!
        ) as jwt.JwtPayload;

        const user = await UserInstance.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")

        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

        res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: refreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error: any) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

export { registerUser, logoutUser, loginUser ,refreshAccessToken};

