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
    const [debts, total] = await Promise.all([
        prisma.debts.findMany({
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: {
                client: true,
                user: true,
                washType: true,
                package: true,
            },
        }),
        prisma.debts.count(),
    ]);
    res.status(200).json({ debts, total });
});
router.get("/:id", authenticate, async (req, res) => {
    const debtId = Number(req.params.id);
    const debt = await prisma.debts.findUnique({
        where: { id: debtId },
        include: {
            client: true,
            user: true,
            washType: true,
            package: true,
        },
    });
    if (!debt)
        return res.status(404).json({ message: "Débito não encontrado" });
    res.status(200).json(debt);
});
router.get("/client/:id", authenticate, async (req, res) => {
    const clientId = Number(req.params.id);
    const page = parseInt(req.query.page) || 1;
    const searchParam = req.query.searchParam?.trim() || "";
    const filter = req.query.filter;
    const take = 10;
    const skip = (page - 1) * take;
    const where = { clientId };
    if (searchParam) {
        where.OR = [
            { observation: { contains: searchParam, mode: "insensitive" } },
            { paymentMethod: { contains: searchParam, mode: "insensitive" } },
        ];
    }
    if (filter === "paid")
        where.status = "paid";
    else if (filter === "pending")
        where.status = "pending";
    else if (filter === "canceled")
        where.status = "canceled";
    else if (filter === "expired")
        where.expiresAt = { lt: new Date() };
    const [debts, total] = await Promise.all([
        prisma.debts.findMany({
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: {
                washType: true,
                package: true,
            },
            where,
        }),
        prisma.debts.count({ where }),
    ]);
    const totalPages = Math.ceil(total / take);
    res.status(200).json({ content: debts, totalPages });
});
router.post("/", authenticate, async (req, res) => {
    const { clientId, washTypeId, packageId, expiresAt, discount, observation, paymentMethod, status, } = req.body;
    if (!req.isAdmin)
        return res.status(403);
    if (Number(discount) > 50)
        return res.status(400).json({ message: "Desconto excessivo" });
    const pkg = await prisma.packages.findUnique({
        where: { id: Number(packageId) },
        select: { price: true },
    });
    if (!pkg)
        return res.status(400).json({ message: "Pacote inválido" });
    const baseValue = pkg.price;
    const discountPercent = Number(discount) || 0;
    const finalValue = Math.round(baseValue * (1 - discountPercent / 100));
    await prisma.debts.create({
        data: {
            userId: req.authenticatedUserId,
            clientId: Number(clientId),
            washTypeId: Number(washTypeId),
            packageId: Number(packageId),
            expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            discount: discountPercent,
            observation,
            paymentMethod,
            status,
            value: finalValue,
        },
    });
    res.status(201).json({ message: "Débito criado com sucesso" });
});
router.put("/:id", authenticate, async (req, res) => {
    const { clientId, washTypeId, packageId, expiresAt, discount, observation, paymentMethod, status, } = req.body;
    const debtId = Number(req.params.id);
    if (!req.isAdmin)
        return res.status(403);
    if (Number(discount) > 50)
        return res.status(400).json({ message: "Desconto excessivo" });
    const debt = await prisma.debts.findUnique({
        where: { id: debtId },
        select: { packageId: true },
    });
    if (!debt)
        return res.status(404).json({ message: "Débito não encontrado" });
    const pkg = await prisma.packages.findUnique({
        where: { id: Number(packageId || debt.packageId) },
        select: { price: true },
    });
    if (!pkg)
        return res.status(400).json({ message: "Pacote inválido" });
    const baseValue = pkg.price;
    const discountPercent = Number(discount) || 0;
    const finalValue = Math.round(baseValue * (1 - discountPercent / 100));
    await prisma.debts.update({
        data: {
            userId: req.authenticatedUserId,
            clientId: Number(clientId),
            washTypeId: Number(washTypeId),
            packageId: Number(packageId),
            expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            discount: discountPercent,
            observation,
            paymentMethod,
            status,
            value: finalValue,
        },
        where: { id: debtId },
    });
    res.status(200).json({ message: "Débito atualizado com sucesso" });
});
router.delete("/:id", authenticate, async (req, res) => {
    const debtId = Number(req.params.id);
    if (!req.isAdmin)
        return res.status(403);
    await prisma.debts.delete({
        where: { id: debtId },
    });
    res.status(200).json({ message: "Débito deletado com sucesso" });
});
export default router;
//# sourceMappingURL=debts.js.map