import { Request, Response } from "express"
import { isValidObjectId } from "mongoose"
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
    //TODO: get all liked videos
})

export {
    getLikedVideos, toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike
}

