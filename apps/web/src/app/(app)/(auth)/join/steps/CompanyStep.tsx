"use client";

import { GSTIN_FORMAT_MESSAGE, isValidGstin, normaliseGstin, type GstinState } from "@h2india/core/companies/client";
import { Alert, Button, Checkbox, FormField, Icon, Input, Radio, RadioGroup } from "@h2india/ui";
import { useRef, useState, type ReactNode } from "react";
import { createCompanyAction, requestToJoinAction } from "../actions";
import { Progress } from "./Progress";

// Join step 4 (Figma 525:401) with the eight GSTIN states (526:8) and "Checking the GST portal" (526:384).
// A company name field appears whenever the portal cannot give the legal name (no GSTIN, not found, pending,
// unverified buyer); the design does not draw it (docs/design-fidelity.md).

type Mode = "check" | "without" | "unverified";

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-3 py-1.5">
      <dt className="type-caption text-secondary">{label}</dt>
      <dd className="type-body-sm text-primary">{value}</dd>
    </div>
  );
}

export function CompanyStep(props: {
  kind: "buyer" | "supplier";
  onDone: (href: string) => void;
  onBack?: () => void;
}) {
  const [gstin, setGstin] = useState("");
  const [result, setResult] = useState<GstinState | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const [mode, setMode] = useState<Mode>("check");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [chosen, setChosen] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const latest = useRef("");

  const check = async (value: string) => {
    latest.current = value;
    setResult(null);
    setCheckFailed(false);
    if (!isValidGstin(value)) {
      setResult({ state: "invalid_format" });
      return;
    }
    setChecking(true);
    const res = await fetch("/api/v1/organisations/gstin-check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gstin: value }),
    }).catch(() => null);
    if (latest.current !== value) return;
    setChecking(false);
    if (!res?.ok) {
      setCheckFailed(true);
      return;
    }
    const state = (await res.json()) as GstinState;
    setResult(state);
    if (state.state === "several") setChosen(state.gstins[0]?.gstin ?? "");
  };

  const onInput = (raw: string) => {
    const value = normaliseGstin(raw).slice(0, 15);
    setGstin(value);
    setProblem(undefined);
    if (value.length === 15) void check(value);
    else {
      latest.current = "";
      setResult(null);
      setChecking(false);
    }
  };

  const create = async (gstins: string[], withName: boolean) => {
    if (withName && name.trim().length < 2) {
      setNameError("Enter the company name");
      return;
    }
    setBusy(true);
    setProblem(undefined);
    const r = await createCompanyAction({ gstins, name: withName ? name : undefined });
    setBusy(false);
    if (r.ok) {
      props.onDone(r.value);
      return;
    }
    if (r.code === "ALREADY_REGISTERED" && gstins[0]) void check(gstins[0]);
    else setProblem("We couldn't create the company. Check your connection and try again.");
  };

  const join = async (organisationId: string) => {
    setBusy(true);
    const r = await requestToJoinAction(organisationId);
    setBusy(false);
    if (r.ok) props.onDone(r.value);
    else setProblem("We couldn't send the request. Check your connection and try again.");
  };

  const nameField = (
    <FormField label="Company name" error={nameError}>
      <Input
        autoComplete="organization"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setNameError(undefined);
        }}
      />
    </FormField>
  );

  const without = mode === "without";
  const actions = (primary: ReactNode) => (
    <div className="flex items-center gap-4">
      {props.onBack ? (
        <Button variant="ghost" size="lg" onClick={props.onBack}>
          Back
        </Button>
      ) : null}
      <div className="flex-1">{primary}</div>
    </div>
  );

  return (
    <>
      <Progress step={4} of={4} label="Company details" />
      <h1 className="type-h2 text-primary">Company details</h1>
      <p className="type-body text-body">Enter your GSTIN and we&apos;ll fill in the rest.</p>
      {problem ? (
        <Alert tone="error" title="Something went wrong" live>
          {problem}
        </Alert>
      ) : null}

      {without ? null : (
        <FormField label="GSTIN" error={result?.state === "invalid_format" ? GSTIN_FORMAT_MESSAGE : undefined}>
          <Input
            value={gstin}
            autoComplete="off"
            spellCheck={false}
            maxLength={20}
            className="uppercase"
            onChange={(e) => {
              onInput(e.target.value);
            }}
            onPaste={(e) => {
              e.preventDefault();
              onInput(e.clipboardData.getData("text"));
            }}
          />
        </FormField>
      )}

      {checking ? (
        <p className="flex items-center gap-2 type-body-sm text-body" role="status">
          <Icon name="loader" size={16} className="motion-safe:animate-spin" />
          Checking the GST portal…
        </p>
      ) : null}
      {checkFailed ? (
        <Alert tone="error" title="We couldn't check this GSTIN" live>
          Check your connection and try again.
        </Alert>
      ) : null}

      {!without && result?.state === "valid" ? (
        <>
          <Alert tone="success" title="GSTIN is active" live>
            We found your company on the GST portal.
          </Alert>
          <dl className="rounded-card bg-subtle px-3 py-2.5">
            <Detail label="Legal name" value={result.legalName} />
            <Detail label="State" value={result.stateName} />
            <Detail label="Registered address" value={result.address} />
            <Detail label="PAN" value={result.pan} />
          </dl>
          <Alert tone="info" title="Verification runs in the background">
            You can continue now. We&apos;ll tell you when the checks are done.
          </Alert>
          {actions(
            <Button size="lg" className="w-full" disabled={busy} onClick={() => void create([result.gstin], false)}>
              Create company
            </Button>,
          )}
        </>
      ) : null}

      {!without && result?.state === "not_found" ? (
        <>
          <Alert tone="error" title="We couldn't find this GSTIN" live>
            Check it against your GST certificate. If it&apos;s new, it can take a few days to appear on the GST portal.
          </Alert>
          <Button
            variant="ghost"
            className="self-start"
            onClick={() => {
              setMode("without");
            }}
          >
            Continue without a GSTIN
          </Button>
        </>
      ) : null}

      {!without && result?.state === "inactive" ? (
        mode === "unverified" ? (
          <>
            {nameField}
            {actions(
              <Button size="lg" className="w-full" disabled={busy} onClick={() => void create([result.gstin], true)}>
                Create company
              </Button>,
            )}
          </>
        ) : (
          <>
            <Alert
              tone="warning"
              title={`This GSTIN is ${result.status === "Cancelled" ? "cancelled" : "inactive"}`}
              live
            >
              Suppliers can&apos;t continue with a {result.status === "Cancelled" ? "cancelled" : "inactive"} GSTIN. As
              a buyer you can continue, but your company will show as unverified.
            </Alert>
            <div className="flex flex-wrap items-center gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  onInput("");
                }}
              >
                Use another GSTIN
              </Button>
              {props.kind === "buyer" ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setName(result.legalName);
                    setMode("unverified");
                  }}
                >
                  Continue as unverified buyer
                </Button>
              ) : null}
            </div>
          </>
        )
      ) : null}

      {!without && result?.state === "already_registered" ? (
        <>
          <Alert tone="info" title={`${result.name} is already on H2 Economy`} live>
            {result.members} {result.members === 1 ? "colleague has" : "colleagues have"} joined. Ask the company admin
            to add you instead of creating a second account.
          </Alert>
          <Button size="lg" className="w-full" disabled={busy} onClick={() => void join(result.organisationId)}>
            Request to join
          </Button>
        </>
      ) : null}

      {!without && result?.state === "pending" ? (
        <>
          <Alert tone="info" title="We'll check this in the background" live>
            The GST portal isn&apos;t responding right now. Continue, and we&apos;ll show a banner until the check is
            done.
          </Alert>
          {nameField}
          <Button size="lg" className="w-full" disabled={busy} onClick={() => void create([result.gstin], true)}>
            Continue
          </Button>
        </>
      ) : null}

      {!without && result?.state === "several" ? (
        <>
          <p className="type-body text-body">
            Your PAN {result.pan} has {result.gstins.length} GSTINs. Choose the one for this account: each company on H2
            Economy has one GSTIN.
          </p>
          <RadioGroup
            aria-label="GSTIN for this account"
            value={chosen}
            onValueChange={setChosen}
            className="flex flex-col gap-4"
          >
            {result.gstins.map((x) => (
              <Radio key={x.gstin} value={x.gstin} label={`${x.gstin} · ${x.stateName} · ${x.city}`} />
            ))}
          </RadioGroup>
          <Button size="lg" className="w-full" disabled={busy} onClick={() => void create([chosen], false)}>
            Continue
          </Button>
        </>
      ) : null}

      {without || checking || !result || result.state === "invalid_format" || result.state === "not_found" ? (
        <Checkbox
          checked={without}
          onCheckedChange={(v) => {
            setMode(v === true ? "without" : "check");
          }}
          label="I don't have a GSTIN yet"
        />
      ) : null}
      {without ? (
        <>
          <Alert tone="info" title="You can still use H2 Economy">
            Browse and send quote requests now. Suppliers can&apos;t publish products until they add a GSTIN.
          </Alert>
          {nameField}
          {actions(
            <Button size="lg" className="w-full" disabled={busy} onClick={() => void create([], true)}>
              Continue
            </Button>,
          )}
        </>
      ) : null}
    </>
  );
}
