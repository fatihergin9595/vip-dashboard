import { NextResponse } from "next/server";
import { db } from "eskisrc/db/client";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const [tables]: any = await Promise.all([
      db.execute(sql`
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_name IN ('members','deposits','vip_levels')
          AND table_schema IN ('app','public')
        ORDER BY table_schema, table_name;
      `),
    ]);

    const [[appMembersCount]]: any = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int AS c FROM "app"."members"`).catch(() => [{ c: null }]),
    ]).catch(()=>[{c:null}]);

    const [[publicMembersCount]]: any = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int AS c FROM "public"."members"`).catch(() => [{ c: null }]),
    ]).catch(()=>[{c:null}]);

    const [[appDepositsCount]]: any = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int AS c FROM "app"."deposits"`).catch(() => [{ c: null }]),
    ]).catch(()=>[{c:null}]);

    return NextResponse.json({
      ok: true,
      tables,
      counts: {
        app_members: appMembersCount?.c,
        public_members: publicMembersCount?.c,
        app_deposits: appDepositsCount?.c,
      },
    });
  } catch (e: any) {
    console.error("debug-members error", e);
    return NextResponse.json({ ok: false, message: e?.message ?? String(e) }, { status: 500 });
  }
}