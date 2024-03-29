import { Request, Response } from "express"
import { IVideo, VideoQueryParameters } from "../interfaces/video.interfaces"
import VideoInstance from "../models/video.model"
import { ApiError } from "../utils/ApiError"
import { ApiResponse } from "../utils/ApiResponse"
import { asyncHandler } from "../utils/asyncHandler"
import { deleteFromCloudinary, replaceCloudinaryImage, uploadOnCloudinary } from "../utils/cloudinary"
import { deleteLocalFile } from "../utils/localFileOperations"
import UserInstance from "../models/user.model"
import mongoose, { isValidObjectId } from "mongoose"
import { LikeInstance } from "../models/like.model"
import { CommentInstance } from "../models/comment.model"



const getAllVideos = asyncHandler(async (req: Request, res: Response) => {
    // Extracting all queries from the request query
    const { page = "1", limit = "10", query, sortBy, sortType = "desc", creator } = req.query as VideoQueryParameters;
    // Object to hold sort options
    const sortOptions: Record<string, 1 | -1> = {
        sortBy: -1
    };

    // Object to build the base query
    let baseQuery: Record<string, any> = {};

    // Check if sortBy is provided, and set sort options accordingly
    if (sortBy) {
        sortOptions.sortBy = sortType === "desc" ? -1 : 1;
    }
    // Check if query is provided, and set the $or operator for title and description search
    if (query) {
        baseQuery
            .$or = [
                { title: { $regex: query, $options: "i" } },
                { description: { $regex: query, $options: "i" } },
            ];
    }

    // Check if userId is provided
    if (creator) {
        const owner = await UserInstance.findOne({ fullname: creator })
        if (!owner) {
            throw new ApiError(404, "User not found")
        }

        baseQuery.owner = owner._id;
    }

    // Parse string values to integers as needed
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 10;

    // Aggregation pipeline to fetch videos
    const videos: IVideo[] = await VideoInstance.aggregate([
        {
            // Stage 1: $match stage
            $match: {
                // Apply a match filter based on the provided baseQuery and isPublished: true
                ...baseQuery,
                isPublished: true
            }
        },
        {
            // Stage 2: $lookup stage for 'users' collection
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner',
                pipeline: [
                    {
                        // Sub-pipeline for 'users' collection: Project specific fields
                        $project: {
                            fullname: 1,
                            username: 1,
                            avatar: 1,
                        }
                    }
                ]
            },
        },
        {
            // Stage 3: $lookup stage for 'likes' collection
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            // Stage 4: $sort stage based on provided sortOptions
            $sort: sortOptions,
        },
        {
            // Stage 5: $skip stage to skip documents based on pagination
            $skip: (parsedPage - 1) * parsedLimit,
        },
        {
            // Stage 6: $limit stage to limit the number of documents returned
            $limit: parsedLimit,
        },
        {
            // Stage 7: $addFields stage
            $addFields: {
                owner: {
                    $first: "$owner",
                },
                likes: {
                    $size: "$likes"
                }
            },
        },
    ]);

    // Check if videos were fetched successfully
    if (!videos) {
        throw new ApiError(500, "Something went wrong while fetching videos");
    }

    // Send the response with the fetched videos
    return res.status(200).json(new ApiResponse(200, videos, "Videos Fetched Successfully"));
});

const publishAVideo = asyncHandler(async (req: Request, res: Response) => {
    // Extracting video information from request body
    const { title, description, isPublished } = req.body

    // Extracting files from request body
    const files = req.files as { [fieldname: string]: Express.Multer.File[] }


    // Extracting local paths for video and thumbnail
    const videoLocalPath = files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = files?.thumbnail?.[0]?.path;

    // Checking if any required field is empty
    if ([title, description].some((field) => !field || field.trim() === '')) {
        // delete unused information from server
        deleteLocalFile(videoLocalPath)
        deleteLocalFile(thumbnailLocalPath)

        throw new ApiError(400, "Title or Description either missing or empty.")
    }

    // Checking if files are missing
    if (!videoLocalPath || !thumbnailLocalPath) {
        // delete unused information from server
        deleteLocalFile(videoLocalPath)
        deleteLocalFile(thumbnailLocalPath)

        throw new ApiError(400, "Video file or Thumbnail is missing.")
    }

    // Uploading on Cloudinary
    const videoFile = await uploadOnCloudinary(videoLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)


    // Checking if files uploaded successfully
    if (!videoFile || !thumbnail) {
        throw new ApiError(400, "Something went wrong while uploading files.")
    }

    // Creating new video with the provided information
    const owner = req.user?.id
    const publishedVideo: IVideo = await VideoInstance.create({
        owner,
        title: title.trim().toLowerCase(),
        description: description.trim().toLowerCase(),
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        duration: videoFile?.duration || 0,
        isPublished: isPublished ? isPublished : true
    })

    // Checking for video upload on database
    if (!publishedVideo) {
        // Delete data from cloudinary 
        await deleteFromCloudinary(videoFile.url);
        await deleteFromCloudinary(thumbnail.url);

        throw new ApiError(500, "Something went wrong while uploading video")
    }

    // Sending success response with created with video information
    return res.status(200)
        .json(new ApiResponse(200, publishedVideo, "Video Published Successfully"))

})

const getVideoById = asyncHandler(async (req: Request, res: Response) => {
    // Extracting videoId from request params
    const { videoId } = req.params

    // Checking if valid videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId. Must be a valid ObjectId.");
    }

    // Finding video from videoId
    const video = await VideoInstance.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
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
                            fullname: 1,
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner",
                },
                likes: {
                    $size: "$likes",
                },
            }
        }
    ]);


    // Checking if video is recieved or not
    if (!video || !video.length) {
        throw new ApiError(404, "Video not found")
    }
    // Update views on the video
    await VideoInstance.findByIdAndUpdate(videoId, {
        $set: {
            views: video[0].views + 1,
        },
    });

    // Return video as response
    return res.status(200)
        .json(new ApiResponse(200, video[0], "Video Fetched Successfully"))
})

const updateVideo = asyncHandler(async (req: Request, res: Response) => {
    // Extracting videoId from request params
    const { videoId } = req.params

    // Extracting fields to update from body
    const { title, description } = req.body;

    // Extracting thumbnail from request files
    const thumbnailFileLocalPath = req.file?.path;

    // Checking for valid video id
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Request")
    }

    // Check if all of the required fields are non-empty
    if (![thumbnailFileLocalPath, title?.trim(), description?.trim()].every(field => field !== undefined && field !== '')) {
        throw new ApiError(400, "Update fields are required");
    }

    // Find Video
    const video = await VideoInstance.findOne({ _id: videoId })

    if (!video) {
        throw new ApiError(404, "Video not found");
    }


    // Check if current user is the owner 
    const userId = req.user?._id?.toString();
    const ownerId = video?.owner?.toString();

    if (ownerId !== userId) {
        throw new ApiError(403, "You do not have permission to edit this video");
    }

    let thumbnail;
    if (thumbnailFileLocalPath) {
        thumbnail = await replaceCloudinaryImage(video.thumbnail, thumbnailFileLocalPath)
    }

    if (!thumbnail) {
        throw new ApiError(500, "Error while updating thumbnail")
    }


    const updatedVideo = await VideoInstance.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title: title || video.title,
                description: description || video.description,
                thumbnail: thumbnail?.url || video.thumbnail,
            }
        },
        {
            new: true
        }
    )

    if (!updatedVideo) {
        throw new ApiError(500, "Something went wrong while updating video")
    }

    return res.status(200)
        .json(new ApiResponse(200, video, "Video Updated Successfully"))
})

const deleteVideo = asyncHandler(async (req: Request, res: Response) => {
    // Extracting videoId from request params
    const { videoId } = req.params

    // Checking if valid videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId. Must be a valid ObjectId.");
    }

    // Find Video
    const video = await VideoInstance.findOne({ _id: videoId })

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Check if current user is the owner 
    const userId = req.user?._id?.toString();
    const ownerId = video?.owner?.toString();

    if (ownerId !== userId) {
        throw new ApiError(403, "You do not have permission to delete this video");
    }
    
    const response = await Promise.all([
        // Deleting video from database 
        VideoInstance.findByIdAndDelete(video._id),

        // Delete all 'Like' documents associated with the deleted video
        LikeInstance.deleteMany({ video: video._id }),

        // Delete all 'Comment' documents associated with the deleted video
        CommentInstance.deleteMany({ video: video._id }),

        // Delete the video file from Cloudinary using its public ID
        deleteFromCloudinary(video.thumbnail),

        // Delete the thumbnail file from Cloudinary using its public ID
        deleteFromCloudinary(video.videoFile),
    ]);

    if (!response) {
        throw new ApiError(500, "Something went wrong while deleting video")
    }

    // Returning server response
    return res.status(200)
        .json(new ApiResponse(200, {}, "Video Deleted Successfully"))

})

const togglePublishStatus = asyncHandler(async (req: Request, res: Response) => {
    // Extracting videoId from request params
    const { videoId } = req.params

    // Checking if valid videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId. Must be a valid ObjectId.");
    }

    // Find Video
    const video = await VideoInstance.findOne({ _id: videoId })

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Check if current user is the owner 
    const userId = req.user?._id?.toString();
    const ownerId = video?.owner?.toString();

    if (ownerId !== userId) {
        throw new ApiError(403, "You do not have permission to delete this video");
    }

    // Toggle video publish status
    video.isPublished = !video.isPublished
    video.save();

    // Sending response as json
    return res.status(200)
        .json(
            new ApiResponse(
                200,
                video,
                video.isPublished ? "Video is Public now" : "Video is Private now"
            )
        )
})

export {
    deleteVideo, getAllVideos, getVideoById, publishAVideo, togglePublishStatus, updateVideo
}

