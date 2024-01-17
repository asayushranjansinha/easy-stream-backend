import UserInstance from "../models/user.model"
import { ApiError } from "./ApiError"

const generateAccessAndRefereshTokens = async (userId: string) => {
    try {

        // Gett
        const user = await UserInstance.findById(userId)
        if (!user) {
            throw new ApiError(401, "unauthorized request")
        }
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}
export { generateAccessAndRefereshTokens }