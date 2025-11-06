import { Router } from "express";
import { prisma } from "../utils/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
const router = Router();
router.get("/", authenticate, async (req, res) => {
    if (!req.isAdmin)
        return res.status(403).json({ message: "Acesso negado" });
    const page = parseInt(req.query.page) || 1;
    const take = 10;
    const skip = (page - 1) * take;
    const [packages, total] = await Promise.all([
        prisma.packages.findMany({
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: { washType: true }
        }),
        prisma.packages.count(),
    ]);
    res.status(200).json(packages);
});
router.get("/:id", authenticate, async (req, res) => {
    const packageId = Number(req.params.id);
    const packageItem = await prisma.packages.findUnique({
        where: { id: packageId },
        include: { washType: true }
    });
    if (!packageItem)
        return res.status(404).json({ message: "Package not found" });
    res.status(200).json(packageItem);
});
router.post("/", authenticate, async (req, res) => {
    const { name, description, washTypeId: _washTypeId, price } = req.body;
    const washTypeId = Number(_washTypeId);
    if (!req.isAdmin)
        return res.status(403).json({ message: "Acesso negado" });
    const newPackage = await prisma.packages.create({
        data: { name: String(name).toUpperCase(), description, washTypeId, price: Number(price) },
    });
    res.status(201).json({ message: "Pacote criado com sucesso", package: newPackage });
});
router.put("/:id", authenticate, async (req, res) => {
    const packageId = Number(req.params.id);
    const { name, description, washTypeId: _washTypeId, price } = req.body;
    const washTypeId = Number(_washTypeId);
    if (!req.isAdmin)
        return res.status(403).json({ message: "Acesso negado" });
    const packageItem = await prisma.packages.findUnique({ where: { id: packageId } });
    if (!packageItem)
        return res.status(404).json({ message: "Pacote não encontrado" });
    const updatedPackage = await prisma.packages.update({
        where: { id: packageId },
        data: { name: String(name).toUpperCase(), description, washTypeId, price: Number(price) },
    });
    res.status(200).json({ message: "Pacote atualizado com sucesso", package: updatedPackage });
});
router.delete("/:id", authenticate, async (req, res) => {
    const packageId = Number(req.params.id);
    if (!req.isAdmin)
        return res.status(403).json({ message: "Acesso negado" });
    await prisma.packages.delete({ where: { id: packageId } });
    res.status(200).json({ message: "Pacote deletado com sucesso" });
});
export default router;
//# sourceMappingURL=packages.js.map