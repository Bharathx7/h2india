import { Skeleton } from "@h2india/ui";

// The content screens' loading state (642:326): the table's rows while they load.
export default function ContentLoading() {
  return (
    <div
      className="m-8 flex flex-col gap-2 rounded-card border border-default bg-page p-6"
      role="status"
      aria-busy="true"
      aria-label="Loading content"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} kind="table-row" />
      ))}
    </div>
  );
}
