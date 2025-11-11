import { Router } from "express";
import { prisma } from "../utils/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { stringify } from "csv-stringify/sync";
const router = Router();
function checkFormat(value) {
    const formats = {
        cpf: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
        telephone: /^\d{2}\s\d{5}-\d{4}$/,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    };
    if (formats.cpf.test(value))
        return true;
    if (formats.telephone.test(value))
        return true;
    if (formats.email.test(value))
        return true;
    return false;
}
router.get("/", authenticate, async (req, res) => {
    if (!req.isAdmin)
        return res.status(403).json({ message: "Acesso negado" });
    const page = parseInt(req.query.page) || 1;
    const searchParam = req.query.searchParam?.trim() || "";
    const filter = req.query.filter;
    const take = 5;
    const skip = (page - 1) * take;
    const where = {};
    if (searchParam) {
        where.OR = [
            { name: { contains: searchParam, mode: "insensitive" } },
            { email: { contains: searchParam, mode: "insensitive" } },
            { cpf: { contains: searchParam, mode: "insensitive" } },
            { cars: { some: { plate: { contains: searchParam.replaceAll(" ", ""), mode: "insensitive" } } } },
        ];
    }
    if (filter === "active")
        where.active = true;
    else if (filter === "inactive")
        where.active = false;
    else if (filter === "expired") {
        const now = new Date();
        where.AND = [
            { debts: { some: { expiresAt: { lt: now } } } },
        ];
    }
    else if (filter === "delinquent") {
        const now = new Date();
        where.AND = [
            {
                debts: {
                    some: {
                        expiresAt: { lt: now },
                        status: "pending",
                    },
                },
            },
        ];
    }
    else {
        where.active = true;
    }
    const [clients, total] = await Promise.all([
        prisma.clients.findMany({
            skip,
            take,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                address: true,
                cpf: true,
                rg: true,
                phone: true,
                email: true,
                active: true,
                observation: true,
            },
            where,
        }),
        prisma.clients.count({ where }),
    ]);
    const totalPages = Math.ceil(total / take);
    res.status(200).json({ content: clients, totalPages });
});
router.get("/csv", authenticate, async (req, res) => {
    if (!req.isAdmin)
        return res.status(403).json({ message: "Acesso negado" });
    const searchParam = req.query.searchParam?.trim() || "";
    const filter = req.query.filter;
    const where = {};
    if (searchParam) {
        where.OR = [
            { name: { contains: searchParam, mode: "insensitive" } },
            { email: { contains: searchParam, mode: "insensitive" } },
            { cpf: { contains: searchParam, mode: "insensitive" } },
            { cars: { some: { plate: { contains: searchParam.replaceAll(" ", ""), mode: "insensitive" } } } },
        ];
    }
    if (filter === "active")
        where.active = true;
    else if (filter === "inactive")
        where.active = false;
    else if (filter === "expired") {
        const now = new Date();
        where.AND = [
            { debts: { some: { expiresAt: { lt: now } } } },
        ];
    }
    else if (filter === "delinquent") {
        const now = new Date();
        where.AND = [
            {
                debts: {
                    some: {
                        expiresAt: { lt: now },
                        status: "pending",
                    },
                },
            },
        ];
    }
    else {
        where.active = true;
    }
    const clients = await prisma.clients.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            address: true,
            cpf: true,
            rg: true,
            phone: true,
            email: true,
            active: true,
            observation: true,
        },
        where,
    });
    const csv = stringify(clients, {
        header: true,
        columns: [
            { key: "id", header: "ID" },
            { key: "name", header: "Nome" },
            { key: "address", header: "Endereço" },
            { key: "cpf", header: "CPF" },
            { key: "rg", header: "RG" },
            { key: "phone", header: "Telefone" },
            { key: "email", header: "E-mail" },
            { key: "active", header: "Ativo" },
            { key: "observation", header: "Observação" },
        ],
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=clientes.csv");
    res.status(200).send(csv);
});
router.get("/:id", authenticate, async (req, res) => {
    const clientId = Number(req.params.id);
    const client = await prisma.clients.findUnique({ where: { id: clientId } });
    if (!client)
        return res.status(404).json({ message: "Cliente não encontrado" });
    if (!req.isAdmin)
        return res.status(403).json({ message: "Acesso negado" });
    res.status(200).json(client);
});
router.post("/", authenticate, async (req, res) => {
    const { birthDate, name, address, cpf, rg, phone, email, observation } = req.body;
    if (!checkFormat(cpf)) {
        return res.status(403).json({ message: "Formato inválido de CPF, utilize 000.000.000-00" });
    }
    if (!checkFormat(phone)) {
        return res.status(403).json({ message: "Formato inválido de telefone, utilize DDD 00000-0000" });
    }
    if (!checkFormat(email)) {
        return res.status(403).json({ message: "Formato inválido de email" });
    }
    if (!req.isAdmin)
        return res.status(403).json({ message: "Permissão negada" });
    const cpfExists = await prisma.clients.findFirst({
        where: { cpf },
    });
    if (cpfExists)
        return res.status(403).json({ message: "CPF já cadastrado" });
    await prisma.clients.create({
        data: {
            birthDate,
            name,
            address,
            cpf,
            rg,
            phone,
            email,
            observation: observation ?? ""
        },
    });
    res.status(201).json({ message: "Cliente criado com sucesso" });
});
router.put("/:id", authenticate, async (req, res) => {
    const clientId = Number(req.params.id);
    const { birthDate, name, address, cpf, rg, phone, email, active, observation } = req.body;
    if (!checkFormat(cpf)) {
        return res.status(403).json({ message: "Formato inválido de CPF, utilize 000.000.000-00" });
    }
    if (!checkFormat(phone)) {
        return res.status(403).json({ message: "Formato inválido de telefone, utilize DDD 00000-0000" });
    }
    if (!checkFormat(email)) {
        return res.status(403).json({ message: "Formato inválido de email" });
    }
    const client = await prisma.clients.findUnique({ where: { id: clientId } });
    if (!client)
        return res.status(404).json({ message: "Cliente não encontrado" });
    if (!req.isAdmin)
        return res.status(403).json({ message: "Permissão negada" });
    const cpfExists = await prisma.clients.findFirst({
        where: {
            cpf,
            id: { not: clientId },
        },
    });
    if (cpfExists)
        return res.status(403).json({ message: "CPF já cadastrado" });
    await prisma.clients.update({
        where: { id: clientId },
        data: {
            birthDate,
            name,
            address,
            cpf,
            rg,
            phone,
            email,
            active,
            observation: observation ?? ""
        },
    });
    res.status(200).json({ message: "Cliente atualizado com sucesso" });
});
router.patch("/:id", authenticate, async (req, res) => {
    const clientId = Number(req.params.id);
    const client = await prisma.clients.findUnique({ where: { id: clientId } });
    if (!client)
        return res.status(404).json({ message: "Cliente não encontrado" });
    if (!req.isAdmin)
        return res.status(403).json({ message: "Accesso negado" });
    await prisma.clients.update({
        where: { id: clientId },
        data: { active: !client.active }
    });
    res.status(200).json({ message: "Cliente deletado com sucesso" });
});
router.delete("/:id", authenticate, async (req, res) => {
    const clientId = Number(req.params.id);
    const client = await prisma.clients.findUnique({ where: { id: clientId } });
    if (!client)
        return res.status(404).json({ message: "Cliente não encontrado" });
    if (!req.isAdmin)
        return res.status(403).json({ message: "Accesso negado" });
    await prisma.clients.delete({ where: { id: clientId } });
    res.status(200).json({ message: "Cliente deletado com sucesso" }); // ok
});
export default router;
//# sourceMappingURL=clients.js.map