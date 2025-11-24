// src/db/schema/customers.ts
import { pgTable, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const customers = pgTable("customers", {
  id: text("id").primaryKey(), // UUID olacak
  fullName: varchar("full_name", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).defaultNow(),
});