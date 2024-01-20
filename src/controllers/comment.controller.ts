import mongoose, { isValidObjectId } from "mongoose"
import { ApiError } from "../utils/ApiError"
import { ApiResponse } from "../utils/ApiResponse"
import { asyncHandler } from "../utils/asyncHandler"
import { CommentInstance } from "../models/comment.model"
import VideoInstance from "../models/video.model"
import { Request, Response } from "express"
import { LikeInstance } from "../models/like.model"

const getVideoComments = asyncHandler(async (req: Request, res: Response) => {
    const { videoId } = req.params;
    const { page = "1", limit = "10" } = req.query as {
        page?: string;
        limit?: string;
    };

    // Parse string values to integers as needed
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 10;

    // Aggregation pipeline to fetch video comments
    const comments = await CommentInstance.aggregate([
        {
            // Stage 1: Match comments for the given videoId
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            // Stage 2: Find the owner of comment
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            _id: 0,
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$owner"
        },
        {
            // Stage: Find the count of likes on each comment
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likeCount",

            }
        },
        {
            // Stage 4: Add a new field 'likeCount' with the size of the 'likeCount' array
            $addFields: {
                likeCount: {
                    $size: '$likeCount'
                }
            }
        },
        {
            // Stage 5: Project the necessary details
            $project: {
                content: 1,
                owner: 1,
                createdAt: 1,
                likeCount: 1
            }
        }

    ]);

    // Check if comments were found
    if (!comments.length) {
        throw new ApiError(500, 'Comments not found!');
    }

    // Respond with the fetched comments
    return res
        .status(200)
        .json(new ApiResponse(200, comments, 'Comments fetched successfully!'));
});


const addComment = asyncHandler(async (req: Request, res: Response) => {
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

const updateComment = asyncHandler(async (req: Request, res: Response) => {
    // Extracting content from request body
    const { content } = req.body;

    // Extracting comment id from request params
    const { commentId } = req.params;

    // Checking if comment id is valid or not
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid Request")
    }

    // Search for specific comment
    const orgComment = await CommentInstance.findById(commentId);

    if (!orgComment) {
        throw new ApiError(404, "Comment not found")
    }

    // Check for access to edit
    const user = req.user?._id.toString();
    const owner = orgComment.owner.toString();

    if (owner !== user) {
        throw new ApiError(403, "You do not have permission to edit");
    }

    // Update comment in database
    const updatedComment = await CommentInstance.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content,
            },
        },
        {
            new: true,
        }
    )

    // Throw Error for failure to update
    if (!updateComment) {
        throw new ApiError(500, "Somthing went wrong while updating comment")
    }

    // Send new comment as response
    return res.status(200)
        .json(new ApiResponse(200, updatedComment, "Comment Updated Successfully"))
})

const deleteComment = asyncHandler(async (req: Request, res: Response) => {
    // Extracting comment id from request params
    const { commentId } = req.params;

    // Checking if comment id is valid or not
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid Request")
    }

    // Search for specific comment
    const orgComment = await CommentInstance.findById(commentId);

    if (!orgComment) {
        throw new ApiError(404, "Comment not found")
    }

    // Check for access to edit
    const user = req.user?._id.toString();
    const owner = orgComment.owner.toString();

    if (owner !== user) {
        throw new ApiError(403, "You do not have permission to edit");
    }

    // Delete comment and all associated documents
    const response = await Promise.all([
        CommentInstance.findByIdAndDelete(commentId),
        LikeInstance.deleteMany({ comment: orgComment._id })
    ])

    if (!response) {
        throw new ApiError(500, "Something went wrong while deleting comment")
    }

    // Return response
    return res.status(200)
        .json(new ApiResponse(200, {}, "Comment Deleted Successfully"))

})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}