import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postSettingsChange } from "../endpoints/settings/change_POST.schema";

/** 新增或刪除同事、事由、地點。 */
export function useChangeSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postSettingsChange,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["settings"] }),
        queryClient.invalidateQueries({ queryKey: ["trips", "all"] }),
      ]);
    },
  });
}
