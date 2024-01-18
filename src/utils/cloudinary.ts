import dotenv from 'dotenv';
import { v2 as cloudinary } from "cloudinary";
import { deleteLocalFile } from './localFileOperations';
import { extractPublicId } from 'cloudinary-build-url'


dotenv.config({ path: './.env' })

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const uploadOnCloudinary = async (localFilePath: string) => {
    try {
        if (!localFilePath) {
            console.error(`Local file path is missing. Cloudinary file upload skipped`);
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
        console.error(`Failed to upload on Cloudinary `, error);
        return null;
    } finally {
        // delete from server
        deleteLocalFile(localFilePath);
    }
};

const deleteFromCloudinary = async (publicUrl: string) => {
    try {
        if (!publicUrl) {
            console.error(`Cloudinary public url is missing. Cloudinary file delete skipped`);
            return null;
        }

        // delete
        const publicId = extractPublicId(publicUrl)
        const response = await cloudinary.uploader.destroy(publicId)
        return response;
    } catch (error) {
        console.error(`Failed to delete from Cloudinary `, error);
    }
}

const replaceCloudinaryImage = async (previousImageUrl: string, newImageLocalPath: string) => {
    // delete older image
    if (!previousImageUrl) {
        console.error(`Previous Cloudinary URL not found. Image deletion skipped.`);
    } else {
        return await deleteFromCloudinary(previousImageUrl)
    }

    // upload new image
    if (!newImageLocalPath) {
        console.error(`Local file path is missing. Cloudinary file upload skipped`);
    } else {
        return await uploadOnCloudinary(newImageLocalPath)
    }
};
export {
    uploadOnCloudinary,
    deleteFromCloudinary,
    replaceCloudinaryImage
}