import { z } from "zod";
import superjson from "superjson";

const id = z.number().int().positive();

export const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("addStaff"),
    name: z.string().trim().min(1, "請輸入姓名").max(20, "姓名最多 20 個字"),
  }),
  z.object({ action: z.literal("removeStaff"), id }),
  z.object({
    action: z.literal("addOption"),
    kind: z.enum(["purpose", "place"]),
    label: z.string().trim().min(1, "請輸入名稱").max(30, "名稱最多 30 個字"),
  }),
  z.object({ action: z.literal("removeOption"), id }),
]);

export type InputType = z.infer<typeof schema>;

export type OutputType = { ok: true };

export const postSettingsChange = async (
  body: InputType,
  init?: RequestInit,
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/settings/change`, {
    method: "POST",
    body: superjson.stringify(validatedInput),
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await result.text();
  if (!result.ok) {
    let message = "操作失敗，請稍後再試";
    try {
      message = superjson.parse<{ error: string }>(text).error;
    } catch {}
    throw new Error(message);
  }
  return superjson.parse<OutputType>(text);
};
