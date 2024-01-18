import mongoose, { isValidObjectId } from "mongoose"
import { ApiError } from "../utils/ApiError"
import { ApiResponse } from "../utils/ApiResponse"
import { asyncHandler } from "../utils/asyncHandler"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary"
import VideoInstance from "../models/video.model"
import UserInstance from "../models/user.model"
import { deleteLocalFile } from "../utils/localFileOperations"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    // Extracting files from request body
    const files = req.files as { [fieldname: string]: Express.Multer.File[] }

    // Extracting video information from request body
    const { title, description } = req.body

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
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        duration: videoFile?.duration || 0,
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
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}