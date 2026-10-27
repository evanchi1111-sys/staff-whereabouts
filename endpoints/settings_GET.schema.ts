import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({});

export type InputType = z.infer<typeof schema>;

export type SettingsOption = { id: number; label: string };

export type OutputType = {
  staff: { id: number; name: string }[];
  purposes: SettingsOption[];
  places: SettingsOption[];
};

export const getSettings = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/settings`, {
    method: "GET",
    ...init,
  });
  const text = await result.text();
  if (!result.ok) {
    let message = "讀取設定失敗";
    try {
      message = superjson.parse<{ error: string }>(text).error;
    } catch {}
    throw new Error(message);
  }
  return superjson.parse<OutputType>(text);
};
