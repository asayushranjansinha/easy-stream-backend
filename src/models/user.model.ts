import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose, { Schema } from "mongoose";
import { IUser } from '../interfaces/user.interfaces';

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
        trim: true
    },
    fullname: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String, // cloudinary url
        required: true,
    },
    coverImage: {
        type: String, // cloudinary url
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    refreshToken: {
        type: String,
    }
}, { timestamps: true });



// methods
userSchema.pre("save", async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
})

userSchema.methods.isPasswordCorrect = async function (password: string) {
    return await bcrypt.compare(password, this.password)
}
userSchema.methods.generateAccessToken = function () {
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET as string;

    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullname: this.fullname
        },
        accessTokenSecret,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
};
userSchema.methods.generateRefreshToken = function () {
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET as string;

    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullname: this.fullname
        },
        refreshTokenSecret,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    );
}
// model
const UserInstance = mongoose.model<IUser>("User", userSchema);

export default UserInstance;
