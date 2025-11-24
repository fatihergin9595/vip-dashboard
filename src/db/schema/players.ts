// src/db/schema/players.ts
import {
  pgTable,
  integer,
  text,
  timestamp,
  real,
} from "drizzle-orm/pg-core";

// public.players tablosu
export const players = pgTable("players", {
  id: integer("id").primaryKey(),
  username: text("username").notNull(),
  backofficeId: integer("backoffice_id").notNull(),

  // vip_status USER-DEFINED enum, biz text olarak alıyoruz
  vipStatus: text("vip_status").notNull(),

  ironRewardAt: timestamp("iron_vip_reward_claimed_at", {
    withTimezone: false,
  }),
  bronzeRewardAt: timestamp("bronze_vip_reward_claimed_at", {
    withTimezone: false,
  }),
  silverRewardAt: timestamp("silver_vip_reward_claimed_at", {
    withTimezone: false,
  }),
  goldRewardAt: timestamp("gold_vip_reward_claimed_at", {
    withTimezone: false,
  }),
  platRewardAt: timestamp("plat_vip_reward_claimed_at", {
    withTimezone: false,
  }),
  diamondRewardAt: timestamp("diamond_vip_reward_claimed_at", {
    withTimezone: false,
  }),

  createdAt: timestamp("created_at", { withTimezone: false }),
  updatedAt: timestamp("updated_at", { withTimezone: false }),

  // Son 90 gün yatırımı
  deposit90d: real("deposit_amount_last_90d"),
});

// TypeScript tipleri (istersen kullan)
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;