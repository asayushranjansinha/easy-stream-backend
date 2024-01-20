import mongoose, { isValidObjectId } from "mongoose"
import { ApiError } from "../utils/ApiError"
import { ApiResponse } from "../utils/ApiResponse"
import { asyncHandler } from "../utils/asyncHandler"
import { CommentInstance } from "../models/comment.model"
import VideoInstance from "../models/video.model"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

})

const addComment = asyncHandler(async (req, res) => {
    // Extracting user from request user
    const userId = new mongoose.Types.ObjectId(req.user?._id)

    // Extracting content from request body
    const { content } = req.body;

    // Extracting videoId from request params
    const { videoId } = req.params;

    // Check if video id is valid 
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid VideoId")
    }

    // Searching the video from the videoId provided
    const video = await VideoInstance.findById(videoId)

    // Check if video exists
    if (!video) {
        throw new ApiError(404, "Video not found.")
    }

    // Check if content is not empty
    if (!content) {
        throw new ApiError(400, "Can't post empty comment")
    }

    // Create new document for comment in database
    const addedComment = await CommentInstance.create({
        content: content.trim(),
        video: new mongoose.Types.ObjectId(videoId),
        owner: userId
    })

    // Check if document created
    if (!addedComment) {
        throw new ApiError(500, "Something went wrong while posting comment.")
    }

    // Return response
    return res.status(200)
        .json(new ApiResponse(200, addedComment, "Comment Posted"))
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}