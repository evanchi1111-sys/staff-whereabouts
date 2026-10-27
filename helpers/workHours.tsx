// 上班時間 07:30 – 16:30。16:30 後全部顯示「下班」，隔天 07:30 自動回到「上班中」。
const START_MINUTES = 7 * 60 + 30;
const END_MINUTES = 16 * 60 + 30;

export const workHours = {
  /** 現在是不是上班時間 */
  isWorkTime(now: Date): boolean {
    const day = now.getDay();
    if (day === 0 || day === 6) return false; // 週末不呈現
    const minutes = now.getHours() * 60 + now.getMinutes();
    return minutes >= START_MINUTES && minutes < END_MINUTES;
  },
  /** 當天的下班時間（外出登記到這時候自動結束） */
  endOfWorkday(now: Date): Date {
    const d = new Date(now);
    d.setHours(Math.floor(END_MINUTES / 60), END_MINUTES % 60, 0, 0);
    return d;
  },
};
