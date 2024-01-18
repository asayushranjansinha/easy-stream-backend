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
import mongoose from 'mongoose';


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
        throw new ApiError(400, "Avatar file is missing")
    }

    // Uploading avatar and cover image to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    // Checking if avatar upload was successful
    if (!avatar) {
        throw new ApiError(400, "Error while uploading avatar")
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
    res.status(201)
        .json(new ApiResponse(200, createdUser, "User registered successfully"));

})

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
        throw new ApiError(500, "Something went wrong while loging out user")
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

const changeCurrentPassword = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user?.id;
        const user = await UserInstance.findById(userId)

        if (!user) {
            throw new ApiError(401, "Unauthorized Access")
        }

        const isPasswordCorrect = await user?.isPasswordCorrect(oldPassword);

        if (!isPasswordCorrect) {
            throw new ApiError(400, "Invalid Password");
        }

        user.password = newPassword;
        user.save({ validateBeforeSave: false })

        res.status(200)
            .json(new ApiResponse(200, {}, "Password changed successfully"))
    } catch (error) {

    }
})


const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user;
    res.status(200)
        .json(new ApiResponse(200, currentUser, "Current User"))
})

const updateAccountDetails = asyncHandler(async (req: Request, res: Response) => {
    const { fullname, email } = req.body;
    if (!fullname || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const userId = req.user?.id;
    const user = await UserInstance.findByIdAndUpdate(
        userId,
        {
            $set: {
                fullname,
                email,
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken")

    res.status(200)
        .json(new ApiResponse(200, user, "User profile updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req: Request, res: Response) => {
    // Extracting files information from request
    const file = req.file as Express.Multer.File;
    const avatarLocalPath = file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    // Uploading avatar and cover image to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath); //todo:to decide whether to make two db calls and get older image url and delete older image from cloudinary

    if (!avatar) {
        throw new ApiError(400, "Error while uploading avatar")
    }


    const userId = req.user?.id
    const user = await UserInstance.findByIdAndUpdate(
        userId,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    )
        .select("-password -refreshToken")

    res.status(200)
        .json(new ApiResponse(200, user, "Avatar changed successfully"))
})


const updateUserCoverImage = asyncHandler(async (req: Request, res: Response) => {
    // Extracting files information from request
    const file = req.file as Express.Multer.File;
    const coverImageLocalPath = file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image file is missing")
    }

    // Uploading avatar and cover image to Cloudinary
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage) {
        throw new ApiError(400, "Error while uploading Cover Image")
    }


    const userId = req.user?.id
    const user = await UserInstance.findByIdAndUpdate(
        userId,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    )
        .select("-password -refreshToken")

    res.status(200)
        .json(new ApiResponse(200, user, "Avatar changed successfully"))
})

const getUserChannelProfile = asyncHandler(async (req: Request, res: Response) => {
    const { username } = req.params;

    // Check if username is provided
    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing");
    }

    // Aggregation pipeline to fetch user's channel profile information
    const channel = await UserInstance.aggregate([
        // Stage 1: Match documents with the specified username
        {
            $match: {
                username: username?.toLocaleLowerCase(),
            },
        },
        // Stage 2: Lookup subscribers of the user's channel
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        // Stage 3: Lookup channels I am subscribed to
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        // Stage 4: Add computed fields - subscribersCount, channelsSubscribedToCount, isSubscribed
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers",
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo",
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?.id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        // Stage 5: Project only the necessary fields
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            },
        },
    ]);

    // Log channel profile information
    console.log("Channel Profile Info: ", channel);

    // Check if the channel exists
    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exist");
    }

    // Send the channel profile information in the response
    res.status(200).json(
        new ApiResponse(200, channel[0], "Channel Profile info fetched successfully")
    );
});

const getUserWatchHistory = asyncHandler(async (req: Request, res: Response) => {
    const user = await UserInstance.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?.id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    res.status(200)
        .json(new ApiResponse(200, user[0].watchHistory, "Watch History fetched successfully"))
})
export {
    registerUser,
    logoutUser,
    loginUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getUserWatchHistory
};

