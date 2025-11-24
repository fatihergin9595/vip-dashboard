// src/db/schema/vip_levels.ts
import { pgTable, text, varchar, numeric } from "drizzle-orm/pg-core";

export const vipLevels = pgTable("vip_levels", {
  id: text("id").primaryKey(), // UUID
  name: varchar("name", { length: 100 }),

  min: numeric("min"), // min 90 günlük yatırım
  max: numeric("max"), // max 90 günlük yatırım (Elmas'ta null olabilir)
});