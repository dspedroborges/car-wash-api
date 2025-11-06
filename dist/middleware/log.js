import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
export async function log(req, res, next) {
    // Get IP (handles proxies too)
    const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
        req.socket.remoteAddress ||
        req.ip;
    await prisma.logs.create({
        data: {
            ip: String(ip),
            path: req.path,
            method: req.method,
            createdAt: new Date(),
        },
    });
    next();
}
//# sourceMappingURL=log.js.map