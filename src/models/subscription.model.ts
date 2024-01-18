import mongoose, { Document, Schema } from "mongoose";

interface ISubscription extends Document {
    subscriber: Schema.Types.ObjectId | string;
    channel: Schema.Types.ObjectId | string;
}

const subscriptionSchema = new mongoose.Schema({
    subscriber: {
        type: Schema.Types.ObjectId, // user subscribing to the channel
        ref: "User",
    },
    channel: {
        type: Schema.Types.ObjectId, // channel being subscribed
        ref: "User",
    }
})

export const SubscriptionInstance = mongoose.model<ISubscription>("Subscription", subscriptionSchema)