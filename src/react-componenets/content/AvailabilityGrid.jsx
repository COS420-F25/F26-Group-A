import { Fragment, useRef } from "react";
import { DAYS, hourLabel, slotId } from "../utils/slots";

export default function AvailabilityGrid({ startHour, endHour, value, ifNeededValue = new Set(), onChange, disabled = false, mode }) {
  const latestVal = useRef(value);
  latestVal.current = value;

  const latestIfNeeded = useRef(ifNeededValue);
  latestIfNeeded.current = ifNeededValue;

  const actionType = useRef(null); // "available" | "ifNeeded" | "erase"

  const hours = [];
  for (let h = startHour; h < endHour; h++) hours.push(h);

  function determineAction(slot) {
    if (mode === "paint") return "available";
    if (mode === "ifNeeded") return "ifNeeded";
    if (mode === "erase") return "erase";
    if (latestVal.current.has(slot)) return "erase";
    return "available";
  }

  function applySlot(slot, action) {
    const nextVal = new Set(latestVal.current);
    const nextIfNeeded = new Set(latestIfNeeded.current);

    if (action === "available") {
      nextVal.add(slot);
      nextIfNeeded.delete(slot);
    } else if (action === "ifNeeded") {
      nextIfNeeded.add(slot);
      nextVal.delete(slot);
    } else if (action === "erase") {
      nextVal.delete(slot);
      nextIfNeeded.delete(slot);
    }

    latestVal.current = nextVal;
    latestIfNeeded.current = nextIfNeeded;
    onChange(nextVal, nextIfNeeded);
  }

  function slotFromEvent(target) {
    return target?.closest?.("[data-slot]")?.dataset.slot ?? null;
  }

  function handlePointerDown(e) {
    if (disabled) return;
    const slot = slotFromEvent(e.target);
    if (!slot) return;
    actionType.current = determineAction(slot);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    applySlot(slot, actionType.current);
  }

  function handlePointerMove(e) {
    if (actionType.current === null) return;
    const slot = slotFromEvent(document.elementFromPoint(e.clientX, e.clientY));
    if (slot) applySlot(slot, actionType.current);
  }

  function stopDragging() {
    actionType.current = null;
  }

  function handleClick(e) {
    if (disabled || e.detail !== 0) return;
    const slot = e.currentTarget.dataset.slot;
    applySlot(slot, determineAction(slot));
  }

  return (
    <div className="sv-grid-wrap">
      <div
        role="group"
        aria-label="Weekly availability chart"
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
              return (
                <button
                  key={slot}
                  type="button"
                  className="sv-cell"
                  data-slot={slot}
                  data-on={isAvailable ? "true" : undefined}
                  data-if-needed={isIfNeeded ? "true" : undefined}
                  style={
                    isIfNeeded
                      ? { background: "var(--sv-surface)", border: "1px dashed var(--sv-accent)" }
                      : undefined
                  }
                  aria-pressed={isAvailable || isIfNeeded}
                  aria-label={`${day} ${hourLabel(hour)}`}
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
