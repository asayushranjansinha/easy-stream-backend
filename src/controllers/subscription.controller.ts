import mongoose, { isValidObjectId } from "mongoose"
import { ApiError } from "../utils/ApiError"
import { ApiResponse } from "../utils/ApiResponse"
import { asyncHandler } from "../utils/asyncHandler"
import UserInstance from "../models/user.model"
import { SubscriptionInstance } from "../models/subscription.model"
import { Request, Response } from "express"

const toggleSubscription = asyncHandler(async (req:Request, res:Response) => {
    // Extractign channel id from request parameter
    const { channelId } = req.params

    // Check if valid or not
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid Request")
    }

    const channel = await UserInstance.findById(channelId);

    if (!channel) {
        throw new ApiError(404, "Channel not found")
    }

    // Check subscription status and update
    const isAlreadySubscribed = await SubscriptionInstance.find(
        {
            subscriber: new mongoose.Types.ObjectId(req.user?._id),
            channel: new mongoose.Types.ObjectId(channelId)
        }
    )
    if (!isAlreadySubscribed.length) {
        await SubscriptionInstance.create(
            {
                subscriber: new mongoose.Types.ObjectId(req.user?._id),
                channel: new mongoose.Types.ObjectId(channelId)
            }
        )
        return res.status(200).json(new ApiResponse(200, {}, "Subscribed to channel"))
    } else {
        await SubscriptionInstance.findByIdAndDelete(isAlreadySubscribed[0]._id)
        return res.status(200).json(new ApiResponse(200, {}, "Unsubscribed to channel"))
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req:Request, res:Response) => {
    // Extractign channel id from request parameter
    const { channelId } = req.params

    // Check if valid or not
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid Request")
    }

    const channel = await UserInstance.findById(channelId);

    if (!channel) {
        throw new ApiError(404, "Channel not found")
    }

    // Aggregation pipeline for getting subscribers
    const subscribers = await SubscriptionInstance.aggregate([
        {
            $match: { channel: new mongoose.Types.ObjectId(channelId) },
        },

        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $project: {
                            fullname: 1,
                            username: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$subscriber"
        },
        {
            $project: {
                subscriber: 1
            }
        }
    ]);


    // Return response
    return res.status(200)
        .json(new ApiResponse(200, subscribers, "Subscribers Fetched"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req:Request, res:Response) => {
    // Extractign channel id from request parameter
    const { channelId } = req.params

    // Check if valid or not
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid Request")
    }

    const channel = await UserInstance.findById(channelId);

    if (!channel) {
        throw new ApiError(404, "Channel not found")
    }

    // Aggregation pipeline for getting subscriptions
    const subscriptions = await SubscriptionInstance.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribedTo",
                pipeline: [
                    {
                        $project: {
                            fullname: 1,
                            username: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                subscribedTo: {
                    $first: "$subscribedTo",
                },
            },
        },
        {
            $project: {
                subscribedTo: 1,
            },
        },
        {
            $replaceRoot: {
                newRoot: "$subscribedTo",
            },
        },
    ])

    if (!subscriptions.length) {
        return res.status(200)
            .json(new ApiResponse(200, {}, "No subscriptions yet"))
    }

    return res.status(200).json(new ApiResponse(200, subscriptions, "Subscriptions Fetched"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}