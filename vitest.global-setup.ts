import { execSync } from "node:child_process";
import path from "node:path";
import { config } from "dotenv";

// Runs once before the whole test run: make sure stockpilot_test has every
// migration applied, so integration tests never run against a stale schema.
export default async function globalSetup() {
  const result = config({ path: path.resolve(process.cwd(), ".env.test"), quiet: true });
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, ...result.parsed },
  });
}
