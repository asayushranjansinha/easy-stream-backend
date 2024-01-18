import mongoose, { Document, Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import { IvideoSchema } from "../interfaces/video.interfaces";


const videoSchema = new mongoose.Schema({
    videoFile: {
        type: String,
        required: true,
    },
    thumbnail: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    duration: {
        type: Number,
        required: true,
    },
    views: {
        type: Number,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: true
    },
    owner: {
        type: Schema.Types.ObjectId, 
        ref: "User"
    }
}, { timestamps: true })


videoSchema.plugin(mongooseAggregatePaginate)

const VideoInstance = mongoose.model<IvideoSchema>("Video", videoSchema);
export default VideoInstance
