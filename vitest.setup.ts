import { config } from "dotenv";
import path from "node:path";

// Every test run — unit and integration alike — uses the isolated test
// database and secret, never the dev .env. See docs/ARCHITECTURE.md §5.
config({ path: path.resolve(process.cwd(), ".env.test"), quiet: true });
