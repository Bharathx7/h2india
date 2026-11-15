import { Skeleton } from "@h2india/ui";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 p-8" role="status" aria-busy="true" aria-label="Loading the article">
      <Skeleton kind="text" />
      <Skeleton kind="card" />
      <Skeleton kind="card" />
    </div>
  );
}
