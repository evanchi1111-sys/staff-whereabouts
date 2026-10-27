import { createToken } from "@floot/realtime";
import superjson from "superjson";

// Mints a realtime token for the current connection. Who the user is and which
// channels they may access are both yours to set.
const json = (data: unknown, status = 200) =>
  new Response(superjson.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function handle(request: Request) {
  // No login in this app: every open board gets its own anonymous id.
  const userId = "viewer-" + crypto.randomUUID();

  // Everyone in the office may see the trips board, and nothing else is live.
  // The board holds the live query ["trips", "all"] (channel q:trips:all).
  const channels: string[] = ["q:trips:*"];

  const result = await createToken({ userId, channels, ttlSeconds: 3600 });
  if (!result.ok) {
    return json({ error: result.error.message }, 500);
  }
  return json({ token: result.token, wssEndpoint: result.wssEndpoint, userId });
}
