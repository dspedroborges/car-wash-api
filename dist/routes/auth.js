import { Router } from "express";
import { prisma } from "../utils/prisma.js";
import { checkEncryptedPassword, encryptPassword, generateToken, verifyToken } from "../utils/auth.js";
import { v4 as uuidv4 } from "uuid";
import { authenticate } from "../middleware/authenticate.js";
const router = Router();
router.get("/verify-token", authenticate, async (req, res) => {
    return res.sendStatus(201);
});
router.post("/sign-up", async (req, res) => {
    try {
        const { username, password, type } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: "Username, or password is missing" });
        }
        const isUsernameTaken = await prisma.users.findUnique({
            where: { username },
        });
        if (isUsernameTaken) {
            return res.status(401).json({ message: "Username already registered" });
        }
        const encryptedPassword = await encryptPassword(password);
        const user = await prisma.users.create({
            data: {
                username,
                type: type || "client",
                password: encryptedPassword,
            },
        });
        const token = await generateToken({ userId: user.id, refresh: false });
        const refreshToken = await generateToken({ userId: user.id, refresh: true });
        res.status(201).json({ token, refreshToken });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating user" });
    }
});
router.post("/sign-in", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: "Nome de usuário ou senha faltando" });
        }
        const user = await prisma.users.findUnique({
            where: { username },
        });
        if (!user) {
            return res.status(404).json({ message: "Usuário não encontrado" });
        }
        const verifyPassword = await checkEncryptedPassword(password, user.password);
        if (!verifyPassword) {
            return res.status(400).json({ message: "Credenciais inválidas" });
        }
        const token = await generateToken({ userId: user.id, refresh: false });
        const refreshToken = await generateToken({ userId: user.id, refresh: true });
        res.status(201).json({ token, refreshToken });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao entrar" });
    }
});
router.post("/refresh-token", async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token é necessário" });
        }
        const isTokenRevoked = await prisma.revokedTokens.findUnique({
            where: { token: refreshToken },
        });
        if (isTokenRevoked) {
            return res.status(401).json({ message: "Token revogado" });
        }
        const verifiedToken = await verifyToken(refreshToken);
        if (!verifiedToken || verifiedToken.data == null) {
            return res.status(401).json({ message: "Token inválido" });
        }
        await prisma.revokedTokens.create({
            data: { token: refreshToken },
        });
        const token = generateToken({ userId: verifiedToken.data.userId, refresh: false });
        const newRefreshToken = generateToken({ userId: verifiedToken.data.userId, refresh: true });
        res.status(201).json({ token, newRefreshToken });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao atualizar token" });
    }
});
router.post("/password-recovery", async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ message: "Nome de usuário é obrigatório" });
        }
        const user = await prisma.users.findUnique({
            where: { username },
        });
        if (!user) {
            return res.status(404).json({ message: "Usuário não encontrado" });
        }
        await prisma.passwordRecoveries.create({
            data: {
                token: uuidv4(),
                userId: user.id,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            },
        });
        res.status(201).json({ message: "Token de recuperação criado" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao recuperar senha" });
    }
});
export default router;
//# sourceMappingURL=auth.js.map