import { Request, Response } from "express"
import mongoose, { isValidObjectId } from "mongoose"
import { LikeInstance } from "../models/like.model"
import { ApiError } from "../utils/ApiError"
import { ApiResponse } from "../utils/ApiResponse"
import { asyncHandler } from "../utils/asyncHandler"

const toggleVideoLike = asyncHandler(async (req: Request, res: Response) => {
    // Extracting videoId from request params
    const { videoId } = req.params

    // Checking if valid videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId. Must be a valid ObjectId.");
    }

    // Find if video is already liked
    const isLikedVideo = await LikeInstance.find(
        {
            video: videoId,
            likedBy: req.user?.id
        }
    )

    // Toggle like status and send response
    if (isLikedVideo.length) {
        await LikeInstance.findByIdAndDelete(isLikedVideo[0]._id)
        return res.status(200)
            .json(new ApiResponse(200, {}, "Removed from Liked"))
    } else {
        await LikeInstance.create({
            video: videoId,
            likedBy: req.user?.id
        })
        return res.status(200)
            .json(new ApiResponse(200, {}, "Liked"))
    }
})

const toggleCommentLike = asyncHandler(async (req: Request, res: Response) => {
    const { commentId } = req.params
    //TODO: toggle like on comment

})

const toggleTweetLike = asyncHandler(async (req: Request, res: Response) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet
}
)

const getLikedVideos = asyncHandler(async (req: Request, res: Response) => {
    // Extracting user from request user
    const userId = new mongoose.Types.ObjectId(req.user?._id);

    // Aggregation pipeline to fetch liked videos
    const likedVideos = await LikeInstance.aggregate([
        // Stage 1: Match documents where likedBy field is equal to userId
        {
            $match: {
                video: {
                    $exists: true,
                },
                likedBy: userId,
            }
        },
        // Stage 2: Perform a lookup to get video details based on the video field
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner"
                        }
                    },
                    {
                        $unwind: "$owner"
                    }
                ]
            }
        },
        // Stage 3: Unwind the video array to get individual video documents
        {
            $unwind: "$video"
        },
        // Stage 4: Perform a lookup to get likes details based on the video _id field
        {
            $lookup: {
                from: "likes",
                localField: "video._id",
                foreignField: "video",
                as: "video.likes"
            }
        },
        // Stage 5: Add a new field 'likes' to the video document representing the count of likes
        {
            $addFields: {
                "video.likes": {
                    $size: "$video.likes"
                }
            }
        },
        // Stage 6: Project to include only the desired fields in the final output
        {
            $project: {
                _id: "$video._id",
                videoFile: "$video.videoFile",
                thumbnail: "$video.thumbnail",
                title: "$video.title",
                description: "$video.description",
                duration: "$video.duration",
                views: "$video.views",
                owner: "$video.owner.fullname",
                createdAt: "$video.createdAt",
                likes: "$video.likes"
            }
        }
    ]);

    // Sending the response
    return res.status(200)
        .json(new ApiResponse(200, likedVideos, "Fetched Liked videos"));
})

export {
    getLikedVideos, toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike
}

