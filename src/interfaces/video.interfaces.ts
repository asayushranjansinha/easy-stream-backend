import { Schema } from "mongoose";

// Define interface for query parameters for getAllVideos()
export interface VideoQueryParameters {
    page?: string;
    limit?: string;
    query?: string;
    sortBy?: string;
    sortType?: "desc" | "asc" | undefined;
    creator?: string;
}
// Define interface for Video model
export interface IVideo extends Document {
    videoFile: string;
    thumbnail: string;
    title: string;
    description: string;
    duration: number;
    views: number;
    isPublished: boolean;
    owner: Schema.Types.ObjectId | null | undefined
}