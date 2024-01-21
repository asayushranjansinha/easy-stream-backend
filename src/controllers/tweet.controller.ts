import mongoose, { isValidObjectId } from "mongoose"
import { ApiError } from "../utils/ApiError"
import { ApiResponse } from "../utils/ApiResponse"
import { asyncHandler } from "../utils/asyncHandler"
import { Request, Response } from "express"
import { TweetInstance } from "../models/tweet.model"

const createTweet = asyncHandler(async (req: Request, res: Response) => {
    // Extract the 'content' property from the request body
    const { content } = req.body;

    // Check if 'content' is either undefined or an empty string
    if (!content || !content.trim()) {
        throw new ApiError(400, "Can't post an empty tweet");
    }

    // Create new tweet in database
    const tweet = await TweetInstance.create({
        content,
        owner: req.user?._id
    })

    // Sending response 
    return res.status(200)
        .json(new ApiResponse(200, tweet, "Tweet posted successfully"))
})

const getUserTweets = asyncHandler(async (req: Request, res: Response) => {
    // Extracting user id from request params
    const { userId } = req.params;

    // Checking if valid user id or not
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid Request")
    }

    // Fetching tweets from database
    const userTweets = await TweetInstance.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            _id: 0,
                            fullname: 1,
                            avatar: 1,
                            username: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$owner",
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likeCount",
            }
        },
        {
            $addFields: {
                likeCount: {
                    $size: '$likeCount'
                }
            }
        },

    ])

    // Sending reponse
    res.status(200)
        .json(new ApiResponse(200, userTweets, "Tweets Fetched"))
})

const updateTweet = asyncHandler(async (req: Request, res: Response) => {
    // Extracting content from request body
    const { content } = req.body;

    // Extracting tweet id from request params
    const { tweetId } = req.params;

    // Checking if tweet id is valid or not
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Request")
    }

    // Search for original tweet
    const orgTweet = await TweetInstance.findById(tweetId)

    if (!orgTweet) {
        throw new ApiError(404, "Tweet not found")
    }


    // Check for access to edit
    const user = req.user?._id.toString();
    const owner = orgTweet.owner.toString();
    if (owner !== user) {
        throw new ApiError(403, "You do not have permission to edit");
    }

    // Update tweet in databse
    const updatedTweet = await TweetInstance.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content,
            }
        },
        {
            new: true
        }
    )

    if (!updatedTweet) {
        throw new ApiError(500, "Somthing went wrong while updating tweet")
    }

    // Sending response
    return res.status(200)
        .json(new ApiResponse(200, updatedTweet, "Tweet Updated Successfully"))
})

const deleteTweet = asyncHandler(async (req: Request, res: Response) => {
    // Extracting tweet id from request params
    const { tweetId } = req.params;

    // Checking if tweet id is valid or not
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Request")
    }

    // Search for original tweet
    const orgTweet = await TweetInstance.findById(tweetId)

    if (!orgTweet) {
        throw new ApiError(404, "Tweet not found")
    }

    // Check for access to edit
    const user = req.user?._id.toString();
    const owner = orgTweet.owner.toString();
    if (owner !== user) {
        throw new ApiError(403, "You do not have permission to delete");
    }

    // Update tweet in databse
    const deletedTweet = await TweetInstance.findByIdAndDelete(tweetId)

    if (!deletedTweet) {
        throw new ApiError(500, "Somthing went wrong while deleting tweet")
    }

    // Sending response
    return res.status(200)
        .json(new ApiResponse(200, {}, "Tweet Deleted Successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}