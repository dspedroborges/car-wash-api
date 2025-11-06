import { Router } from "express";
import { prisma } from "../utils/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import multer from "multer";
import { uploadImage } from "../utils/upload.js";
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/"))
            cb(null, true);
        else
            cb(new Error("Apenas imagens são permitidas"), false);
    },
});
const router = Router();
router.get("/", authenticate, async (req, res) => {
    if (!req.isAdmin)
        return res.status(403).send("Forbidden");
    const page = parseInt(req.query.page) || 1;
    const take = 10;
    const skip = (page - 1) * take;
    const [cars, total] = await Promise.all([
        prisma.cars.findMany({
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: { client: true, photos: true }
        }),
        prisma.cars.count(),
    ]);
    res.status(200).json({ cars, total });
});
router.get("/:id", authenticate, async (req, res) => {
    const carId = Number(req.params.id);
    const car = await prisma.cars.findUnique({
        where: { id: carId },
        include: { client: true, photos: true }
    });
    if (!car)
        return res.status(404).json({ message: "Car not found" });
    res.status(200).json(car);
});
router.get("/client/:id", authenticate, async (req, res) => {
    const clientId = Number(req.params.id);
    const cars = await prisma.cars.findMany({
        where: { clientId },
        include: { photos: true }
    });
    res.status(200).json(cars);
});
router.post("/", authenticate, upload.array("images"), async (req, res) => {
    const { clientId: _clientId, model, color, plate } = req.body;
    const clientId = Number(_clientId);
    if (!req.isAdmin)
        return res.status(403).json({ message: "Acesso negado" });
    const existing = await prisma.cars.findUnique({ where: { plate } });
    if (existing)
        return res.status(400).json({ message: "Já existe um carro com essa placa" });
    const car = await prisma.cars.create({ data: { clientId, model, color, plate } });
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        try {
            for (const file of req.files) {
                const { filename, url } = await uploadImage(file, `cars/${car.id}`);
                await prisma.carPhotos.create({
                    data: {
                        carId: car.id,
                        filename,
                        url,
                    },
                });
            }
        }
        catch (err) {
            return res.status(400).json({ message: err.message });
        }
    }
    res.status(201).json({ message: "Carro criado com sucesso" });
});
router.put("/:id", authenticate, upload.array("images"), async (req, res) => {
    const carId = Number(req.params.id);
    const { model, color, plate, active } = req.body;
    if (!req.isAdmin)
        return res.status(403).json({ message: "Acesso negado" });
    const car = await prisma.cars.findUnique({ where: { id: carId } });
    if (!car)
        return res.status(404).json({ message: "Carro não encontrado" });
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        try {
            await prisma.carPhotos.deleteMany({ where: { carId } });
            for (const file of req.files) {
                const { filename, url } = await uploadImage(file, `cars/${carId}`);
                await prisma.carPhotos.create({
                    data: {
                        carId,
                        filename,
                        url,
                    },
                });
            }
        }
        catch (err) {
            return res.status(400).json({ message: err.message });
        }
    }
    await prisma.cars.update({
        where: { id: carId },
        data: { model, color, plate, active: active == "true" },
    });
    res.status(200).json({ message: "Carro atualizado com sucesso" });
});
router.delete("/:id", authenticate, async (req, res) => {
    const carId = Number(req.params.id);
    if (!req.isAdmin)
        return res.status(403).json({ message: "Acesso negado" });
    await prisma.cars.delete({ where: { id: carId } });
    res.status(200).json({ message: "Carro deletado com sucesso" });
});
export default router;
//# sourceMappingURL=cars.js.map