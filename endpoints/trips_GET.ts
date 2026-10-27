import superjson from "superjson";
import { loadTrips } from "../helpers/tripsData";
import { OutputType } from "./trips_GET.schema";

export async function handle(request: Request) {
  try {
    const trips = await loadTrips();
    return new Response(superjson.stringify({ trips } satisfies OutputType));
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取行蹤失敗";
    return new Response(superjson.stringify({ error: message }), {
      status: 500,
    });
  }
}
