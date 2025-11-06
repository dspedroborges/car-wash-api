import xss from "xss";
import {} from "express";
function sanitizeValue(v) {
    if (typeof v === "string")
        return xss(v);
    if (Array.isArray(v))
        return v.map(sanitizeValue);
    if (v && typeof v === "object")
        return sanitizeObject(v);
    return v;
}
function sanitizeObject(obj) {
    const out = Array.isArray(obj) ? [] : {};
    for (const key of Object.keys(obj)) {
        out[key] = sanitizeValue(obj[key]);
    }
    return out;
}
export function xssSanitizerMiddleware(req, res, next) {
    if (req.body)
        req.body = sanitizeObject(req.body);
    if (req.query)
        req.query = sanitizeObject(req.query);
    if (req.params)
        req.params = sanitizeObject(req.params);
    next();
}
//# sourceMappingURL=xss.js.map