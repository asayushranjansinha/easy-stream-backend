import dotenv from 'dotenv';
import { v2 as cloudinary } from "cloudinary";
import { deleteLocalFile } from './localFileOperations';


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
        console.error(`Failed to upload ${fileName} on Cloudinary `, error);
        return null;
    } finally {
        // delete from server
        deleteLocalFile(localFilePath);
    }
};

const deleteFromCloudinary = async (publicId: string) => {
    try {
        if (!publicId) {
            console.error(`Could not find public id of the file to delete`);
            return null;
        }

        // delete
        const response = await cloudinary.uploader.destroy(publicId)
        return response;
    } catch (error) {
        console.error(`Failed to delete from Cloudinary `, error);
    }
}

export { deleteFromCloudinary, uploadOnCloudinary };

