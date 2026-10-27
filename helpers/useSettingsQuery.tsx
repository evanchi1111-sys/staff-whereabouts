import { useQuery } from "@tanstack/react-query";
import { getSettings } from "../endpoints/settings_GET.schema";

/** 同事名單、事由選項、地點選項。 */
export function useSettingsQuery() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });
}
