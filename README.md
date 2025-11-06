# Express API with TS, Prisma and JWT

```shell
mkdir express-api && cd express-api
```

```shell
npm init -y
```

## Production dependencies

```shell
npm install bcryptjs dotenv jsonwebtoken node-cron uuid express cors multer prisma express-rate-limit xss cookie-parser
```

- bcryptjs – hash and verify passwords.
- dotenv – load environment variables.
- jsonwebtoken – create and validate JWT tokens for authentication.
- node-cron – schedule and run automated tasks.
- uuid – generate unique identifiers.
- express – create the HTTP server and routes.
- cors – handle cross-origin requests.
- multer – upload and manage files.
- prisma – ORM to interact with the database.
- express-rate-limit – limit request rates for security.
- xss – sanitize user input and prevent cross-site scripting attacks.
- cookie-parser – to read cookies

## Dev dependencies

```shell
npm install -D typescript tsx @types/node @types/express @types/bcryptjs @types/jsonwebtoken @types/cors @types/multer @types/uuid
```

## Necessary config for package.json

```json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js"
}
```

```json
"main": "src/server.ts",
"type": "module",
```

## Starts

```shell
npx tsc --init
```

```shell
npx prisma init
```

## Necessary config for tsconfig.json

```json
"rootDir": "./src",
"outDir": "./dist",
```

## For vercel

### vercel.json

```json
{
  "version": 2,
  "builds": [
    { "src": "dist/server.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "dist/server.js" }
  ]
}
```

### Server

Note that the app is exported. This is required for deployment on Vercel.

```javascript
import express, { type Response } from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();

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

app.get("/", (req, res: Response) => {
  return res.status(200).send("Alright!");
});

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log("Server running on PORT", PORT);
  });
}

export default app;
```

Commit must happen only after building the app.

```shell
npm run build
```
