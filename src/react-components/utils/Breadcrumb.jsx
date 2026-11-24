// A row of step names, like: Basics > Hours > Interests > Review
// current   index of the step you are on
// onSelect  optional. When given, steps before the current one become buttons.
export default function Breadcrumb({ steps, current, onSelect, label = "Progress" }) {
  return (
    <nav aria-label={label}>
      <ol className="sv-crumbs">
        {steps.map((step, i) => (
          <li key={step} aria-current={i === current ? "step" : undefined}>
            {onSelect && i < current ? (
              <button type="button" className="sv-link-btn" onClick={() => onSelect(i)}>
                {step}
              </button>
            ) : (
              step
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
