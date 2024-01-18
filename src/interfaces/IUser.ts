import { Document } from "mongoose";

export interface IUser extends Document {
    username: string;
    email: string;
    fullname: string;
    avatar: string;
    coverImage: string;
    watchHistory: string[];
    password: string;
    refreshToken: string;
    generateAccessToken(): string;
    generateRefreshToken(): string;
    isPasswordCorrect(password: string): Promise<boolean>;
}