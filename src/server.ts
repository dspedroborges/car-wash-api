import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import usersRoutes from "./routes/users.js";
import clientsRoutes from "./routes/clients.js";
import debtsRoutes from "./routes/debts.js";
import authRoutes from "./routes/auth.js";
import washTypesRoutes from "./routes/washTypes.js";
import washLogsRoutes from "./routes/washLogs.js";
import packagesRoutes from "./routes/packages.js";
import carsRoutes from "./routes/cars.js";
import "./jobs/cleanupRevokedTokens.js";
import { prisma } from "./utils/prisma.js";
import { encryptPassword } from "./utils/auth.js";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { xssSanitizerMiddleware } from "./middleware/xss.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests, please try again later."
  })
);
app.set("trust proxy", true);
app.use(xssSanitizerMiddleware);

app.use(cors({
  origin: "https://lava-jato-five.vercel.app/",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use("/uploads", express.static("uploads"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/users", usersRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/debts", debtsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/wash-types", washTypesRoutes);
app.use("/api/wash-logs", washLogsRoutes);
app.use("/api/packages", packagesRoutes);
app.use("/api/cars", carsRoutes);

app.get("/", async (req, res) => {
  res.send("API running!");
  const exists = await prisma.users.findUnique({ where: { username: "admin" } });
  if (!exists) {
    await prisma.users.create({
      data: {
        username: "admin",
        password: await encryptPassword("123"),
        type: "admin",
        role: {
          create: {
            name: "admin"
          }
        }
      }
    });
  }
});

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log("Server running on PORT", PORT);
  });
}

export default app;