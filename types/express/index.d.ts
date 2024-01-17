import { IUser } from "../../src/interfaces/IUser";
declare module 'express-serve-static-core' {
    interface Request {
        user?: IUser
    }
}