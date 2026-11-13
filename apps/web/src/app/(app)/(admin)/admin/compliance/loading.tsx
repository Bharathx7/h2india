import { Skeleton } from "@h2india/ui";

// Loading · compliance requests (661:948).
export default function Loading() {
  return (
    <div className="m-8 flex flex-col gap-3 rounded-card border border-default bg-page p-6" aria-busy="true">
      <span className="sr-only">Loading compliance requests</span>
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} kind="table-row" />
      ))}
    </div>
  );
}
