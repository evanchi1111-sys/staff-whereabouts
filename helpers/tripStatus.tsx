export type TripStatus = "scheduled" | "out" | "ended";

/**
 * 預定外出：還沒到外出時間
 * 外出中：已到外出時間、還沒到預計返回時間
 * ended：已過預計返回時間（看板不顯示）
 */
export function tripStatus(
  trip: { startAt: Date; endAt: Date },
  now: Date,
): TripStatus {
  if (now.getTime() < trip.startAt.getTime()) return "scheduled";
  if (now.getTime() < trip.endAt.getTime()) return "out";
  return "ended";
}
