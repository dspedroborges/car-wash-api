import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "../utils/auth.js";
import { prisma } from "../utils/prisma.js";

export interface AuthenticatedRequest extends Request {
  authenticatedUserId?: number;
  isAdmin?: boolean;
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken;

  if (!token) return res.status(401).json({ message: "Token not provided" });

  const decoded = await verifyToken(token);

  if (!decoded.valid || decoded.data == null) return res.status(401).json({ message: "Invalid token" });

  const user = await prisma.users.findUnique({
    where: { id: Number(decoded.data.userId) },
    include: {
      role: true,
    }
  });

  if (!user) return res.status(404).json({ message: "User not found" });
  if (!user.role) return res.status(404).json({ message: "Not a valid role" });

  const hasPermission = await prisma.permissions.findFirst({
    where: {
      roleId: user.role?.id,
      method: req.method,
      route: req.route,
    }
  });

  if (!hasPermission) return res.status(403).json({ message: "Forbidden" });

  req.authenticatedUserId = user.id;

  if (req.method !== "GET") {
    await prisma.logs.create({
      data: {
        userId: user.id,
        path: req.path,
        method: req.method,
        createdAt: new Date(),
        ip: req.ip || "0.0.0.0"
      },
    });
  }

  next();
}