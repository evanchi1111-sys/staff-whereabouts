import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../helpers/db";
import { notifyTripsChanged, purgeOldTrips } from "../../helpers/tripsData";
import { schema, OutputType } from "./change_POST.schema";

const fail = (message: string, status = 400) =>
  new Response(superjson.stringify({ error: message }), { status });

export async function handle(request: Request) {
  try {
    const json = superjson.parse(await request.text());
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "資料格式不正確");
    }
    const input = parsed.data;

    if (input.action === "create" || input.action === "update") {
      if (input.endAt.getTime() <= input.startAt.getTime()) {
        return fail("預計返回時間必須晚於外出時間");
      }
      if (input.endAt.getTime() <= Date.now()) {
        return fail("預計返回時間已經過了，請重新選擇");
      }
    }

    if (input.action === "create") {
      const staff = await db
        .selectFrom("staff")
        .select("id")
        .where("id", "=", input.staffId)
        .executeTakeFirst();
      if (!staff) return fail("找不到這位同事，請重新選擇");

      await db
        .insertInto("trips")
        .values({
          staffId: input.staffId,
          purpose: input.purpose,
          place: input.place,
          startAt: input.startAt,
          endAt: input.endAt,
          note: input.note ? input.note : null,
        })
        .execute();
      await purgeOldTrips();
    } else if (input.action === "update") {
      const updated = await db
        .updateTable("trips")
        .set({
          purpose: input.purpose,
          place: input.place,
          startAt: input.startAt,
          endAt: input.endAt,
          note: input.note ? input.note : null,
        })
        .where("id", "=", input.id)
        .returning("id")
        .executeTakeFirst();
      if (!updated) return fail("找不到這筆登記，可能已被刪除", 404);
    } else if (input.action === "end") {
      const trip = await db
        .selectFrom("trips")
        .select(["id", "startAt"])
        .where("id", "=", input.id)
        .executeTakeFirst();
      if (!trip) return fail("找不到這筆登記，可能已被刪除", 404);
      if (new Date(trip.startAt).getTime() > Date.now()) {
        return fail("還沒到外出時間，請改用「取消」");
      }
      await db
        .updateTable("trips")
        .set({ endAt: sql<Date>`now()` })
        .where("id", "=", input.id)
        .execute();
    } else {
      await db.deleteFrom("trips").where("id", "=", input.id).execute();
    }

    await notifyTripsChanged();
    return new Response(superjson.stringify({ ok: true } satisfies OutputType));
  } catch (error) {
    const message = error instanceof Error ? error.message : "操作失敗";
    return fail(message, 500);
  }
}
