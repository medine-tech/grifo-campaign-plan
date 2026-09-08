import { migrate, closeDb } from "../src/lib/db";
await migrate();
await closeDb();
console.log("Database migrations applied.");
