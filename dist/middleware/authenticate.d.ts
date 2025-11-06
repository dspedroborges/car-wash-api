import { type Request, type Response, type NextFunction } from "express";
export interface AuthenticatedRequest extends Request {
    authenticatedUserId?: number;
    isAdmin?: boolean;
}
export declare function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=authenticate.d.ts.map