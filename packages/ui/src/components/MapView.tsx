import type { ReactNode } from "react";
import { Icon } from "../icons/Icon";
import { cx } from "../lib/cx";

/* Map with a provider adapter (step 6.6, M7): the directory map (478:708), the ecosystem map (756:13075) and the
   hubs-and-valleys drawer (751:8302). Tiles must show India's official boundaries, so no provider is wired until M7
   names one; until then the map's place shows its list by state, which is also the keyboard alternative the map
   always offers. A provider renders into the frame it is given and must not load third-party scripts without consent. */

export interface MapPoint {
  id: string;
  label: string;
  href: string;
  /** Grouping for the list alternative, for example the state. */
  group: string;
  detail?: string;
  lat?: number;
  lng?: number;
}

export interface MapProvider {
  name: string;
  render: (props: { points: MapPoint[]; label: string }) => ReactNode;
}

export interface MapViewProps {
  points: MapPoint[];
  label: string;
  /** The chosen tiles vendor (M7). Absent: the list by group stands in for the map. */
  provider?: MapProvider | null;
  renderLink?: (props: { href: string; className: string; children: ReactNode }) => ReactNode;
  className?: string;
}

const plainLink: NonNullable<MapViewProps["renderLink"]> = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

function groups(points: MapPoint[]) {
  const m = new Map<string, MapPoint[]>();
  for (const p of points) m.set(p.group, [...(m.get(p.group) ?? []), p]);
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

export function MapView({ points, label, provider, renderLink = plainLink, className }: MapViewProps) {
  const list = (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label={`${label}, by state`}>
      {groups(points).map(([group, items]) => (
        <li key={group} className="flex flex-col gap-2 rounded-card border border-default bg-page p-4">
          <p className="flex items-center gap-2 type-label text-primary">
            <Icon name="map-pin" size={16} className="text-icon-link" />
            {group}
            <span className="type-caption text-secondary">· {items.length}</span>
          </p>
          <ul className="flex flex-col gap-1">
            {items.map((p) => (
              <li key={p.id} className="type-body-sm">
                {renderLink({
                  href: p.href,
                  className: "text-link underline-offset-2 hover:underline",
                  children: p.label,
                })}
                {p.detail ? <span className="text-secondary"> · {p.detail}</span> : null}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label={label} className={cx("flex flex-col gap-4", className)}>
      {provider ? (
        <>
          <div className="overflow-hidden rounded-card border border-default">{provider.render({ points, label })}</div>
          <details className="rounded-card border border-default p-4">
            <summary className="cursor-pointer type-label text-primary">Show the list instead</summary>
            <div className="pt-4">{list}</div>
          </details>
        </>
      ) : (
        list
      )}
    </section>
  );
}
