import { Router, type Response } from "express";
import { prisma } from "../utils/prisma.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate.js";

const router = Router();

router.get("/", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.isAdmin) return res.status(403).json({ message: "Acesso negado" });

  const page = parseInt(req.query.page as string) || 1;
  const searchParam = (req.query.searchParam as string)?.trim() || "";
  const filter = req.query.filter as string;
  const take = 5;
  const skip = (page - 1) * take;

  const where: any = {};

  if (searchParam) {
    where.OR = [
      { name: { contains: searchParam, mode: "insensitive" } },
      { email: { contains: searchParam, mode: "insensitive" } },
      { cpf: { contains: searchParam, mode: "insensitive" } },
      { cars: { some: { plate: { contains: searchParam, mode: "insensitive" } } } },
    ];
  }

  if (filter === "active") where.active = true;
  else if (filter === "inactive") where.active = false;
  else if (filter === "expired") {
    const now = new Date();

    where.AND = [
      // tem pelo menos uma venda expirada
      { debts: { some: { expiresAt: { lt: now } } } },
      // não tem nenhuma venda futura
      { debts: { none: { expiresAt: { gte: now } } } },
    ];
  } else {
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

router.get("/:id", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const clientId = Number(req.params.id);

  const client = await prisma.clients.findUnique({ where: { id: clientId } });
  if (!client) return res.status(404).json({ message: "Cliente não encontrado" });

  if (!req.isAdmin)
    return res.status(403).json({ message: "Acesso negado" });

  res.status(200).json(client);
});

router.post("/", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { birthDate, name, address, cpf, rg, phone, email, observation } = req.body;

  if (!req.isAdmin)
    return res.status(403).json({ message: "Permissão negada" });

  const cpfExists = await prisma.clients.findFirst({
    where: { cpf },
  });
  if (cpfExists) return res.status(403).json({ message: "CPF já cadastrado" });

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

router.put("/:id", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const clientId = Number(req.params.id);
  const { birthDate, name, address, cpf, rg, phone, email, active, observation } = req.body;

  const client = await prisma.clients.findUnique({ where: { id: clientId } });
  if (!client) return res.status(404).json({ message: "Cliente não encontrado" });

  if (!req.isAdmin)
    return res.status(403).json({ message: "Permissão negada" });

  const cpfExists = await prisma.clients.findFirst({
    where: {
      cpf,
      id: { not: clientId },
    },
  });
  if (cpfExists) return res.status(403).json({ message: "CPF já cadastrado" });

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

router.patch("/:id", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const clientId = Number(req.params.id);

  const client = await prisma.clients.findUnique({ where: { id: clientId } });
  if (!client) return res.status(404).json({ message: "Cliente não encontrado" });

  if (!req.isAdmin)
    return res.status(403).json({ message: "Accesso negado" });

  await prisma.clients.update({
    where: { id: clientId },
    data: { active: !client.active }
  });

  res.status(200).json({ message: "Cliente deletado com sucesso" });
});

router.delete("/:id", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const clientId = Number(req.params.id);

  const client = await prisma.clients.findUnique({ where: { id: clientId } });
  if (!client) return res.status(404).json({ message: "Cliente não encontrado" });

  if (!req.isAdmin)
    return res.status(403).json({ message: "Accesso negado" });

  await prisma.clients.delete({ where: { id: clientId } });

  res.status(200).json({ message: "Cliente deletado com sucesso" }); // ok
});

export default router;