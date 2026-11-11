import { SitePreview } from "./Preview";

// Site chrome preview (step 2.4): /dev/shells/site, ?user=1 for the logged-in header.
export default async function SiteShellPreview({ searchParams }: { searchParams: Promise<{ user?: string }> }) {
  const { user } = await searchParams;
  return <SitePreview loggedIn={user === "1"} />;
}
