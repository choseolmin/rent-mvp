// backend/src/index.ts
import cron from "node-cron";
import express from "express";
import { getContracts, tenant, ov } from "./ethers";
import * as dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const LEASE_ID = BigInt(process.env.LEASE_ID || "3");
const CRON_TZ = process.env.CRON_TZ || "Asia/Seoul";

app.get("/healthz", (_,res)=>res.send("ok"));

cron.schedule("*/10 * * * *", async () => {
  try {
    // ✅ getContracts는 동기 반환이므로 await 금지
    const { man } = getContracts();

    const due = await man.dueNow(LEASE_ID);
    if (!due) {
      console.log(`[cron] not due yet for lease #${LEASE_ID}`);
      return;
    }
    const tx = await man.connect(tenant).payRent(LEASE_ID, ov);
    console.log(`[cron] payRent sent: ${tx.hash}`);
    const rc = await tx.wait();
    console.log(`[cron] payRent mined: block=${rc?.blockNumber}`);
  } catch (e:any) {
    console.error("[cron] error:", e?.message || e);
  }
}, { timezone: CRON_TZ });

app.listen(PORT, ()=> console.log(`backend up on :${PORT}`));
