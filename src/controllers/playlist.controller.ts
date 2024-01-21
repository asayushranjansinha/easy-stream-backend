import mongoose, { isValidObjectId } from "mongoose"
import { ApiError } from "../utils/ApiError"
import { ApiResponse } from "../utils/ApiResponse"
import { asyncHandler } from "../utils/asyncHandler"
import { PlaylistInstance } from "../models/playlist.model"
import VideoInstance from "../models/video.model"
import { Request, Response } from "express"

const createPlaylist = asyncHandler(async (req: Request, res: Response) => {
    const { name, description } = req.body;

    // Check if both name and description are missing
    if (!name && !description) {
        throw new ApiError(400, "Both name and description are required");
    }

    // Create a new playlist
    const createdPlaylist = await PlaylistInstance.create({
        name,
        description,
        owner: new mongoose.Types.ObjectId(req.user?._id),
    });

    // Check if the playlist was created successfully
    if (!createdPlaylist) {
        throw new ApiError(500, "Something went wrong while creating playlist");
    }

    // Return success response with the created playlist
    return res.status(200).json(new ApiResponse(200, createdPlaylist, "Playlist Created Successfully"));
});


const getUserPlaylists = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id

    // Aggregate pipeline for fetching user playlists
    const playlist = await PlaylistInstance.aggregate([
        // Stage 1: Match playlists by owner ID
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        // Stage 2: Lookup videos for each playlist and project selected fields
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "playlistVideo",
                pipeline: [
                    {
                        $project: {
                            thumbnail: 1,
                            videoFile: 1,
                            title: 1,
                            description: 1,
                            duration: 1,
                            views: 1,
                        },
                    },
                ],
            },
        },
        // Stage 3: Project selected fields for the main playlist document
        {
            $project: {
                name: 1,
                description: 1,
                playlistVideo: 1,
            },
        },
        // Stage 4: Sort playlists by createdAt in descending order
        {
            $sort: {
                createdAt: -1,
            },
        },
    ]);

    // Handle the case where no playlists are found
    if (!playlist.length) {
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "No Playlist found"));
    }

    // Return the playlists
    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist Fetched Successfully"));
});



const getPlaylistById = asyncHandler(async (req: Request, res: Response) => {
    const { playlistId } = req.params;

    // Aggregate pipeline for fetching a playlist by ID
    const playlist = await PlaylistInstance.aggregate([
        // Stage 1: Match playlists by playlist ID
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId),
            },
        },
        // Stage 2: Lookup videos for the playlist and project selected fields
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "playlistVideo",
                pipeline: [
                    {
                        $project: {
                            thumbnail: 1,
                            videoFile: 1,
                            title: 1,
                            description: 1,
                            duration: 1,
                            views: 1,
                        },
                    },
                ],
            },
        },
        // Stage 3: Project selected fields for the main playlist document
        {
            $project: {
                name: 1,
                description: 1,
                playlistVideo: 1,
            },
        },
    ]);

    // Check if the playlist was not found
    if (!playlist.length) {
        throw new ApiError(400, "Playlist not found");
    }

    // Return the playlist
    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist Fetched Successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req: Request, res: Response) => {
    const { videoId, playlistId } = req.params;

    // Validate playlistId and videoId
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Request");
    }

    // Find the video by its ID
    const video = await VideoInstance.findById(videoId);

    // Check if the video exists
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Find the playlist by its ID
    const playlist = await PlaylistInstance.findById(playlistId);

    // Check if the playlist exists
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    // Check for access to edit
    const user = req.user?._id.toString();
    const owner = playlist.owner.toString();

    // Verify that the user has permission to edit the playlist
    if (owner !== user) {
        throw new ApiError(403, "You do not have permission to edit");
    }

    // Update the playlist by adding the video to the 'videos' array
    const updatedPlaylist = await PlaylistInstance.findByIdAndUpdate(
        playlistId,
        {
            $push: { videos: new mongoose.Types.ObjectId(videoId) },
        },
        {
            new: true,
        }
    );

    // Check if the playlist was updated successfully
    if (!updatedPlaylist) {
        throw new ApiError(500, "Something went wrong while adding video");
    }

    // Return success response with the updated playlist
    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video added to playlist"));
});

const removeVideoFromPlaylist = asyncHandler(async (req: Request, res: Response) => {
    const { videoId, playlistId } = req.params;

    // Validate playlistId and videoId
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Request");
    }

    // Find the video by its ID
    const video = await VideoInstance.findById(videoId);

    // Check if the video exists
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Find the playlist by its ID
    const playlist = await PlaylistInstance.findById(playlistId);

    // Check if the playlist exists
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    // Check for access to edit
    const user = req.user?._id.toString();
    const owner = playlist.owner.toString();

    // Verify that the user has permission to edit the playlist
    if (owner !== user) {
        throw new ApiError(403, "You do not have permission to edit");
    }

    // Check if the video is in the playlist
    const videoObjectId = new mongoose.Types.ObjectId(videoId);

    if (!playlist.videos.some((video: any) => video.equals(videoObjectId))) {
        throw new ApiError(400, "Video not found in playlist");
    }

    // Update the playlist by removing the video from the 'videos' array
    const updatedPlaylist = await PlaylistInstance.findByIdAndUpdate(
        playlistId,
        {
            $pull: { videos: new mongoose.Types.ObjectId(videoId) },
        },
        {
            new: true,
        }
    );

    // Check if the playlist was updated successfully
    if (!updatedPlaylist) {
        throw new ApiError(500, "Something went wrong while removing video from playlist");
    }

    // Return success response with the updated playlist
    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video removed from playlist"));
});


const deletePlaylist = asyncHandler(async (req: Request, res: Response) => {
    const { playlistId } = req.params;

    // Validate playlistId
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Request");
    }

    // Find the playlist by its ID
    const playlist = await PlaylistInstance.findById(playlistId);

    // Check if the playlist exists
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    // Check for access to delete
    const user = req.user?._id.toString();
    const owner = playlist.owner.toString();

    // Verify that the user has permission to delete the playlist
    if (owner !== user) {
        throw new ApiError(403, "You do not have permission to delete");
    }

    // Delete the playlist
    await PlaylistInstance.findByIdAndDelete(playlistId);

    // Return success response
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Playlist Deleted Successfully"));
});


const updatePlaylist = asyncHandler(async (req: Request, res: Response) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    // Validate playlistId
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Request");
    }

    // Find the playlist by its ID
    const playlist = await PlaylistInstance.findById(playlistId);

    // Check if the playlist exists
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    // Check for access to edit
    const user = req.user?._id.toString();
    const owner = playlist.owner.toString();

    // Verify that the user has permission to edit the playlist
    if (owner !== user) {
        throw new ApiError(403, "You do not have permission to edit");
    }

    // Check if at least one of name or description is provided
    if (!name && !description) {
        throw new ApiError(400, "At least one of name or description is required");
    }

    // Update the playlist
    const updatedPlaylist = await PlaylistInstance.findByIdAndUpdate(
        playlistId,
        { $set: { name, description } },
        { new: true }
    );

    // Check if the playlist was updated successfully
    if (!updatedPlaylist) {
        throw new ApiError(500, "Something went wrong while updating playlist");
    }

    // Return success response
    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Playlist Updated Successfully"));
});


export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}