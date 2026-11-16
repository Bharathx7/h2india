"use client";

import { Dialog as RDialog } from "radix-ui";
import { useState, type ReactNode } from "react";
import { Logo } from "../brand/Logo";
import { Icon, type IconName } from "../icons/Icon";
import { cx } from "../lib/cx";
import { Menu, MenuContent, MenuDivider, MenuItem, MenuTrigger } from "./Navigation";

/* Figma "Workspace sidebar v2" (194:1190, buyer, supplier, member and admin) and "Side nav item v2" (194:808):
   the dark sidebar. Default items are ink-200 on ink-900; hover fills ink-700 (150 ms); the active item is a light
   pill with a green accent bar. Optional green count badge.
   Breakpoints (decision M17): desktop from 1024 shows the full sidebar; 768 to 1023 shows icons only;
   below 768 the sidebar opens as a drawer from the top bar's menu button. */

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

function SidebarItem({ item, active, compact }: { item: WorkspaceNavItem; active: boolean; compact: boolean }) {
  return (
    <a
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={compact ? item.label : undefined}
      className={cx(
        "group/item flex h-9.5 items-center gap-3 rounded-control pr-3 pl-4 type-label",
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
    </a>
  );
}

function SidebarBody({
  area,
  groups,
  currentHref,
  logoutHref,
  homeHref,
  compact,
}: {
  area: WorkspaceArea;
  groups: WorkspaceNavGroup[];
  currentHref: string;
  logoutHref: string;
  homeHref: string;
  compact: boolean;
}) {
  // One active item: the longest address that holds the current page, so Overview (/admin) is not lit on
  // /admin/catalogue.
  const matches = (href: string) => currentHref === href || currentHref.startsWith(`${href}/`);
  const activeHref = groups
    .flatMap((g) => g.items.map((item) => item.href))
    .filter(matches)
    .sort((a, b) => b.length - a.length)[0];
  return (
    <div data-surface="inverse" className="flex h-full flex-col gap-5 bg-inverse px-4 pt-7 pb-6">
      <div className={cx("flex items-center gap-2.5 pl-2", compact && "max-lg:hidden")}>
        <a href={homeHref} aria-label="H2 Economy home" className="rounded-control">
          <Logo version="primary-on-dark" height={36} title="" />
        </a>
        <span className={cx("rounded-[4px] bg-accent px-1.5 type-label-sm text-primary", compact && "max-lg:hidden")}>
          {AREA_LABEL[area]}
        </span>
      </div>
      <nav aria-label={`${AREA_LABEL[area]} workspace`} className="min-h-0 flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-3">
          {groups.map((g, i) => (
            <li key={g.heading ?? String(i)}>
              {g.heading ? (
                <p className={cx("pb-1 pl-8 type-eyebrow text-ink-400", compact && "max-lg:sr-only")}>{g.heading}</p>
              ) : null}
              <ul className="flex flex-col gap-px">
                {g.items.map((item) => (
                  <li key={item.href}>
                    <SidebarItem item={item} active={item.href === activeHref} compact={compact} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
      <a
        href={logoutHref}
        className={cx(
          "flex items-center gap-3 rounded-control py-3 pl-4 type-label text-ink-200 hover:text-inverse",
          compact && "max-lg:justify-center max-lg:pl-0",
        )}
      >
        <Icon name="log-out" size={18} className="text-ink-400" />
        <span className={cx(compact && "max-lg:sr-only")}>Log out</span>
      </a>
    </div>
  );
}

/* Figma "Workspace top bar v2" (194:1191): welcome, search pill, help, notifications with count, profile with
   role. On phones it keeps the menu button, the logo, notifications and the profile. */

export interface WorkspaceUser {
  name: string;
  /** For example "Admin · two-step on". */
  role: string;
  initials: string;
}

export interface WorkspaceShellProps {
  area: WorkspaceArea;
  groups: WorkspaceNavGroup[];
  currentHref: string;
  user: WorkspaceUser;
  /** "Welcome, Anita" */
  welcome: string;
  searchPlaceholder?: string;
  onSearch?: () => void;
  /** The notification centre (or its trigger). */
  notifications?: ReactNode;
  helpHref?: string;
  profileHref: string;
  settingsHref?: string;
  logoutHref: string;
  homeHref?: string;
  /** The top bar's main button, for example the supplier's Add product (584:961). */
  action?: ReactNode;
  children: ReactNode;
}

export function WorkspaceShell({
  area,
  groups,
  currentHref,
  user,
  welcome,
  searchPlaceholder = "Search orders, quotes, products",
  onSearch,
  notifications,
  helpHref,
  profileHref,
  settingsHref,
  logoutHref,
  homeHref = "/",
  action,
  children,
}: WorkspaceShellProps) {
  const [drawer, setDrawer] = useState(false);
  return (
    <RDialog.Root open={drawer} onOpenChange={setDrawer}>
      <div className="flex min-h-dvh bg-page">
        <aside className="sticky top-0 hidden h-dvh shrink-0 md:block md:w-18 lg:w-60">
          <SidebarBody
            area={area}
            groups={groups}
            currentHref={currentHref}
            logoutHref={logoutHref}
            homeHref={homeHref}
            compact
          />
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
              logoutHref={logoutHref}
              homeHref={homeHref}
              compact={false}
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
            <p className="hidden min-w-0 truncate type-h3 lg:block lg:w-55">{welcome}</p>
            {/* Phones and tablets: the wordmark does not fit the icon rail, so it sits in the top bar. */}
            <a href={homeHref} aria-label="H2 Economy home" className="rounded-control lg:hidden">
              <Logo height={28} title="" />
            </a>
            <button
              type="button"
              onClick={onSearch}
              className="hidden h-11 min-w-0 flex-1 items-center gap-2.5 rounded-card bg-subtle pl-4 text-left md:flex"
            >
              <Icon name="search" size={20} className="text-icon-secondary" />
              <span className="truncate type-body text-secondary">{searchPlaceholder}</span>
            </button>
            <div className="ml-auto flex items-center gap-2 md:ml-0 md:gap-4">
              {action ? <div className="hidden md:block">{action}</div> : null}
              {helpHref ? (
                <a
                  href={helpHref}
                  aria-label="Help"
                  className="hidden size-10 items-center justify-center rounded-pill text-icon-secondary hover:bg-subtle md:flex"
                >
                  <Icon name="info" size={22} />
                </a>
              ) : null}
              {notifications}
              <span aria-hidden="true" className="hidden h-8 w-px bg-ink-200 md:block" />
              <Menu>
                <MenuTrigger className="flex items-center gap-3 rounded-pill text-left">
                  <span className="flex size-10 items-center justify-center rounded-pill bg-tint type-label-lg text-primary md:size-11">
                    {user.initials}
                  </span>
                  <span className="hidden flex-col lg:flex">
                    <span className="type-label-lg text-primary">{user.name}</span>
                    <span className="type-caption text-secondary">{user.role}</span>
                  </span>
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
