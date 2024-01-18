import mongoose, { Document, Schema } from "mongoose";

interface IPlaylist extends Document {
    name: string;
    description: string | undefined | null;
    videos: Schema.Types.ObjectId[];
    owner: Schema.Types.ObjectId;
}

const playlistSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    videos: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
}, { timestamps: true })


export const PlaylistInstance = mongoose.model<IPlaylist>("Playlist", playlistSchema);