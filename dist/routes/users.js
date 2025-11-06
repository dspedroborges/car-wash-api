import { Router } from "express";
import { prisma } from "../utils/prisma.js";
import { checkEncryptedPassword, encryptPassword } from "../utils/auth.js";
import { authenticate } from "../middleware/authenticate.js";
const router = Router();
router.get("/", authenticate, async (req, res) => {
    if (!req.isAdmin)
        return res.status(403).json({ message: "Access denied" });
    const users = await prisma.users.findMany({
        select: {
            id: true,
            username: true,
            type: true,
            createdAt: true,
        },
    });
    res.status(200).json(users);
});
router.get("/:id", authenticate, async (req, res) => {
    const userId = Number(req.params.id);
    if (userId !== req.authenticatedUserId && !req.isAdmin)
        return res.status(403).json({ message: "Access denied" });
    const user = await prisma.users.findUnique({
        where: { id: userId },
    });
    if (!user)
        return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
});
router.put("/:id", authenticate, async (req, res) => {
    const { username, currentPassword, newPassword } = req.body;
    const userId = Number(req.params.id);
    if (userId !== req.authenticatedUserId && !req.isAdmin)
        return res.status(403).json({ message: "Access denied" });
    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user)
        return res.status(404).json({ message: "User not found" });
    const usernameExists = await prisma.users.findFirst({
        where: {
            username,
            id: { not: userId },
        },
    });
    if (usernameExists)
        return res.status(403).json({ message: "Username already in use" });
    if (!req.isAdmin) {
        const match = await checkEncryptedPassword(currentPassword, user.password);
        if (!match)
            return res.status(403).json({ message: "Current password incorrect" });
    }
    await prisma.users.update({
        where: { id: userId },
        data: {
            username,
            password: newPassword ? await encryptPassword(newPassword) : user.password,
        },
    });
    res.status(200).json({ message: "User updated successfully" });
});
router.delete("/:id", authenticate, async (req, res) => {
    const userId = Number(req.params.id);
    if (userId !== req.authenticatedUserId && !req.isAdmin)
        return res.status(403).json({ message: "Access denied" });
    await prisma.users.delete({
        where: { id: userId },
    });
    res.status(200).json({ message: "User deleted successfully" });
});
export default router;
//# sourceMappingURL=users.js.map