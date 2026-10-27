import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postTripsChange } from "../endpoints/trips/change_POST.schema";

/** 新增、修改、結束（我已回來）、取消外出登記。 */
export function useChangeTrips() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postTripsChange,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["trips", "all"] }),
  });
}
