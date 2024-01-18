import mongoose, { Document, Schema } from "mongoose";

interface ITweet extends Document {
    content: string;
    owner: Schema.Types.ObjectId;
}

const tweetSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
}, { timestamps: true })


export const TweetInstance = mongoose.model<ITweet>("Tweet", tweetSchema);