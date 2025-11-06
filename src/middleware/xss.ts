import xss from "xss";
import { type Request, type Response, type NextFunction } from "express";

type AnyObject = { [key: string]: any };

function sanitizeValue(v: any): any {
    if (typeof v === "string") return xss(v);
    if (Array.isArray(v)) return v.map(sanitizeValue);
    if (v && typeof v === "object") return sanitizeObject(v);
    return v;
}

function sanitizeObject(obj: AnyObject): AnyObject {
    const out: AnyObject = Array.isArray(obj) ? [] : {};
    for (const key of Object.keys(obj)) {
        out[key] = sanitizeValue(obj[key]);
    }
    return out;
}

export function xssSanitizerMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.body) req.body = sanitizeObject(req.body);
    if (req.query) Object.assign(req.query as AnyObject, sanitizeObject(req.query as AnyObject));
    if (req.params) req.params = sanitizeObject(req.params);
    next();
}
