import { Skeleton } from "@h2india/ui";

// Loading · users and audit log (657:1313).
export default function UsersLoading() {
  return (
    <div
      className="m-8 flex flex-col gap-3 rounded-card border border-default bg-page p-5"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} kind="table-row" />
      ))}
    </div>
  );
}
