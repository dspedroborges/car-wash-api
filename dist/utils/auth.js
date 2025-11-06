import bcrypt from "bcryptjs";
import jwt, {} from "jsonwebtoken";
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "123";
export async function generateToken(data, expiresIn) {
    let tokenExpiry;
    if (expiresIn) {
        tokenExpiry = expiresIn;
    }
    else if (data.refresh) {
        tokenExpiry = 60 * 60 * 24 * 7; // 7 days for refresh token
    }
    else {
        tokenExpiry = 60 * 60; // 1 hour for access token
    }
    const token = jwt.sign(data, JWT_SECRET_KEY, { expiresIn: tokenExpiry });
    return token;
}
export async function verifyToken(token) {
    try {
        const data = jwt.verify(token, JWT_SECRET_KEY);
        return { valid: true, data };
    }
    catch (message) {
        return { valid: false, data: null, message };
    }
}
export async function encryptPassword(password) {
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        return hash;
    }
    catch (error) {
        throw new Error("Error when trying to encrypt password");
    }
}
export async function checkEncryptedPassword(password, hash) {
    try {
        const match = await bcrypt.compare(password, hash);
        return match;
    }
    catch (error) {
        throw new Error("Error when trying to decrypt password");
    }
}
//# sourceMappingURL=auth.js.map