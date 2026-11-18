"use client";

import { Dialog as RDialog } from "radix-ui";
import { useId, useState, type ComponentType, type ReactNode } from "react";
import { Logo } from "../brand/Logo";
import { Icon, type IconName } from "../icons/Icon";
import { cx } from "../lib/cx";
import { Menu, MenuContent, MenuDivider, MenuItem, MenuTrigger } from "./Navigation";

/* Figma "Workspace sidebar v2" (194:1190, buyer, supplier, member and admin) and "Side nav item v2" (194:808):
   the dark sidebar. Default items are ink-200 on ink-900; hover fills ink-700 (150 ms); the active item is a light
   pill with a green accent bar. Optional green count badge.
   Breakpoints (decision M17): desktop from 1024 shows the full sidebar; 768 to 1023 shows icons only;
   below 768 the sidebar opens as a drawer from the top bar's menu button.
   Founder QC (17 Nov 2026): the sidebar never scrolls on a laptop. Items are 34 px with tighter group spacing, and Log
   out lives only in the profile menu, so the longest menu (member, 13 items) fits a 650 px tall window. */

export type WorkspaceArea = "buyer" | "supplier" | "member" | "admin";

export interface WorkspaceNavItem {
  label: string;
  href: string;
  icon: IconName;
  count?: number;
}

export interface WorkspaceNavGroup {
  /** Leave out for the first, unlabelled group (Dashboard, Overview or Home). */
  heading?: string;
  items: WorkspaceNavItem[];
}

const AREA_LABEL: Record<WorkspaceArea, string> = {
  buyer: "Buyer",
  supplier: "Supplier",
  member: "Member",
  admin: "Admin",
};

/**
 * The link the app navigates with (founder QC, 17 Nov 2026): Next.js passes its own Link so a sidebar click changes only
 * the page, not the whole document. Plain <a> otherwise.
 */
export type WorkspaceLink = ComponentType<{
  href: string;
  className?: string;
  title?: string;
  "aria-current"?: "page";
  "aria-label"?: string;
  onClick?: () => void;
  children: ReactNode;
}>;

const PlainLink: WorkspaceLink = ({ children, ...rest }) => <a {...rest}>{children}</a>;

function SidebarItem({
  item,
  active,
  compact,
  Link,
  onNavigate,
}: {
  item: WorkspaceNavItem;
  active: boolean;
  compact: boolean;
  Link: WorkspaceLink;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={compact ? item.label : undefined}
      className={cx(
        "group/item flex h-8.5 items-center gap-3 rounded-control pr-3 pl-4 type-label",
        "transition-colors duration-(--motion-duration-fast) ease-standard",
        active ? "bg-subtle text-primary" : "text-ink-200 hover:bg-ink-700 hover:text-inverse",
        compact && "max-lg:justify-center max-lg:px-0",
      )}
    >
      <span
        aria-hidden="true"
        className={cx("w-1 shrink-0 rounded-[2px] bg-accent", active ? "h-5" : "h-0", compact && "max-lg:hidden")}
      />
      <Icon
        name={item.icon}
        size={18}
        className={active ? "text-icon-primary" : "text-ink-400 group-hover/item:text-icon-inverse"}
      />
      <span className={cx("min-w-0 flex-1 truncate", compact && "max-lg:sr-only")}>{item.label}</span>
      {item.count ? (
        <span
          className={cx(
            "rounded-pill bg-accent px-2 py-0.5 type-label-sm text-primary tabular-nums",
            compact && "max-lg:hidden",
          )}
        >
          {item.count}
          <span className="sr-only"> waiting</span>
        </span>
      ) : null}
    </Link>
  );
}

function SidebarBody({
  area,
  groups,
  currentHref,
  homeHref,
  compact,
  Link,
  onNavigate,
}: {
  area: WorkspaceArea;
  groups: WorkspaceNavGroup[];
  currentHref: string;
  homeHref: string;
  compact: boolean;
  Link: WorkspaceLink;
  /** Closes the phone drawer after a choice. */
  onNavigate?: () => void;
}) {
  // One active item: the longest address that holds the current page, so Overview (/admin) is not lit on
  // /admin/catalogue.
  const matches = (href: string) => currentHref === href || currentHref.startsWith(`${href}/`);
  const activeHref = groups
    .flatMap((g) => g.items.map((item) => item.href))
    .filter(matches)
    .sort((a, b) => b.length - a.length)[0];
  return (
    <div data-surface="inverse" className="flex h-full flex-col gap-3 bg-inverse px-4 pt-4 pb-4">
      {/* Founder QC (17 Nov 2026): the logo and the area badge didn't fit side by side in the 240 px rail and the badge
          was cut in half; the badge now sits under the logo, both whole. */}
      {/* Kept compact so the longest menu (member) still fits a 650 px tall window (workspace-shell.spec.ts). */}
      <div className={cx("flex flex-col items-start gap-1.5 pl-2", compact && "max-lg:hidden")}>
        <Link href={homeHref} aria-label="H2 Economy home" className="rounded-control" onClick={onNavigate}>
          <Logo version="primary-on-dark" height={24} title="" />
        </Link>
        <span className="rounded-pill bg-accent px-2 py-px type-label-sm whitespace-nowrap text-primary">
          {AREA_LABEL[area]} workspace
        </span>
      </div>
      {/* Scrolls only on a very short window; the scrollbar stays hidden so the rail never looks like it moves. */}
      <nav
        aria-label={`${AREA_LABEL[area]} workspace`}
        className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex flex-col gap-2">
          {groups.map((g, i) => (
            <li key={g.heading ?? String(i)}>
              {g.heading ? (
                <p className={cx("pb-0.5 pl-8 type-label-sm text-ink-400", compact && "max-lg:sr-only")}>{g.heading}</p>
              ) : null}
              <ul className="flex flex-col gap-px">
                {g.items.map((item) => (
                  <li key={item.href}>
                    <SidebarItem
                      item={item}
                      active={item.href === activeHref}
                      compact={compact}
                      Link={Link}
                      onNavigate={onNavigate}
                    />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/* Figma "Workspace top bar v2" (194:1191), as changed in founder QC (17 Nov 2026): a working search, notifications with
   count, and the profile (avatar and name). The welcome line and the help button are gone. On phones it keeps the menu
   button, the logo, a search button, notifications and the profile. */

export interface WorkspaceUser {
  name: string;
  /** The role or company; read by screen readers in the profile menu, not shown in the top bar. */
  role: string;
  initials: string;
}

/** Where a typed search can go, for areas without the site search (the back office). */
export interface WorkspaceSearchLink {
  label: string;
  href: string;
}

export interface WorkspaceShellProps {
  area: WorkspaceArea;
  groups: WorkspaceNavGroup[];
  currentHref: string;
  user: WorkspaceUser;
  searchPlaceholder?: string;
  /** Opens a search overlay (buyer, supplier, member: the site search). */
  onSearch?: () => void;
  /**
   * Instead of an overlay, a search box whose typed words offer these destinations (the back office: Users, Listings,
   * RFQs). Enter opens the first.
   */
  searchLinks?: (query: string) => WorkspaceSearchLink[];
  /** The notification centre (or its trigger). */
  notifications?: ReactNode;
  profileHref: string;
  settingsHref?: string;
  /** Another workspace for the same person, in the profile menu (Member area, Buyer workspace, Join as member). */
  switchTo?: { label: string; href: string } | null;
  logoutHref: string;
  homeHref?: string;
  /** The top bar's main button, for example the supplier's Add product (584:961). */
  action?: ReactNode;
  /** The app's link component (Next.js Link), so moving between pages doesn't reload the document. */
  linkComponent?: WorkspaceLink;
  children: ReactNode;
}

export function WorkspaceShell({
  area,
  groups,
  currentHref,
  user,
  searchPlaceholder = "Search products, companies, news",
  onSearch,
  searchLinks,
  notifications,
  profileHref,
  settingsHref,
  switchTo,
  logoutHref,
  homeHref = "/",
  action,
  linkComponent: Link = PlainLink,
  children,
}: WorkspaceShellProps) {
  const [drawer, setDrawer] = useState(false);
  return (
    <RDialog.Root open={drawer} onOpenChange={setDrawer}>
      <div className="flex min-h-dvh bg-page">
        <aside className="sticky top-0 hidden h-dvh shrink-0 md:block md:w-18 lg:w-60">
          <SidebarBody area={area} groups={groups} currentHref={currentHref} homeHref={homeHref} compact Link={Link} />
        </aside>

        <RDialog.Portal>
          <RDialog.Overlay className="fixed inset-0 z-40 bg-ink-900/45 md:hidden" />
          <RDialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] md:hidden"
          >
            <RDialog.Title className="sr-only">{AREA_LABEL[area]} menu</RDialog.Title>
            <SidebarBody
              area={area}
              groups={groups}
              currentHref={currentHref}
              homeHref={homeHref}
              compact={false}
              Link={Link}
              onNavigate={() => {
                setDrawer(false);
              }}
            />
            <RDialog.Close
              aria-label="Close menu"
              className="absolute top-2 right-2 rounded-control p-1 text-icon-inverse"
            >
              <Icon name="x" size={24} />
            </RDialog.Close>
          </RDialog.Content>
        </RDialog.Portal>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-default bg-page px-4 md:h-19 md:gap-6 md:px-8">
            <RDialog.Trigger aria-label="Open menu" className="rounded-control text-icon-primary md:hidden">
              <Icon name="menu" size={24} />
            </RDialog.Trigger>
            {/* Phones and tablets: the wordmark does not fit the icon rail, so it sits in the top bar. */}
            <Link href={homeHref} aria-label="H2 Economy home" className="rounded-control lg:hidden">
              <Logo height={28} title="" />
            </Link>
            {searchLinks ? (
              <LinkSearch placeholder={searchPlaceholder} links={searchLinks} />
            ) : (
              <button
                type="button"
                onClick={onSearch}
                className="hidden h-11 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-card bg-subtle pl-4 text-left transition-colors duration-(--motion-duration-fast) ease-standard hover:bg-tint md:flex"
              >
                <Icon name="search" size={20} className="text-icon-secondary" />
                <span className="truncate type-body text-secondary">{searchPlaceholder}</span>
              </button>
            )}
            <div className="ml-auto flex items-center gap-2 md:ml-0 md:gap-4">
              {onSearch && !searchLinks ? (
                <button
                  type="button"
                  aria-label="Search"
                  onClick={onSearch}
                  className="flex size-10 cursor-pointer items-center justify-center rounded-pill text-icon-secondary hover:bg-subtle md:hidden"
                >
                  <Icon name="search" size={22} />
                </button>
              ) : null}
              {action ? <div className="hidden md:block">{action}</div> : null}
              {notifications}
              <span aria-hidden="true" className="hidden h-8 w-px bg-ink-200 md:block" />
              <Menu>
                <MenuTrigger className="flex items-center gap-3 rounded-pill text-left">
                  <span className="flex size-10 items-center justify-center rounded-pill bg-tint type-label-lg text-primary md:size-11">
                    {user.initials}
                  </span>
                  <span className="hidden max-w-48 truncate type-label-lg text-primary lg:block">{user.name}</span>
                  <Icon name="chevron-down" size={18} className="hidden text-icon-secondary md:block" />
                  <span className="sr-only lg:hidden">
                    {user.name}, {user.role}
                  </span>
                </MenuTrigger>
                <MenuContent>
                  <MenuItem
                    icon="user"
                    onSelect={() => {
                      window.location.assign(profileHref);
                    }}
                  >
                    Profile
                  </MenuItem>
                  {switchTo ? (
                    <MenuItem
                      icon="users"
                      onSelect={() => {
                        window.location.assign(switchTo.href);
                      }}
                    >
                      {switchTo.label}
                    </MenuItem>
                  ) : null}
                  {settingsHref ? (
                    <MenuItem
                      icon="sliders"
                      onSelect={() => {
                        window.location.assign(settingsHref);
                      }}
                    >
                      Settings
                    </MenuItem>
                  ) : null}
                  <MenuDivider />
                  <MenuItem
                    icon="log-out"
                    onSelect={() => {
                      window.location.assign(logoutHref);
                    }}
                  >
                    Log out
                  </MenuItem>
                </MenuContent>
              </Menu>
            </div>
          </header>
          <main id="main" className="min-w-0 flex-1">
            {children}
          </main>
        </div>
      </div>
    </RDialog.Root>
  );
}

/** The back office's search box: type, then pick where to look (Enter opens the first). */
function LinkSearch({ placeholder, links }: { placeholder: string; links: (query: string) => WorkspaceSearchLink[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const listId = useId();
  const q = query.trim();
  const options = q ? links(q) : [];
  return (
    <form
      role="search"
      className="relative hidden min-w-0 flex-1 md:block"
      onSubmit={(event) => {
        event.preventDefault();
        const first = options[0];
        if (first) window.location.assign(first.href);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label className="flex h-11 items-center gap-2.5 rounded-card bg-subtle pl-4">
        <Icon name="search" size={20} className="text-icon-secondary" />
        <span className="sr-only">Search</span>
        <input
          type="search"
          value={query}
          placeholder={placeholder}
          // A plain search box (axe aria-allowed-attr: no aria-expanded on searchbox); the suggestions are links.
          aria-describedby={open && options.length ? listId : undefined}
          onFocus={() => {
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          className="h-full min-w-0 flex-1 bg-transparent pr-3 type-body text-primary outline-none placeholder:text-secondary"
        />
      </label>
      {open && options.length ? (
        <ul
          id={listId}
          aria-label="Search in"
          className="absolute inset-x-0 top-12 z-40 flex flex-col overflow-hidden rounded-card border border-default bg-page py-1 shadow-ink-float-sm"
        >
          {options.map((o) => (
            <li key={o.href}>
              <a
                href={o.href}
                className="flex items-center gap-2.5 px-4 py-2.5 type-body text-primary hover:bg-subtle focus-visible:bg-subtle"
              >
                <Icon name="search" size={16} className="text-icon-secondary" />
                <span className="truncate">{o.label}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
