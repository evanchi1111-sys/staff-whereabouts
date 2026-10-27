import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({});

export type InputType = z.infer<typeof schema>;

export type TripRow = {
  id: number;
  staffId: number;
  staffName: string;
  purpose: string;
  place: string;
  startAt: Date;
  endAt: Date;
  note: string | null;
};

export type OutputType = {
  trips: TripRow[];
};

export const getTrips = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/trips`, {
    method: "GET",
    ...init,
  });
  const text = await result.text();
  if (!result.ok) {
    let message = "讀取行蹤失敗";
    try {
      message = superjson.parse<{ error: string }>(text).error;
    } catch {}
    throw new Error(message);
  }
  return superjson.parse<OutputType>(text);
};
