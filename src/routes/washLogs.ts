import { Router, type Request, type Response } from "express";
import { prisma } from "../utils/prisma.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate.js";
import multer from "multer";
import { uploadImage } from "../utils/upload.js";

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new Error("Apenas imagens são permitidas") as any, false);
    },
});

const router = Router();

router.get("/", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.isAdmin) return res.status(403).json({ message: "Acesso negado" });

    const page = parseInt(req.query.page as string) || 1;
    const take = 10;
    const skip = (page - 1) * take;

    const [washLogs, total] = await Promise.all([
        prisma.washLogs.findMany({
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: { WashLogPicturesBefore: true, WashLogPicturesAfter: true },
        }),
        prisma.washLogs.count(),
    ]);

    res.status(200).json(washLogs);
});

router.get("/car/:id", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.isAdmin) return res.status(403).json({ message: "Acesso negado" });

    const carId = Number(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const filter = req.query.filter;
    const take = 10;
    const skip = (page - 1) * take;

    const where: any = { carId };

    // se o mês foi informado, aplica o filtro de data
    if (filter !== undefined && filter !== "") {
        const month = Number(filter);
        const year = new Date().getFullYear();

        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 1);

        where.createdAt = {
            gte: startDate,
            lt: endDate,
        };
    }

    const [washLogs, total] = await Promise.all([
        prisma.washLogs.findMany({
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: {
                WashLogPicturesBefore: true,
                WashLogPicturesAfter: true,
                user: true,
            },
            where,
        }),
        prisma.washLogs.count({ where }),
    ]);

    res.status(200).json({
        content: washLogs,
        totalPages: Math.ceil(total / take),
    });
});

router.get("/:id", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    const washLogId = Number(req.params.id);

    const washLog = await prisma.washLogs.findUnique({
        where: { id: washLogId },
        include: { WashLogPicturesBefore: true, WashLogPicturesAfter: true },
    });

    if (!washLog) return res.status(404).json({ message: "Tipo de lavagem não encontrada" });
    res.status(200).json(washLog);
});

router.post(
    "/",
    authenticate,
    upload.fields([
        { name: "washLogPicturesBefore", maxCount: 10 },
        { name: "washLogPicturesAfter", maxCount: 10 },
    ]),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { carId } = req.body;
            if (!req.isAdmin) return res.status(403).json({ message: "Acesso negado" });

            const car = await prisma.cars.findUnique({ where: { id: Number(carId) }, select: { clientId: true } });
            if (!car) return res.status(404).json({ message: "Carro não encontrado" });

            const now = new Date();
            const activeDebt = await prisma.debts.findFirst({
                where: {
                    clientId: car.clientId,
                    expiresAt: { gt: now },
                    status: { not: "canceled" },
                },
                include: {
                    washType: { select: { name: true } },
                    package: { select: { name: true } },
                },
                orderBy: { createdAt: "desc" },
            });

            if (!activeDebt) return res.status(404).json({ message: "Nenhum débito ativo encontrado" });
            if (!activeDebt.washType || !activeDebt.package) return res.status(404).json({ message: "Dados incompletos" });

            const details = `Lavagem: ${activeDebt.washType.name} | Pacote: ${activeDebt.package.name}`;
            const hhmm = now.toTimeString().slice(0, 5);

            const washLog = await prisma.washLogs.create({
                data: {
                    details,
                    carId: Number(carId),
                    startedAt: hhmm,
                    endedAt: "",
                    userId: Number(req.authenticatedUserId),
                },
            });

            const files = req.files as {
                washLogPicturesBefore?: Express.Multer.File[];
                washLogPicturesAfter?: Express.Multer.File[];
            };

            const beforeFiles = files.washLogPicturesBefore || [];
            const afterFiles = files.washLogPicturesAfter || [];

            for (const file of beforeFiles) {
                const { filename, url } = await uploadImage(file, `washLogs/${washLog.id}/before`);
                await prisma.washLogPicturesBefore.create({
                    data: { washLogId: washLog.id, filename, url },
                });
            }

            for (const file of afterFiles) {
                const { filename, url } = await uploadImage(file, `washLogs/${washLog.id}/after`);
                await prisma.washLogPicturesAfter.create({
                    data: { washLogId: washLog.id, filename, url },
                });
            }

            res.status(201).json({ message: "Log de lavagem criado com sucesso", washLog });
        } catch (err: any) {
            res.status(500).json({ message: err.message || "Erro ao criar log de lavagem" });
        }
    }
);

router.put(
    "/:id",
    authenticate,
    upload.fields([
        { name: "washLogPicturesBefore", maxCount: 10 },
        { name: "washLogPicturesAfter", maxCount: 10 },
    ]),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const washLogId = Number(req.params.id);
            const { details, carId } = req.body;

            if (!req.isAdmin) return res.status(403).json({ message: "Acesso negado" });

            const washLog = await prisma.washLogs.findUnique({ where: { id: washLogId } });
            if (!washLog) return res.status(404).json({ message: "Log não encontrado" });

            await prisma.washLogPicturesBefore.deleteMany({ where: { washLogId } });
            await prisma.washLogPicturesAfter.deleteMany({ where: { washLogId } });

            const files = req.files as {
                washLogPicturesBefore?: Express.Multer.File[];
                washLogPicturesAfter?: Express.Multer.File[];
            };

            const beforeFiles = files.washLogPicturesBefore || [];
            const afterFiles = files.washLogPicturesAfter || [];

            for (const file of beforeFiles) {
                const { filename, url } = await uploadImage(file, `washLogs/${washLogId}/before`);
                await prisma.washLogPicturesBefore.create({
                    data: { washLogId, filename, url },
                });
            }

            for (const file of afterFiles) {
                const { filename, url } = await uploadImage(file, `washLogs/${washLogId}/after`);
                await prisma.washLogPicturesAfter.create({
                    data: { washLogId, filename, url },
                });
            }

            const hhmm = new Date().toTimeString().slice(0, 5);
            await prisma.washLogs.update({
                where: { id: washLogId },
                data: { details, carId: Number(carId), endedAt: hhmm },
            });

            res.status(200).json({ message: "Log de lavagem atualizado com sucesso" });
        } catch (err: any) {
            res.status(500).json({ message: err.message || "Erro ao atualizar log de lavagem" });
        }
    }
);

// Delete a wash type
router.delete("/:id", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    const washLogId = Number(req.params.id);

    if (!req.isAdmin) return res.status(403).json({ message: "Acesso negado" });

    await prisma.washLogs.delete({ where: { id: washLogId } });
    res.status(200).json({ message: "Tipo de lavagem deletada com sucesso" });
});

export default router;