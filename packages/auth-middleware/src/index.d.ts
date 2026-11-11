import { Request, Response, NextFunction } from "express";
export interface JwtPayload {
    userId: string;
    iat?: number;
    exp?: number;
}
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}
export declare function verifyToken(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export declare function requirePermission(permission: string): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export default verifyToken;
