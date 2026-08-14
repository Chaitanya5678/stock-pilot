import { config } from "dotenv";

// Must be the first import in prisma/seed.ts. Under ESM, a module's imports
// are fully evaluated before its own top-level statements run, regardless of
// where those statements are written relative to the import declarations —
// so a dotenv.config() call in seed.ts's own body would run after
// prismaClient.ts (imported later in the same file) has already read
// process.env.DATABASE_URL. Isolating the load in its own module and
// importing it first makes it part of the import-evaluation phase, so it
// runs before prismaClient.ts is evaluated.
config({ quiet: true });
