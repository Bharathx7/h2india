import { AuthPanel, type AuthRole } from "@h2india/ui";

// Auth panel preview (step 2.4): /dev/shells/auth?role=buyer|supplier|admin
// Copy is Figma's. The Supplier and Admin variants still carry the buyer copy in Figma (decision C15).

export default async function AuthPanelPreview({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role: raw } = await searchParams;
  const role: AuthRole = raw === "supplier" || raw === "admin" ? raw : "buyer";
  return (
    <main className="mx-auto grid min-h-dvh max-w-[1440px] grid-cols-1 gap-10 p-4 lg:grid-cols-[680px_1fr] lg:p-6">
      <AuthPanel
        role={role}
        className="hidden min-h-[812px] lg:flex"
        eyebrow="For buyers"
        headline="The simplest way to buy hydrogen equipment"
        sub="Compare verified suppliers and get up to 5 quotes in one request."
      />
      <div className="flex flex-col justify-center gap-2">
        <p className="type-eyebrow text-secondary">Sign-in form · built in Stage 3</p>
        <h1 className="type-h1">Sign in to H2 Economy</h1>
        <p className="type-body text-body">The panel on the left is the {role} variant from Figma 200:1205.</p>
      </div>
    </main>
  );
}
