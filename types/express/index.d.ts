import { IUser } from "../../src/interfaces/IUser";

declare global {
    namespace Express {
        export interface Request {
            user?: IUser;
        }
    }
}