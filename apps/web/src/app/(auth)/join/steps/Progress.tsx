// "Step 1 of 4 · How you'll use H2 India" and its bar (Figma 525:9 Progress).
export function Progress({ step, of, label }: { step: number; of: number; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="type-caption text-secondary">
        Step {step} of {of} · {label}
      </p>
      <div
        className="h-1 rounded-pill bg-subtle"
        role="progressbar"
        aria-label="Join progress"
        aria-valuemin={0}
        aria-valuemax={of}
        aria-valuenow={step}
      >
        <div className="h-1 rounded-pill bg-accent" style={{ width: `${String((step / of) * 100)}%` }} />
      </div>
    </div>
  );
}
