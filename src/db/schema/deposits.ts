// src/db/schema/deposits.ts
import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const deposits = pgTable("deposits", {
  id: text("id").primaryKey(), // UUID
  playerId: text("player_id"), // players.id INTEGER değil! bizim CUSTOMER değil! gerçek player tablosu
  amount: numeric("amount"),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).defaultNow(),
});