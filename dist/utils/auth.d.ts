import { type JwtPayload } from "jsonwebtoken";
export declare function generateToken(data: {
    userId: string | number;
    refresh: boolean;
}, expiresIn?: number): Promise<string>;
interface TokenPayload extends JwtPayload {
    userId: string;
}
export declare function verifyToken(token: string): Promise<{
    valid: boolean;
    data: TokenPayload | null;
    message?: any;
}>;
export declare function encryptPassword(password: string): Promise<string>;
export declare function checkEncryptedPassword(password: string, hash: string): Promise<boolean>;
export {};
//# sourceMappingURL=auth.d.ts.map