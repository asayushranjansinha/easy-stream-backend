import fs from 'fs';
const deleteLocalFile = (localFilePath: string) => {
    try {
        if (!localFilePath) {
            console.error(`Could not find local file path to delete`);
            return null;
        }
        fs.unlinkSync(localFilePath);
        console.log(`File deleted successfully from server storage: ${localFilePath}`);
    } catch (error) {
        console.error(`Failed to delete file from server storage: ${localFilePath}`, error);
    }
};

export { deleteLocalFile }