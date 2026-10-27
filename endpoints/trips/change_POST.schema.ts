import { z } from "zod";
import superjson from "superjson";

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `請填寫${label}`)
    .max(max, `${label}最多 ${max} 個字`);

const tripFields = {
  purpose: requiredText("公務事由", 30),
  place: requiredText("前往地點", 30),
  startAt: z.date(),
  endAt: z.date(),
  note: z.string().trim().max(200, "備註最多 200 個字").optional(),
};

const id = z.number().int().positive();

export const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    staffId: id,
    ...tripFields,
  }),
  z.object({
    action: z.literal("update"),
    id,
    ...tripFields,
  }),
  // 我已回來：把結束時間改成現在
  z.object({ action: z.literal("end"), id }),
  // 取消登記：直接刪除
  z.object({ action: z.literal("cancel"), id }),
]);

export type InputType = z.infer<typeof schema>;

export type OutputType = { ok: true };

export const postTripsChange = async (
  body: InputType,
  init?: RequestInit,
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/trips/change`, {
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
