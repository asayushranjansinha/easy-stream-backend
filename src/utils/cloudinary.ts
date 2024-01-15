import fs from 'fs'
import { v2 as cloudinary } from "cloudinary";


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const uploadOnCloudinary = async (localFilePath: string) => {
    try {
        if (!localFilePath) {
            console.log("Could not find local file path")
            return null;
        }

        // upload
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto'
        })

        // file has been uploaded
        console.log("File uploaded successfully on cloudinary", response.url)
        return response;
    } catch (error) {
        console.log("file upload failed on cloudinary", error)
        fs.unlinkSync(localFilePath) // removed the local file from server
        return null;
    }
}