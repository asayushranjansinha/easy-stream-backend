import { Request } from 'express'
import multer, { FileFilterCallback } from 'multer'
type DestinationCallback = (error: Error | null, destination: string) => void
type FileNameCallback = (error: Error | null, filename: string) => void

// cb

const storage = multer.diskStorage({
    destination: (
        request: Request,
        file: Express.Multer.File,
        callback: DestinationCallback
    ): void => {
        callback(null, './public/temp')

    },
    filename: (
        req: Request,
        file: Express.Multer.File,
        callback: FileNameCallback
    ): void => {
        callback(null, file.originalname)
    }
})

export const upload = multer({ storage, })