import cron from "node-cron";
import { prisma } from "../utils/prisma";

// Runs every Sunday at midnight
cron.schedule("0 0 * * 0", async () => {
  console.log("[CRON] Cleaning revoked tokens...");

  try {
    const deleted = await prisma.revokedTokens.deleteMany({});
    console.log(`[CRON] Deleted ${deleted.count} revoked tokens`);
  } catch (err) {
    console.error("[CRON] Error during cleanup:", err);
  }
});