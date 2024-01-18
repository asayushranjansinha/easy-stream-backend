import { IUser } from "../../src/interfaces/user.interfaces";
declare module 'express-serve-static-core' {
    interface Request {
        user?: IUser;
    }
}