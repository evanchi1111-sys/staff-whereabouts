import { useLiveQuery } from "../components/FlootRealtimeProvider";
import { getTrips } from "../endpoints/trips_GET.schema";

/** 所有尚未結束的行蹤；有人登記或回來時，所有開著的畫面會即時更新。 */
export function useTripsQuery() {
  return useLiveQuery({
    queryKey: ["trips", "all"],
    queryFn: async () => (await getTrips()).trips,
  });
}
