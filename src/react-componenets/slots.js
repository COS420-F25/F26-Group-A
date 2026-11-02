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
