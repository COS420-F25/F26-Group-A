import { Fragment, useRef } from "react";
import { DAYS, hourLabel, slotId } from "./slots";

// A weekly calendar. Each cell is one hour.
// Click a cell to mark it, or press and drag to mark many.
// Keyboard: Tab to a cell, then press Enter or Space.
//
// value            a Set of preferred available slots like "Mon-09"
// onChange         called with the new Set of preferred slots
// ifNeededValue    optional Set of "if needed" backup slots
// onIfNeededChange optional callback with the new Set of "if needed" slots
// disabled         disables pointer & keyboard interaction
// mode             "paint" (available), "if-needed" (accent backup time), or "erase".
//                  Leave it out and the first cell you touch decides.
export default function AvailabilityGrid({
  startHour,
  endHour,
  value,
  onChange,
  ifNeededValue = new Set(),
  onIfNeededChange,
  disabled = false,
  mode,
}) {
  // Refs always hold the newest Sets, so fast dragging does not use old data
  const latest = useRef(value);
  latest.current = value;

  const latestIfNeeded = useRef(ifNeededValue);
  latestIfNeeded.current = ifNeededValue;

  // null = not dragging, "available" | "if-needed" | "erase"
  const dragAction = useRef(null);

  const hours = [];
  for (let h = startHour; h < endHour; h++) hours.push(h);

  // Should touching this cell set it to "available", "if-needed", or "erase"?
  function actionForSlot(slot) {
    if (mode === "paint") return "available";
    if (mode === "if-needed") return "if-needed";
    if (mode === "erase") return "erase";
    return latest.current.has(slot) || latestIfNeeded.current.has(slot)
      ? "erase"
      : "available";
  }

  function applyAction(slot, action) {
    const nextAvailable = new Set(latest.current);
    const nextIfNeeded = new Set(latestIfNeeded.current);
    let availChanged = false;
    let ifNeededChanged = false;

    if (action === "available") {
      if (!nextAvailable.has(slot)) {
        nextAvailable.add(slot);
        availChanged = true;
      }
      if (nextIfNeeded.delete(slot)) {
        ifNeededChanged = true;
      }
    } else if (action === "if-needed") {
      if (nextAvailable.delete(slot)) {
        availChanged = true;
      }
      if (!nextIfNeeded.has(slot)) {
        nextIfNeeded.add(slot);
        ifNeededChanged = true;
      }
    } else if (action === "erase") {
      if (nextAvailable.delete(slot)) {
        availChanged = true;
      }
      if (nextIfNeeded.delete(slot)) {
        ifNeededChanged = true;
      }
    }

    if (availChanged) {
      latest.current = nextAvailable;
      onChange?.(nextAvailable);
    }
    if (ifNeededChanged) {
      latestIfNeeded.current = nextIfNeeded;
      onIfNeededChange?.(nextIfNeeded);
    }
  }

  function slotFromEvent(target) {
    return target?.closest?.("[data-slot]")?.dataset.slot ?? null;
  }

  function handlePointerDown(e) {
    if (disabled) return;
    const slot = slotFromEvent(e.target);
    if (!slot) return;
    dragAction.current = actionForSlot(slot);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    applyAction(slot, dragAction.current);
  }

  function handlePointerMove(e) {
    if (dragAction.current === null) return;
    const slot = slotFromEvent(document.elementFromPoint(e.clientX, e.clientY));
    if (slot) applyAction(slot, dragAction.current);
  }

  function stopDragging() {
    dragAction.current = null;
  }

  // Mouse and touch are handled above. Only keyboard clicks have detail 0.
  function handleClick(e) {
    if (disabled || e.detail !== 0) return;
    const slot = e.currentTarget.dataset.slot;
    applyAction(slot, actionForSlot(slot));
  }

  return (
    <div className="sv-grid-wrap">
      <div
        role="group"
        aria-label="Weekly availability. Select the hours you are free."
        className="sv-grid"
        data-disabled={disabled ? "true" : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        <div />
        {DAYS.map((day) => (
          <div key={day} className="sv-grid-day">
            {day}
          </div>
        ))}

        {hours.map((hour) => (
          <Fragment key={hour}>
            <div className="sv-grid-time">{hourLabel(hour)}</div>
            {DAYS.map((day) => {
              const slot = slotId(day, hour);
              const isAvailable = value.has(slot);
              const isIfNeeded = ifNeededValue.has(slot);
              const isSelected = isAvailable || isIfNeeded;
              const statusSuffix = isIfNeeded ? " (if needed)" : "";
              return (
                <button
                  key={slot}
                  type="button"
                  className="sv-cell"
                  data-slot={slot}
                  data-level={isIfNeeded ? "if-needed" : isAvailable ? "available" : undefined}
                  aria-pressed={isSelected}
                  aria-label={`${day} ${hourLabel(hour)}${statusSuffix}`}
                  onClick={handleClick}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
