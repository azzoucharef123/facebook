import "dotenv/config";
import { startWorkerLoop } from "./lib/worker";

startWorkerLoop().catch((error) => {
  console.error("Worker failed to start.", error);
  process.exit(1);
});
