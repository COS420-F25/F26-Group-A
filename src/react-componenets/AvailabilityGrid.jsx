import { Fragment, useRef } from "react";
import { DAYS, hourLabel, slotId } from "./slots";
import { color } from "./ui";

// A weekly calendar. Each cell is one hour.
// Click a cell to mark it, or press and drag to mark many.
// Keyboard: Tab to a cell, then press Enter or Space.
//
// value     a Set of slots like "Mon-09"
// onChange  called with the new Set
export default function AvailabilityGrid({ startHour, endHour, value, onChange, disabled = false }) {
  // The ref always holds the newest Set, so fast dragging does not use old data
  const latest = useRef(value);
  latest.current = value;

  // null = not dragging, true = adding cells, false = removing cells
  const adding = useRef(null);

  const hours = [];
  for (let h = startHour; h < endHour; h++) hours.push(h);

  function setSlot(slot, on) {
    const next = new Set(latest.current);
    if (on) next.add(slot);
    else next.delete(slot);
    if (next.size === latest.current.size) return; // nothing changed
    latest.current = next;
    onChange(next);
  }

  function slotFromEvent(target) {
    return target.closest?.("[data-slot]")?.dataset.slot ?? null;
  }

  function handlePointerDown(e) {
    if (disabled) return;
    const slot = slotFromEvent(e.target);
    if (!slot) return;
    // The first cell decides if this drag adds or removes
    adding.current = !latest.current.has(slot);
    e.currentTarget.setPointerCapture(e.pointerId);
    setSlot(slot, adding.current);
  }

  function handlePointerMove(e) {
    if (adding.current === null) return;
    // With pointer capture, the event target is the grid, so look under the pointer
    const slot = slotFromEvent(document.elementFromPoint(e.clientX, e.clientY));
    if (slot) setSlot(slot, adding.current);
  }

  function stopDragging() {
    adding.current = null;
  }

  // Mouse and touch are handled above. Only keyboard clicks have detail 0.
  function handleClick(e) {
    if (disabled || e.detail !== 0) return;
    const slot = e.currentTarget.dataset.slot;
    setSlot(slot, !latest.current.has(slot));
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <div
        role="group"
        aria-label="Weekly availability. Select the hours you are free."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        style={{
          display: "grid",
          gridTemplateColumns: "52px repeat(7, minmax(40px, 1fr))",
          gap: 2,
          minWidth: 360,
          touchAction: "none", // lets touch dragging paint cells instead of scrolling
          userSelect: "none",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <div />
        {DAYS.map((day) => (
          <div key={day} style={{ textAlign: "center", fontSize: 13, fontWeight: 600, padding: "4px 0" }}>
            {day}
          </div>
        ))}

        {hours.map((hour) => (
          <Fragment key={hour}>
            <div style={{ fontSize: 12, color: color.subtext, alignSelf: "center", textAlign: "right", paddingRight: 6 }}>
              {hourLabel(hour)}
            </div>
            {DAYS.map((day) => {
              const slot = slotId(day, hour);
              const on = value.has(slot);
              return (
                <button
                  key={slot}
                  type="button"
                  data-slot={slot}
                  aria-pressed={on}
                  aria-label={`${day} ${hourLabel(hour)}`}
                  onClick={handleClick}
                  style={{
                    height: 28,
                    padding: 0,
                    border: "none",
                    borderRadius: 4,
                    cursor: disabled ? "default" : "pointer",
                    background: on ? color.accent : color.background,
                    outlineOffset: 1,
                  }}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
