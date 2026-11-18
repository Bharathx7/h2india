"use client";

import { Dialog as RDialog } from "radix-ui";
import { useEffect, useId, useRef, useState, type FocusEvent, type ReactNode } from "react";
import { Logo } from "../../brand/Logo";
import { Icon } from "../../icons/Icon";
import { cx } from "../../lib/cx";
import { buttonClasses } from "../Button";
import { IconButton } from "../IconButton";
import { Menu, MenuContent, MenuDivider, MenuItem, MenuTrigger } from "../Navigation";
import { MegaMenuPanel } from "./MegaMenu";
import type { MegaSection, SiteLinks, SiteUser } from "./types";

/* Figma "Site header" (25:635, frames 372:15391 to 372:16409): top strip, main bar (logo, search trigger,
   actions) and section nav with six mega menus. Logged in swaps Sign in and List your company for
   notifications, the workspace switcher and the avatar. The Header shadow appears once the page scrolls.
   Founder change to the motion spec (781:7247 "sticky, never shrinks"), 13 Nov 2026, revised 16 Nov 2026: on
   desktop, scrolling down past the top strip and section nav hides them and leaves the main bar; scrolling up
   (any amount) brings both back at once, with no click needed. They also show at the top of the page, while a menu
   is open and while keyboard focus is in the header; clicking in the main bar keeps them hidden (public QC 2). Desktop from 1024 px; below that the mobile header and
   full-screen menu (decision M17). The language selector stays hidden (decision M15). */

export interface SiteHeaderProps {
  sections: MegaSection[];
  links: SiteLinks;
  user?: SiteUser | null;
  onOpenSearch: () => void;
  /** "India's hydrogen ecosystem platform" */
  tagline?: string;
  /** The bell with its drop-down panel (public QC 4); without it the bell links to the Notifications page. */
  notifications?: ReactNode;
  /** Request a quote is for buyers and signed-out visitors (public QC 4); false hides the button. */
  showRequestQuote?: boolean;
}

/** The person's role as a plain badge, not a link (public QC 4, 16 Nov 2026). */
function RoleBadge({ user }: { user: SiteUser }) {
  return (
    <span className="rounded-pill bg-tint px-2.5 py-1 type-label-sm text-primary" data-testid="role-badge">
      {user.workspace}
    </span>
  );
}

function Desktop({
  sections,
  links,
  user,
  onOpenSearch,
  tagline,
  notifications,
  showRequestQuote = true,
  collapsed,
  onMenuChange,
}: SiteHeaderProps & { collapsed: boolean; onMenuChange: (open: boolean) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    onMenuChange(open !== null);
  }, [open, onMenuChange]);
  const navRef = useRef<HTMLDivElement>(null);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const id = open;
        setOpen(null);
        buttons.current[id]?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Close when keyboard focus leaves the section nav and its open menu.
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (open && !e.currentTarget.contains(e.relatedTarget)) setOpen(null);
  };

  const current = sections.find((s) => s.id === open);

  return (
    <div className="hidden lg:block">
      <div className={cx("bg-subtle", collapsed && "hidden")}>
        <div className="mx-auto flex h-9 max-w-300 items-center justify-between px-6 xl:px-0">
          <p className="type-caption text-secondary">{tagline}</p>
          <ul className="flex items-center gap-6">
            {links.secondary.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="rounded-control type-label-sm text-body hover:text-primary">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mx-auto flex h-19 max-w-300 items-center justify-between gap-6 px-6 xl:px-0">
        <div className="flex min-w-0 flex-1 items-center gap-8">
          <a href={links.home} aria-label="H2 Economy home" className="shrink-0 rounded-control">
            <Logo title="" />
          </a>
          <button
            type="button"
            onClick={onOpenSearch}
            aria-keyshortcuts="/"
            aria-label="Search H2 Economy"
            className="flex h-11 w-full max-w-110 min-w-40 items-center gap-3 rounded-pill border border-input bg-page pr-2 pl-4 text-left hover:border-focus"
          >
            <Icon name="search" size={20} className="text-icon-secondary" />
            <span className="flex-1 truncate type-body text-secondary">Search products, companies, news, schemes</span>
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {showRequestQuote ? (
            <a href={links.requestQuote} className={buttonClasses({ variant: "outline" })}>
              Request a quote
            </a>
          ) : null}
          {user && notifications ? notifications : null}
          {user && !notifications ? (
            <span className="relative inline-flex">
              <a
                href={links.notifications}
                aria-label={user.unread ? `Notifications, ${String(user.unread)} unread` : "Notifications"}
                className="inline-flex size-10 items-center justify-center rounded-pill border border-control text-icon-primary hover:border-focus hover:bg-subtle"
              >
                <Icon name="bell" size={18} />
              </a>
              {user.unread ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-1 -right-1 rounded-pill bg-accent px-1 type-label-sm text-primary"
                >
                  {user.unread}
                </span>
              ) : null}
            </span>
          ) : null}
          {user ? (
            <>
              <RoleBadge user={user} />
              <Menu>
                <MenuTrigger
                  aria-label={`Account: ${user.name}`}
                  className="flex size-9 items-center justify-center rounded-pill bg-inverse type-label-sm text-inverse"
                >
                  {user.initials}
                </MenuTrigger>
                <MenuContent>
                  {/* Public QC 4: Dashboard opens the person's own workspace; Account is Profile inside it. */}
                  <MenuItem
                    icon="layout-dashboard"
                    onSelect={() => {
                      window.location.assign(user.workspaceHref);
                    }}
                  >
                    Dashboard
                  </MenuItem>
                  {user.extra ? (
                    <MenuItem
                      icon="users"
                      onSelect={() => {
                        if (user.extra) window.location.assign(user.extra.href);
                      }}
                    >
                      {user.extra.label}
                    </MenuItem>
                  ) : null}
                  <MenuDivider />
                  <MenuItem
                    icon="log-out"
                    onSelect={() => {
                      window.location.assign(links.signOut);
                    }}
                  >
                    Sign out
                  </MenuItem>
                </MenuContent>
              </Menu>
            </>
          ) : (
            <>
              <a href={links.signIn} className={buttonClasses({ variant: "ghost" })}>
                Sign in
              </a>
              <a href={links.listCompany} className={buttonClasses({ variant: "primary" })}>
                List your company
              </a>
            </>
          )}
        </div>
      </div>
      <div ref={navRef} onBlur={onBlur} className={cx("relative border-t border-default", collapsed && "hidden")}>
        <nav aria-label="Main" className="mx-auto flex h-12 max-w-306 items-center gap-1 px-3 xl:px-0">
          {sections.map((s) => (
            <button
              key={s.id}
              ref={(el) => {
                buttons.current[s.id] = el;
              }}
              type="button"
              aria-expanded={open === s.id}
              aria-controls={open === s.id ? panelId : undefined}
              onClick={() => {
                setOpen(open === s.id ? null : s.id);
              }}
              className="group/nav rounded-pill"
            >
              <span
                data-open={open === s.id || undefined}
                className={cx(
                  "relative inline-flex h-9 items-center gap-1 rounded-pill px-3 type-label text-primary",
                  "after:absolute after:right-3 after:bottom-px after:left-3 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-[1px] after:bg-accent",
                  "after:transition-transform after:duration-(--motion-duration-base) after:ease-standard",
                  "group-hover/nav:after:scale-x-100 data-open:after:scale-x-100",
                )}
              >
                {s.label}
                <Icon
                  name="chevron-down"
                  size={16}
                  className={cx("text-icon-primary transition-transform", open === s.id && "rotate-180")}
                />
              </span>
            </button>
          ))}
        </nav>
        {current ? (
          <div className="absolute inset-x-0 top-full z-50 flex justify-center px-6 pt-2">
            <MegaMenuPanel section={current} id={panelId} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Mobile({ sections, links, user, onOpenSearch, showRequestQuote = true }: SiteHeaderProps) {
  const [expanded, setExpanded] = useState<string | null>(sections[0]?.id ?? null);
  return (
    <RDialog.Root>
      <div className="flex h-16 items-center justify-between border-b border-default px-4 md:px-6 lg:hidden">
        <a href={links.home} aria-label="H2 Economy home" className="rounded-control">
          <Logo title="" />
        </a>
        <div className="flex items-center gap-2">
          <IconButton icon="search" look="outline" label="Search" onClick={onOpenSearch} />
          <RDialog.Trigger asChild>
            <IconButton icon="menu" look="outline" label="Menu" />
          </RDialog.Trigger>
        </div>
      </div>
      <RDialog.Portal>
        <RDialog.Content
          aria-describedby={undefined}
          className="sheet-enter fixed inset-0 z-50 flex flex-col bg-page lg:hidden"
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-default px-4">
            <RDialog.Title asChild>
              <span>
                <Logo title="H2 Economy menu" />
              </span>
            </RDialog.Title>
            <RDialog.Close asChild>
              <IconButton icon="x" look="outline" label="Close menu" />
            </RDialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {user ? (
              <div className="mb-4 flex flex-col gap-3 border-b border-default pb-4">
                {/* Public QC 4: who is signed in, with the role as a plain badge; Dashboard and Sign out below. */}
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-pill bg-inverse type-label-sm text-inverse">
                    {user.initials}
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="block truncate type-label-lg text-primary">{user.name}</span>
                    <span className="self-start">
                      <RoleBadge user={user} />
                    </span>
                  </span>
                </div>
                <a
                  href={user.workspaceHref}
                  className="flex items-center gap-2 rounded-control py-2 type-label-lg text-primary"
                >
                  <Icon name="layout-dashboard" size={18} />
                  Dashboard
                </a>
                {user.extra ? (
                  <a
                    href={user.extra.href}
                    className="flex items-center gap-2 rounded-control py-2 type-label-lg text-primary"
                  >
                    <Icon name="users" size={18} />
                    {user.extra.label}
                  </a>
                ) : null}
                <a
                  href={links.notifications}
                  className="flex items-center justify-between rounded-control py-2 type-label-lg text-primary"
                >
                  Notifications
                  {user.unread ? (
                    <span className="rounded-pill bg-accent px-2 py-0.5 type-label-sm">{user.unread} new</span>
                  ) : null}
                </a>
                <a
                  href={links.signOut}
                  className="flex items-center gap-2 rounded-control py-2 type-label-lg text-primary"
                >
                  <Icon name="log-out" size={18} />
                  Sign out
                </a>
              </div>
            ) : null}
            <ul className="flex flex-col">
              {sections.map((s) => {
                const isOpen = expanded === s.id;
                const items = s.classes
                  ? [
                      ...s.classes.map((c) => ({ label: c.label, href: c.href })),
                      ...(s.applications?.length
                        ? [{ label: "Browse by application", href: s.applications[0]?.href ?? "#" }]
                        : []),
                      ...(s.tools ?? []).filter((t) => t.icon !== "file-text"),
                    ]
                  : (s.primary ?? []);
                return (
                  <li key={s.id} className="border-b border-default">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => {
                        setExpanded(isOpen ? null : s.id);
                      }}
                      className="flex w-full items-center justify-between py-3.5 type-label-lg text-primary"
                    >
                      {s.label}
                      <Icon
                        name="chevron-down"
                        size={20}
                        className={cx("text-icon-primary transition-transform", isOpen && "rotate-180")}
                      />
                    </button>
                    {isOpen ? (
                      <ul className="flex flex-col gap-3 pb-4 pl-3">
                        {items.map((l) => (
                          <li key={l.href + l.label}>
                            <a href={l.href} className="rounded-control type-body text-body">
                              {l.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <ul className="mt-4 flex flex-col gap-3">
              {links.secondary.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="rounded-control type-body text-body">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {showRequestQuote || !user ? (
            <div className="flex shrink-0 flex-col gap-2 border-t border-default p-4">
              {showRequestQuote ? (
                <a
                  href={links.requestQuote}
                  className={cx(buttonClasses({ variant: user ? "primary" : "outline" }), "w-full")}
                >
                  Request a quote
                </a>
              ) : null}
              {user ? null : (
                <div className="grid grid-cols-2 gap-2">
                  <a href={links.signIn} className={cx(buttonClasses({ variant: "ghost" }), "w-full")}>
                    Sign in
                  </a>
                  <a href={links.listCompany} className={cx(buttonClasses({ variant: "primary" }), "w-full")}>
                    List your company
                  </a>
                </div>
              )}
            </div>
          ) : null}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

/** Desktop top strip (h-9) plus section nav (1 px border and h-12): scrolled past these, the rows may hide. */
const COLLAPSE_AFTER_PX = 36 + 1 + 48;
/** Ignore scroll jitter smaller than this (trackpads report tiny back-and-forth moves). */
const SCROLL_JITTER_PX = 4;

/**
 * Whether the top strip and section nav hide after a scroll from `last` to `y`: hidden while scrolling down past
 * the rows, shown again on any scroll up and always near the top. `wasHidden` is kept for moves within the jitter.
 */
export function rowsHidden(last: number, y: number, wasHidden: boolean): boolean {
  if (y <= COLLAPSE_AFTER_PX) return false;
  if (y > last + SCROLL_JITTER_PX) return true;
  if (y < last - SCROLL_JITTER_PX) return false;
  return wasHidden;
}

/** Whether focus came from the keyboard (Tab), not a click: :focus-visible, except text fields, which always match. */
function keyboardFocus(el: HTMLElement): boolean {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return false;
  try {
    return el.matches(":focus-visible");
  } catch {
    return false;
  }
}

export function SiteHeader(props: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const collapsed = hidden && !focusWithin && !menuOpen;
  const lastY = useRef(0);
  const hiddenNow = useRef(false);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 0);
      hiddenNow.current = rowsHidden(lastY.current, y, hiddenNow.current);
      setHidden(hiddenNow.current);
      // Remember the position only once it moved beyond the jitter, so slow scrolling still counts.
      if (Math.abs(y - lastY.current) > SCROLL_JITTER_PX || y <= COLLAPSE_AFTER_PX) lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  useEffect(() => {
    // "/" still opens search (not while typing in a field); its badge in the search trigger was removed, 16 Nov 2026.
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))
      ) {
        e.preventDefault();
        props.onOpenSearch();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [props]);
  return (
    <>
      <header
        onFocus={(e) => {
          // Only keyboard focus brings the hidden rows back (public QC 2, 16 Nov 2026): clicking the logo, search,
          // Request a quote, Sign in or List your company after scrolling keeps just the main bar.
          if (e.target instanceof HTMLElement && keyboardFocus(e.target)) setFocusWithin(true);
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setFocusWithin(false);
        }}
        className={cx(
          // Desktop: fixed, with the spacer below holding its full height, so hiding rows never moves the page.
          "sticky top-0 z-40 border-b transition-[background-color,box-shadow,border-color] duration-(--motion-duration-base) lg:fixed lg:inset-x-0",
          // Founder v2, 18 Nov 2026 (option C, mint glass): once the page scrolls, the bar turns a light brand-mint glass
          // (fresh-50 at 80% over the glass blur) with a green edge, so content shows faintly beneath it.
          scrolled
            ? "border-fresh-200 bg-fresh-50/80 shadow-ink-header backdrop-blur-glass-16 backdrop-saturate-130"
            : "border-default bg-page",
        )}
      >
        <Desktop {...props} collapsed={collapsed} onMenuChange={setMenuOpen} />
        <Mobile {...props} />
      </header>
      {/* The desktop header's full height: 36 + 76 + 1 + 48 + 1 (bottom border) = 162 px. */}
      <div aria-hidden="true" className="hidden lg:block lg:h-40.5" />
    </>
  );
}
