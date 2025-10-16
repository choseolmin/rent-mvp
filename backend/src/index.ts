// backend/src/index.ts
import cron from "node-cron";
import express from "express";

import { getContracts, tenant, ov } from "./ethers";

const app = express();
const PORT = process.env.PORT || 3000;
const CRON_TZ = process.env.CRON_TZ || "Asia/Seoul";

app.get("/healthz", (_, res) => res.json({ ok: true, tenant: tenant.address }));

cron.schedule("* * * * *", async () => {
  try {
    const { man } = getContracts();

    const n: bigint = await man.nextLeaseId(); // 1..n
    if (n === 0n) {
      console.log("[cron] no leases yet");
      return;
    }

    for (let id = 1n; id <= n; id++) {
      try {
        const L = await man.leases(id);
        // 내 지갑이 tenant이고 active인 것만 대상
        if (!L.active) {
          // console.log(`[cron] lease #${id} inactive`);
          continue;
        }
        if (L.tenant.toLowerCase() !== tenant.address.toLowerCase()) {
          // console.log(`[cron] lease #${id} is not mine`);
          continue;
        }
        const due = await man.dueNow(id);
        if (!due) {
          console.log(`[cron] not due yet for lease #${id}`);
          continue;
        }
        const tx = await man.connect(tenant).payRent(id, ov);
        console.log(`[cron] payRent sent for lease #${id}: ${tx.hash}`);
        const rc = await tx.wait();
        console.log(`[cron] payRent mined for lease #${id}: block=${rc?.blockNumber}`);
      } catch (e: any) {
        console.error(`[cron] lease #${id} error:`, e?.shortMessage || e?.message || e);
      }
    }
  } catch (e: any) {
    console.error("[cron] fatal error:", e?.message || e);
  }
}, { timezone: CRON_TZ });

app.listen(PORT, () => {
  console.log(`backend up on :${PORT} (auto-discover leases for tenant ${tenant.address})`);
});
