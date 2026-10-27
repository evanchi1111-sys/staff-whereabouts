import { sql } from "kysely";
import { invalidateQuery } from "@floot/realtime";
import { db } from "./db";
import type { TripRow } from "../endpoints/trips_GET.schema";

// Backend-only helpers shared by the trips endpoints.
// The live-query key the board page holds (channel q:trips:all).
export const TRIPS_QUERY_KEY = ["trips", "all"] as const;

/** Trips that are still relevant: not yet ended (with a small grace window). */
export async function loadTrips(): Promise<TripRow[]> {
  const rows = await db
    .selectFrom("trips")
    .innerJoin("staff", "staff.id", "trips.staffId")
    .select([
      "trips.id",
      "trips.staffId",
      "staff.name as staffName",
      "trips.purpose",
      "trips.place",
      "trips.startAt",
      "trips.endAt",
      "trips.note",
    ])
    .where("trips.endAt", ">", sql<Date>`now() - interval '1 hour'`)
    .orderBy("trips.startAt")
    .orderBy("trips.id")
    .execute();
  return rows.map((r) => ({
    ...r,
    startAt: new Date(r.startAt),
    endAt: new Date(r.endAt),
  }));
}

/** Tell every open board to refetch the trips list. */
export async function notifyTripsChanged(): Promise<void> {
  await invalidateQuery([...TRIPS_QUERY_KEY]);
}

/** No history is kept: drop trips that ended more than a day ago. */
export async function purgeOldTrips(): Promise<void> {
  await db
    .deleteFrom("trips")
    .where("endAt", "<", sql<Date>`now() - interval '1 day'`)
    .execute();
}
