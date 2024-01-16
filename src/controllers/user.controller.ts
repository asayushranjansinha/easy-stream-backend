import { NextFunction, Request, Response } from 'express';

import User from '../models/user.model'


import { asyncHandler } from "../utils/asyncHandler";
import { uploadOnCloudinary } from "../utils/cloudinary";

import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

const registerUser = asyncHandler(async (req: Request, res: Response) => {
    // Extracting user information from request body
    const { username, email, fullname, password } = req.body;

    // Checking if any required field is empty
    if ([fullname, email, username, password].some((field) => (field?.trim() === ''))) {
        throw new ApiError(400, "All fields are required");
    }

    // Checking if a user with the provided email or username already exists
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    // Extracting files information from request
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Extracting local paths for avatar and cover image
    const avatarLocalPath = files?.avatar?.[0]?.path;
    const coverImageLocalPath = files?.coverImage?.[0]?.path;

    // Checking if avatar local path is available
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }
    console.log('Avatar Local Path:', avatarLocalPath);

    // Uploading avatar and cover image to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath, "Avatar");
    const coverImage = await uploadOnCloudinary(coverImageLocalPath, "Cover Image");

    // Checking if avatar upload was successful
    if (!avatar) {
        throw new ApiError(400, "Avatar upload failed");
    }

    // Creating a new user with the provided information
    const user = await User.create({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password,
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || ''
    });

    // Fetching the created user excluding sensitive information
    const createdUser = await User.findById(user._id)
        .select("-password -refreshToken");

    // Checking if user creation was successful
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user");
    }

    // Sending a success response with the created user information
    res.status(201).json({
        ApiResponse: new ApiResponse(200, createdUser, "User registered successfully")
    });
});

export { registerUser }