"use client";

import {
  Button,
  Checkbox,
  ConfirmDialog,
  DataTable,
  DatePicker,
  Drawer,
  FilterChip,
  FilterGroup,
  FilterPanel,
  FormField,
  IconButton,
  Input,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  NotificationCentre,
  Pagination,
  RangeFilter,
  ReviewPanel,
  SearchSuggest,
  Select,
  StatusBadge,
  Textarea,
  TextLink,
  type Column,
  type SortDirection,
} from "@h2india/ui";
import { useState } from "react";
import { Row } from "./Section";

export function OverlaysDemo() {
  const [confirm, setConfirm] = useState(false);
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState("");
  const [drawer, setDrawer] = useState(false);
  return (
    <Row label="Confirm dialog and drawer">
      <Button
        variant="outline"
        onClick={() => {
          setConfirm(true);
        }}
      >
        Accept quote…
      </Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Accept this quote?"
        description="Accepting adds this quote to your cart at ₹38,40,000 + GST. Other quotes for this request will be closed."
        confirmLabel="Accept quote"
        onConfirm={() => {
          setConfirm(false);
        }}
      />
      <Button
        variant="outline"
        onClick={() => {
          setReject(true);
        }}
      >
        Reject application…
      </Button>
      <ConfirmDialog
        open={reject}
        onOpenChange={setReject}
        tone="destructive"
        title="Reject this application?"
        description="This is final. The supplier cannot resubmit. Tell them why."
        confirmLabel="Reject application"
        confirmDisabled={reason.trim() === ""}
        onConfirm={() => {
          setReject(false);
        }}
      >
        <FormField label="Reason for rejection" required>
          <Textarea
            maxLength={1000}
            showCount
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
            }}
          />
        </FormField>
      </ConfirmDialog>
      <Drawer
        open={drawer}
        onOpenChange={setDrawer}
        title="Filters"
        trigger={
          <Button variant="outline" leadingIcon="sliders">
            Filters
          </Button>
        }
        footer={
          <>
            <Button variant="ghost">Clear all</Button>
            <Button
              onClick={() => {
                setDrawer(false);
              }}
            >
              Show 24 results
            </Button>
          </>
        }
      >
        <div className="px-6">
          <FilterDemo />
        </div>
      </Drawer>
    </Row>
  );
}

interface Product {
  id: string;
  name: string;
  supplier: string;
  category: string;
  price: number;
  status: string;
  updated: string;
}

const PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "PEM Electrolyser 50 kW",
    supplier: "Hydrotek Systems",
    category: "Electrolysers",
    price: 4250000,
    status: "Pending approval",
    updated: "2 h ago",
  },
  {
    id: "p2",
    name: "Alkaline stack 1 MW",
    supplier: "Pranava H2",
    category: "Electrolysers",
    price: 38400000,
    status: "Under review",
    updated: "5 h ago",
  },
  {
    id: "p3",
    name: "Hydrogen leak detector, ATEX",
    supplier: "SenseSafe",
    category: "Safety",
    price: 86500,
    status: "Changes requested",
    updated: "Yesterday",
  },
  {
    id: "p4",
    name: "Diaphragm compressor 350 bar",
    supplier: "Kompress India",
    category: "Compression",
    price: 6720000,
    status: "Approved",
    updated: "3 Nov",
  },
];

const inr = (paise: number) => paise.toLocaleString("en-IN");

export function TableDemo() {
  const [selected, setSelected] = useState<string[]>([]);
  const [sort, setSort] = useState<{ key: string; direction: SortDirection }>({ key: "updated", direction: "desc" });
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);
  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product",
      sortable: true,
      width: 280,
      hideOnCard: true,
      render: (p) => <span className="type-label text-primary">{p.name}</span>,
    },
    { key: "supplier", header: "Supplier", width: 200, render: (p) => p.supplier },
    { key: "category", header: "Category", width: 160, render: (p) => p.category },
    { key: "price", header: "Price (₹, before GST)", numeric: true, width: 170, render: (p) => inr(p.price) },
    { key: "status", header: "Status", width: 170, render: (p) => <StatusBadge status={p.status} /> },
    {
      key: "updated",
      header: "Updated",
      sortable: true,
      width: 108,
      render: (p) => <span className="type-caption text-secondary">{p.updated}</span>,
    },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setLoading((v) => !v);
          }}
        >
          Toggle loading
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEmpty((v) => !v);
          }}
        >
          Toggle empty
        </Button>
      </div>
      <DataTable
        label="Products awaiting review"
        columns={columns}
        rows={empty ? [] : PRODUCTS}
        getRowId={(p) => p.id}
        cardTitle={(p) => p.name}
        state={loading ? "loading" : "ready"}
        sort={sort}
        onSortChange={setSort}
        selectable
        selected={selected}
        onSelectedChange={setSelected}
        toolbar={
          <>
            <Input
              leadingIcon="search"
              placeholder="Search products or suppliers"
              boxClassName="w-full sm:w-80"
              aria-label="Search products or suppliers"
            />
            <FilterChip label="Status: needs review" onRemove={() => undefined} />
            <div className="flex-1" />
            <Select aria-label="Saved view" defaultValue="mine" boxClassName="w-56">
              <option value="mine">View: Awaiting my review</option>
              <option value="all">View: All products</option>
            </Select>
            <Button variant="outline" size="sm" leadingIcon="download">
              Export CSV
            </Button>
          </>
        }
        bulkActions={
          <>
            <Button size="sm">Approve</Button>
            <Button size="sm" variant="inverse">
              Request changes
            </Button>
            <Button size="sm" variant="destructive">
              Reject
            </Button>
          </>
        }
        rowActions={(p) => (
          <Menu>
            <MenuTrigger asChild>
              <IconButton icon="more-horizontal" look="outline" size="sm" label={`Actions for ${p.name}`} />
            </MenuTrigger>
            <MenuContent>
              <MenuItem icon="eye">Open</MenuItem>
              <MenuItem icon="pencil">Edit</MenuItem>
            </MenuContent>
          </Menu>
        )}
        empty={
          <p className="py-10 text-center type-body-sm text-secondary">No products match. Try removing a filter.</p>
        }
        footer={<Pagination page={1} perPage={25} total={empty ? 0 : 4} onNavigate={() => undefined} />}
      />
    </div>
  );
}

export function FilterDemo() {
  const [power, setPower] = useState({ min: "", max: "" });
  return (
    <FilterPanel
      onClear={() => {
        setPower({ min: "", max: "" });
      }}
    >
      <FilterGroup title="Technology">
        <Checkbox label="Alkaline (12)" />
        <Checkbox label="PEM (38)" defaultChecked />
        <Checkbox label="AEM (4)" />
      </FilterGroup>
      <FilterGroup title="Rated power">
        <RangeFilter label="Rated power" unit="kW" min={power.min} max={power.max} onChange={setPower} />
      </FilterGroup>
      <FilterGroup title="Specific energy" note="At rated load, beginning of life">
        <RangeFilter label="Specific energy" unit="kWh/kg" min="" max="" onChange={() => undefined} />
      </FilterGroup>
      <FilterGroup title="Lead time">
        <Select aria-label="Lead time" defaultValue="">
          <option value="">Any lead time</option>
          <option value="4">Within 4 weeks</option>
        </Select>
      </FilterGroup>
    </FilterPanel>
  );
}

export function PanelsDemo() {
  const [items, setItems] = useState([
    {
      id: "n1",
      icon: "file-text" as const,
      title: "New quote from Pranava H2",
      detail: "For RFQ-2026-0088 · ₹38,40,000 + GST",
      time: "12 min ago",
      unread: true,
      href: "#tables",
    },
    {
      id: "n2",
      icon: "shopping-bag" as const,
      title: "Order HG-ORD-2026-0142 shipped",
      detail: "Delhivery AWB 8812 4410 2231",
      time: "2 h ago",
      unread: true,
      href: "#tables",
    },
    {
      id: "n3",
      icon: "shield-check" as const,
      iconColour: "success" as const,
      title: "Your product was approved",
      detail: "PEM Electrolyser 50 kW is now live",
      time: "Yesterday",
      unread: false,
      href: "#tables",
    },
  ]);
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_380px_1fr]">
      <FilterDemo />
      <ReviewPanel
        status="Under review"
        checks={[
          { ok: true, text: "GSTIN format valid and active" },
          { ok: true, text: "Company name matches the GST certificate" },
          { ok: true, text: "All 3 required documents uploaded" },
          { ok: false, text: "Factory licence expires in 20 days" },
        ]}
        history={["4 Nov, 09:10 · Review started by Anita S.", "3 Nov, 18:42 · Submitted by Hydrotek Systems"]}
        onDecision={() => undefined}
      />
      <div>
        <p className="type-label-sm text-secondary">Notification centre</p>
        <div className="mt-3">
          <NotificationCentre
            items={items}
            allHref="#tables"
            onMarkAllRead={() => {
              setItems((all) => all.map((i) => ({ ...i, unread: false })));
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function SearchDatesDemo() {
  const [q, setQ] = useState("pem");
  const [due, setDue] = useState<Date | undefined>();
  const groups = [
    {
      label: "Categories",
      items: [
        { id: "c1", label: "PEM electrolysers", meta: "64 products", icon: "zap" as const, href: "#search" },
        { id: "c2", label: "PEM fuel cells", meta: "41 products", icon: "zap" as const, href: "#search" },
      ],
    },
    {
      label: "Products",
      items: [
        {
          id: "p1",
          label: "PEM Electrolyser 50 kW",
          meta: "Hydrotek Systems · Electrolysers",
          icon: "file-text" as const,
          href: "#search",
        },
        {
          id: "p2",
          label: "PEM fuel cell module 100 kW",
          meta: "Pranava H2 · Fuel cells",
          icon: "file-text" as const,
          href: "#search",
        },
      ],
    },
    {
      label: "Suppliers",
      items: [
        {
          id: "s1",
          label: "PEM Power India",
          meta: "Verified supplier · Chennai",
          icon: "building" as const,
          href: "#search",
        },
      ],
    },
  ];
  const filtered = groups.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())),
  }));
  return (
    <div className="grid grid-cols-1 gap-8 pb-60 lg:grid-cols-2">
      <SearchSuggest
        value={q}
        onValueChange={setQ}
        groups={filtered}
        recent={[{ id: "r1", label: "Hydrogen compressor 350 bar", icon: "clock", href: "#search" }]}
        onOpen={() => undefined}
        onSubmit={() => undefined}
        footer={
          <>
            <TextLink href="#search" showIcon={false}>
              See all results for “{q}”
            </TextLink>
            <TextLink href="#search" showIcon={false}>
              Can’t find it? Request a quote
            </TextLink>
          </>
        }
      />
      <FormField label="Quotes due by" helper="Type a date or pick one.">
        <DatePicker value={due} onChange={setDue} />
      </FormField>
    </div>
  );
}
