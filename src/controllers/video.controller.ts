import { Request, Response } from "express"
import { VideoQueryParameters } from "../interfaces/video.interfaces"
import VideoInstance from "../models/video.model"
import { ApiError } from "../utils/ApiError"
import { ApiResponse } from "../utils/ApiResponse"
import { asyncHandler } from "../utils/asyncHandler"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary"
import { deleteLocalFile } from "../utils/localFileOperations"
import UserInstance from "../models/user.model"



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
        baseQuery.$or = [
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
    const videos: any[] = await VideoInstance.aggregate([
        {
            // Stage 1: Match videos based on the provided query conditions
            $match: {
                ...baseQuery,
                isPublished: true
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner',
            },
        },
        {
            $unwind: '$owner',
        },
        {
            // Stage 2: Sort videos based on the specified sort options
            $sort: sortOptions,
        },
        {
            // Stage 3: Skip videos based on pagination (page and limit)
            $skip: (parsedPage - 1) * parsedLimit,
        },
        {
            // Stage 4: Limit the number of videos per page
            $limit: parsedLimit,
        },
    ]);

    // Check if videos were fetched successfully
    if (!videos) {
        throw new ApiError(500, "Something went wrong while fetching videos");
    }

    // Send the response with the fetched videos
    res.status(200).json(new ApiResponse(200, videos, "Videos Fetched Successfully"));
});


const publishAVideo = asyncHandler(async (req, res) => {
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
    const publishedVideo = await VideoInstance.create({
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
    res.status(200)
        .json(new ApiResponse(200, publishedVideo, "Video Published Successfully"))

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    deleteVideo, getAllVideos, getVideoById, publishAVideo, togglePublishStatus, updateVideo
}

