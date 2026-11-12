"use client";

import {
  Breadcrumbs,
  Button,
  FileRow,
  FileUpload,
  IconButton,
  Menu,
  MenuChoice,
  MenuChoices,
  MenuContent,
  MenuDivider,
  MenuItem,
  MenuTrigger,
  NavLink,
  Pagination,
  SegmentedControl,
  SideNavItem,
  Stepper,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Toaster,
  GlossaryTerm,
  Tooltip,
  useToast,
} from "@h2india/ui";
import { useState } from "react";
import { Row } from "./Section";

export function UploadDemo() {
  const [names, setNames] = useState<string[]>([]);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <FileUpload
          onFiles={(files) => {
            setNames((all) => [...all, ...files.map((f) => f.name)]);
          }}
        />
        {names.map((n) => (
          <FileRow
            key={n}
            name={n}
            status="uploaded"
            meta="Ready to upload"
            onRemove={() => {
              setNames((all) => all.filter((x) => x !== n));
            }}
          />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <FileUpload onFiles={() => undefined} error="This file is over 10 MB. Upload a smaller PDF, JPG or PNG." />
        <FileRow name="GST-certificate.pdf" status="uploading" progress={64} onRemove={() => undefined} />
        <FileRow name="GST-certificate.pdf" status="checking" onRemove={() => undefined} />
        <FileRow name="GST-certificate.pdf" status="uploaded" meta="PDF · 1.2 MB" onRemove={() => undefined} />
        <FileRow name="GST-certificate.pdf" status="error" onRemove={() => undefined} />
      </div>
    </div>
  );
}

function ToastButtons() {
  const toast = useToast();
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          toast({
            tone: "success",
            title: "Product submitted for review",
            body: "We usually review within 2 working days.",
          });
        }}
      >
        Success toast
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          toast({ tone: "error", title: "Could not upload the file", body: "Check your connection and try again." });
        }}
      >
        Error toast
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          toast({
            tone: "info",
            title: "Address removed",
            body: "You can undo this for 10 seconds.",
            action: { label: "Undo", onClick: () => undefined },
          });
        }}
      >
        Info toast with Undo
      </Button>
    </>
  );
}

export function OverlayHintsDemo() {
  return (
    <Toaster>
      <Row label="Tooltip and toast">
        <Tooltip content="GST is added at checkout">
          <IconButton icon="info" label="About GST" look="outline" size="sm" />
        </Tooltip>
        <Tooltip content="GST is added at checkout" side="bottom">
          <Button variant="ghost" size="sm">
            Price excludes GST
          </Button>
        </Tooltip>
        <ToastButtons />
      </Row>
      <Row label="Glossary hover-card (in articles)">
        <p className="type-body text-body">
          SECI issued the{" "}
          <GlossaryTerm
            term="RfS"
            definition="Request for Selection: the tender document SECI issues to invite bids for a SIGHT round."
            href="/knowledge/glossary/rfs"
          >
            RfS
          </GlossaryTerm>{" "}
          for tranche III last week.
        </p>
      </Row>
    </Toaster>
  );
}

export function NavigationDemo() {
  const [view, setView] = useState("buyers");
  const [sort, setSort] = useState("relevance");
  return (
    <>
      <Row label="Breadcrumbs (middle levels collapse on phones)">
        <Breadcrumbs
          items={[
            { label: "Home", href: "#navigation" },
            { label: "Electrolysers", href: "#navigation" },
            { label: "PEM", href: "#navigation" },
            { label: "PEM Electrolyser 50 kW" },
          ]}
        />
      </Row>
      <Tabs defaultValue="specs">
        <TabList aria-label="Product details">
          <Tab value="specs">Specifications</Tab>
          <Tab value="docs">Documents</Tab>
          <Tab value="delivery">Delivery and installation</Tab>
          <Tab value="faq">FAQ</Tab>
          <Tab value="supplier">About the supplier</Tab>
        </TabList>
        <TabPanel value="specs" className="py-4 type-body-sm">
          Rated power, output pressure and purity, as listed by the supplier.
        </TabPanel>
        <TabPanel value="docs" className="py-4 type-body-sm">
          Datasheet and certificates.
        </TabPanel>
        <TabPanel value="delivery" className="py-4 type-body-sm">
          Lead time and installation.
        </TabPanel>
        <TabPanel value="faq" className="py-4 type-body-sm">
          Questions buyers ask.
        </TabPanel>
        <TabPanel value="supplier" className="py-4 type-body-sm">
          Company and verification.
        </TabPanel>
      </Tabs>
      <Row label="Segmented control and menu">
        <SegmentedControl
          label="Show the panel for"
          value={view}
          onValueChange={setView}
          options={[
            { value: "buyers", label: "For buyers" },
            { value: "suppliers", label: "For suppliers" },
          ]}
        />
        <Menu>
          <MenuTrigger asChild>
            <IconButton icon="more-horizontal" label="Row actions" look="outline" size="md" />
          </MenuTrigger>
          <MenuContent>
            <MenuItem icon="pencil">Edit</MenuItem>
            <MenuItem icon="copy">Duplicate</MenuItem>
            <MenuItem icon="eye">Preview</MenuItem>
            <MenuItem icon="download" disabled>
              Download
            </MenuItem>
            <MenuDivider />
            <MenuItem icon="trash" destructive>
              Delete
            </MenuItem>
          </MenuContent>
        </Menu>
        <Menu>
          <MenuTrigger asChild>
            <Button variant="outline" size="sm" leadingIcon="arrow-up-down">
              Sort
            </Button>
          </MenuTrigger>
          <MenuContent>
            <MenuChoices value={sort} onValueChange={setSort}>
              <MenuChoice value="relevance">Relevance</MenuChoice>
              <MenuChoice value="newest">Newest first</MenuChoice>
              <MenuChoice value="price">Price, low to high</MenuChoice>
            </MenuChoices>
          </MenuContent>
        </Menu>
      </Row>
      <Pagination page={2} perPage={25} total={312} onNavigate={() => undefined} />
      <Row label="Stepper · horizontal and vertical">
        <Stepper
          steps={[
            { label: "Cart", status: "complete" },
            { label: "Delivery", status: "current" },
            { label: "Payment", status: "upcoming" },
            { label: "Confirmation", status: "upcoming" },
          ]}
        />
      </Row>
      <Stepper
        orientation="vertical"
        steps={[
          { label: "Company profile", detail: "Completed 2 Nov 2026", status: "complete" },
          { label: "Documents", detail: "Uploaded 3 Nov 2026", status: "complete" },
          { label: "Submitted", detail: "Upload the documents your category needs", status: "current" },
          { label: "Review", detail: "Starts after you submit", status: "upcoming" },
          { label: "Decision", detail: "Usually within 2 working days", status: "upcoming" },
        ]}
      />
      <Row label="Side nav item (on the bg/subtle sidebar) and nav link" surface="subtle">
        <div className="flex w-52 flex-col gap-1">
          <SideNavItem href="#navigation" icon="layout-dashboard" active>
            Dashboard
          </SideNavItem>
          <SideNavItem href="#navigation" icon="file-text" count={3}>
            Quote requests
          </SideNavItem>
          <SideNavItem href="#navigation" icon="package">
            Orders
          </SideNavItem>
        </div>
        <NavLink href="#navigation" chevron>
          Categories
        </NavLink>
        <NavLink href="#navigation">Insights</NavLink>
        <NavLink href="#navigation" chevron open>
          Suppliers
        </NavLink>
      </Row>
    </>
  );
}
