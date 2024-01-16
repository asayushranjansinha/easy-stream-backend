import fs from 'fs';
import dotenv from 'dotenv';
import { v2 as cloudinary } from "cloudinary";


dotenv.config({ path: './.env' })

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const uploadOnCloudinary = async (localFilePath: string, fileName: string) => {
    try {
        if (!localFilePath) {
            console.error(`Could not find local file path for ${fileName}`);
            return null;
        }

        // upload
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto'
        });

        // file has been uploaded
        console.log("File uploaded successfully on cloudinary", response.url);
        return response;
    } catch (error) {
        console.error(`Failed to upload ${fileName} on Cloudinary `,error);
        fs.unlinkSync(localFilePath); // Optionally remove the local file from the server
        return null;
    }
};

export { uploadOnCloudinary };
