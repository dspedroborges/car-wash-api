import { Router } from "express";
import { prisma } from "../utils/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
const router = Router();
// Get all wash types with pagination
router.get("/", authenticate, async (req, res) => {
    if (!req.isAdmin)
        return res.status(403).json({ message: "Acesso negado" });
    const page = parseInt(req.query.page) || 1;
    const take = 10;
    const skip = (page - 1) * take;
    const [washTypes, total] = await Promise.all([
        prisma.washTypes.findMany({
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: { packages: true }
        }),
        prisma.washTypes.count(),
    ]);
    res.status(200).json(washTypes);
});
// Get a single wash type by ID
router.get("/:id", authenticate, async (req, res) => {
    const washTypeId = Number(req.params.id);
    const washType = await prisma.washTypes.findUnique({
        where: { id: washTypeId },
        include: { packages: true } // include related packages
    });
    if (!washType)
        return res.status(404).json({ message: "Tipo de lavagem não encontrada" });
    res.status(200).json(washType);
});
// Create a new wash type
router.post("/", authenticate, async (req, res) => {
    const { name } = req.body;
    if (!req.isAdmin)
        return res.status(403).json({ message: "Acesso negado" });
    const washType = await prisma.washTypes.create({
        data: { name: String(name).toUpperCase() },
    });
    res.status(201).json({ message: "Tipo de lavagem criada com sucesso", washType });
});
// Update a wash type
router.put("/:id", authenticate, async (req, res) => {
    const washTypeId = Number(req.params.id);
    const { name } = req.body;
    if (!req.isAdmin)
        return res.status(403).json({ message: "Acesso negado" });
    const washType = await prisma.washTypes.findUnique({ where: { id: washTypeId } });
    if (!washType)
        return res.status(404).json({ message: "Tipo de lavagem não encontrada" });
    const updatedWashType = await prisma.washTypes.update({
        where: { id: washTypeId },
        data: { name: String(name).toUpperCase() },
    });
    res.status(200).json({ message: "Tipo de lavagem atualizada com sucesso" });
});
// Delete a wash type
router.delete("/:id", authenticate, async (req, res) => {
    const washTypeId = Number(req.params.id);
    if (!req.isAdmin)
        return res.status(403).json({ message: "Acesso negado" });
    await prisma.washTypes.delete({ where: { id: washTypeId } });
    res.status(200).json({ message: "Tipo de lavagem deletada com sucesso" });
});
export default router;
//# sourceMappingURL=washTypes.js.map