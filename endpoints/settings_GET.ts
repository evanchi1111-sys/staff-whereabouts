import superjson from "superjson";
import { db } from "../helpers/db";
import { OutputType } from "./settings_GET.schema";

export async function handle(request: Request) {
  try {
    const staff = await db
      .selectFrom("staff")
      .select(["id", "name"])
      .orderBy("sortOrder")
      .orderBy("id")
      .execute();
    const options = await db
      .selectFrom("options")
      .select(["id", "kind", "label"])
      .orderBy("sortOrder")
      .orderBy("id")
      .execute();

    const body: OutputType = {
      staff,
      purposes: options
        .filter((o) => o.kind === "purpose")
        .map(({ id, label }) => ({ id, label })),
      places: options
        .filter((o) => o.kind === "place")
        .map(({ id, label }) => ({ id, label })),
    };
    return new Response(superjson.stringify(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取設定失敗";
    return new Response(superjson.stringify({ error: message }), {
      status: 500,
    });
  }
}
