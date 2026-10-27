import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../helpers/db";
import { notifyTripsChanged } from "../../helpers/tripsData";
import { schema, OutputType } from "./change_POST.schema";

const fail = (message: string, status = 400) =>
  new Response(superjson.stringify({ error: message }), { status });

const isDuplicate = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  (error as { code?: string }).code === "23505";

export async function handle(request: Request) {
  try {
    const json = superjson.parse(await request.text());
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "資料格式不正確");
    }
    const input = parsed.data;

    if (input.action === "addStaff") {
      try {
        await db
          .insertInto("staff")
          .values({
            name: input.name,
            sortOrder: sql<number>`(SELECT COALESCE(MAX(sort_order), 0) + 1 FROM staff)`,
          })
          .execute();
      } catch (error) {
        if (isDuplicate(error)) return fail("名單裡已經有這個姓名");
        throw error;
      }
    } else if (input.action === "removeStaff") {
      // 該同事的外出登記會一併刪除
      await db.deleteFrom("staff").where("id", "=", input.id).execute();
      await notifyTripsChanged();
    } else if (input.action === "addOption") {
      try {
        await db
          .insertInto("options")
          .values({
            kind: input.kind,
            label: input.label,
            sortOrder: sql<number>`(SELECT COALESCE(MAX(sort_order), 0) + 1 FROM options WHERE kind = ${input.kind})`,
          })
          .execute();
      } catch (error) {
        if (isDuplicate(error)) return fail("已經有相同的選項");
        throw error;
      }
    } else {
      await db.deleteFrom("options").where("id", "=", input.id).execute();
    }

    return new Response(superjson.stringify({ ok: true } satisfies OutputType));
  } catch (error) {
    const message = error instanceof Error ? error.message : "操作失敗";
    return fail(message, 500);
  }
}
