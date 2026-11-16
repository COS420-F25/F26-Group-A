// Helpers for the weekly availability grid.
// A slot is one hour on one day, saved as text like "Mon-09" (Monday 9 AM to 10 AM).

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const slotId = (day, hour) => `${day}-${String(hour).padStart(2, "0")}`;

// 9 -> "9 AM", 13 -> "1 PM", 0 or 24 -> "12 AM"
export function hourLabel(hour) {
  const h = hour % 24;
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

// Puts slots in week order: Mon-08, Mon-09, ... Sun-21
export function sortSlots(slots) {
  const order = (slot) => {
    const [day, hour] = slot.split("-");
    return DAYS.indexOf(day) * 100 + Number(hour);
  };
  return [...slots].sort((a, b) => order(a) - order(b));
}

// "9 AM to 11 AM" for the hours from 9 up to (not including) 11
export const formatRange = (from, to) => `${hourLabel(from)} to ${hourLabel(to)}`;

// Groups slots into ranges for each day. Hours that touch are joined.
// ["Mon-09", "Mon-10", "Tue-14"] gives
// [{ day: "Mon", ranges: ["9 AM to 11 AM"] }, { day: "Tue", ranges: ["2 PM to 3 PM"] }]
export function summarizeSlots(slots) {
  const hoursByDay = {};
  for (const slot of slots) {
    const [day, hour] = slot.split("-");
    if (!DAYS.includes(day)) continue;
    (hoursByDay[day] ??= new Set()).add(Number(hour));
  }

  const summary = [];
  for (const day of DAYS) {
    if (!hoursByDay[day]) continue;
    const hours = [...hoursByDay[day]].sort((a, b) => a - b);
    const ranges = [];
    let start = hours[0];
    for (let i = 0; i < hours.length; i++) {
      const last = hours[i];
      if (hours[i + 1] !== last + 1) {
        ranges.push(formatRange(start, last + 1));
        start = hours[i + 1];
      }
    }
    summary.push({ day, ranges });
  }
  return summary;
}
