import type { ReactNode } from "react";

/** A gallery section labelled with the Figma component set it reproduces. */
export function GallerySection({
  id,
  title,
  node,
  children,
}: {
  id: string;
  title: string;
  node: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-t border-default py-12" data-gallery={id}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={`${id}-title`} className="type-h2">
          {title}
        </h2>
        <span className="type-spec text-secondary">Figma {node}</span>
      </div>
      <div className="mt-6 flex flex-col gap-8">{children}</div>
    </section>
  );
}

export function Row({
  label,
  children,
  surface,
}: {
  label: string;
  children: ReactNode;
  surface?: "inverse" | "subtle";
}) {
  return (
    <div
      className={
        surface === "inverse" ? "rounded-card bg-inverse p-6" : surface === "subtle" ? "rounded-card bg-subtle p-6" : ""
      }
      data-surface={surface === "inverse" ? "inverse" : undefined}
    >
      <p className={`type-eyebrow ${surface === "inverse" ? "text-inverse" : "text-secondary"}`}>{label}</p>
      <div className="mt-3 flex flex-wrap items-center gap-4">{children}</div>
    </div>
  );
}
