import mongoose, { Document, Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

interface IComment extends Document {
    content: String;
    video: Schema.Types.ObjectId;
    owner: Schema.Types.ObjectId;
}

const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true
    },
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true })

commentSchema.plugin(mongooseAggregatePaginate)

export const CommentInstance = mongoose.model<IComment>("Comment", commentSchema);