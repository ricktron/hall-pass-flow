import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import tz from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(tz);

const TZ = "America/Chicago";

export function centralTodayBoundsISO() {
  const startISO = dayjs().tz(TZ).startOf("day").utc().toISOString();
  const endISO = dayjs().tz(TZ).add(1, "day").startOf("day").utc().toISOString();
  return { startISO, endISO };
}

export function fmtHMS(ms: number) {
  if (!ms || ms < 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}