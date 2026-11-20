import { Skeleton } from "@h2india/ui";

// The page part while a workspace page loads (founder, 20 Nov 2026): the sidebar and top bar stay on screen, and only
// this area shows a placeholder, so a sidebar click answers at once.
export function WorkspaceLoading() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8" role="status" aria-busy="true" aria-label="Loading">
      <div className="flex max-w-full flex-col gap-2">
        <Skeleton kind="text" className="h-8 w-64 max-w-full" />
        <Skeleton kind="text" className="w-96 max-w-full" />
      </div>
      <div className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} kind="table-row" />
        ))}
      </div>
    </div>
  );
}
