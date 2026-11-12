"use client";

import { SUBMISSION_LIMITS, SUBMIT_EVENT_TYPES, SUBMIT_FORMATS, type SubmissionKind } from "@h2india/core/events/rules";
import {
  Alert,
  Button,
  buttonClasses,
  Checkbox,
  DatePicker,
  FileRow,
  FileUpload,
  FormField,
  Input,
  Radio,
  RadioGroup,
  Select,
  StatusBadge,
  Textarea,
} from "@h2india/ui";
import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { useFormGuard } from "@/lib/form-guard";
import { checkFile, uploadHint, useUploads } from "@/lib/uploads";
import { submitContent, type SubmitResult } from "./actions";
import { ErrorSummary, FormCard, NetworkError, Success } from "./parts";

// The four public forms (step 5.7): Submit an event 501:8485 (errors 502:1492, logo uploading 502:1834, success
// 503:294), Submit a press release 504:8 (505:193), Suggest a correction 504:455 (505:247) and Write for us 504:985
// (505:288), with the shared states 505:329 (upload error) and 505:373 (network error). The server checks everything.

type Kind = SubmissionKind;
type Values = Record<string, unknown>;

const isoDay = (d: Date) =>
  `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromIso = (s: unknown) =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : undefined;

/** Form state, submit and the result, shared by the public forms (and the step 5.8 ones in trust/forms.tsx). */
export function useSubmission(kind: Kind, initial: Values) {
  const [v, setV] = useState<Values>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [network, setNetwork] = useState(false);
  const [pending, start] = useTransition();
  const { trap, guard } = useFormGuard();
  const set = (k: string, value: unknown) => {
    setV((x) => ({ ...x, [k]: value }));
    if (k in errors) setErrors((e) => Object.fromEntries(Object.entries(e).filter(([key]) => key !== k)));
  };
  const submit = (extra: Values = {}) => {
    setNetwork(false);
    start(async () => {
      let r: SubmitResult;
      try {
        r = await submitContent(kind, { ...v, ...extra }, guard());
      } catch {
        setNetwork(true);
        return;
      }
      if (!r.ok && r.reason === "failed") {
        setNetwork(true);
        return;
      }
      setErrors(r.ok ? {} : (r.errors ?? {}));
      setResult(r);
      if (r.ok || r.errors) window.scrollTo({ top: 0 });
    });
  };
  const text = (k: string) => (typeof v[k] === "string" ? v[k] : "");
  return { v, set, text, errors, result, network, pending, submit, trap };
}

function Actions({ pending, label, cancel }: { pending: boolean; label: string; cancel: string }) {
  return (
    <div className="flex items-center gap-3">
      <Button type="submit" disabled={pending}>
        {label}
      </Button>
      <Link href={cancel} className={buttonClasses({ variant: "ghost" })}>
        Cancel
      </Link>
    </div>
  );
}

export function Shell({ children, onSubmit }: { children: ReactNode; onSubmit: () => void }) {
  return (
    <form
      noValidate
      className="flex min-w-0 max-w-200 flex-1 flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
    </form>
  );
}

export function Limited({ result }: { result: SubmitResult | null }) {
  if (!result || result.ok || result.reason !== "limited") return null;
  return <Alert live tone="error" title="Too many forms from here. Try again in an hour." />;
}

// ---------------------------------------------------------------------------------------------------------- event

export function EventForm({ organiser }: { organiser: string }) {
  const f = useSubmission("event", { organiser, format: "In person" });
  const uploads = useUploads("logo");
  const logo = uploads.items[0];
  const logoProblem = logo?.state === "error" ? logo.problem : undefined;
  if (f.result?.ok) {
    return (
      <Success
        title="Thanks, your event is under review"
        text="We usually review within 1 working day and email you when it's live."
        reference={f.result.reference}
        card={
          <div className="flex w-full items-center justify-between gap-3 rounded-card border border-default p-4 text-left">
            <span className="flex flex-col">
              <span className="type-label text-primary">{f.text("title")}</span>
              <span className="type-caption text-secondary">
                {[f.text("type"), f.text("startDate"), f.text("format") === "Online" ? "Online" : f.text("venue")]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <StatusBadge status="Under review" tone="success" />
          </div>
        }
        actions={[
          { label: "Submit another event", href: "/events/submit?new=1", primary: true },
          { label: "Go to my workspace", href: "/supplier" },
        ]}
      />
    );
  }
  const send = () => {
    if (logo && logo.state !== "uploaded" && logo.state !== "error") return;
    f.submit({ logo: logo?.state === "uploaded" ? logo.fileId : "" });
  };
  return (
    <Shell onSubmit={send}>
      {f.trap}
      <ErrorSummary errors={f.errors} />
      <Limited result={f.result} />
      <FormCard title="About the event">
        <FormField label="Event title" required error={f.errors.title}>
          <Input
            placeholder="e.g. Western India Hydrogen Summit 2027"
            value={f.text("title")}
            onChange={(e) => {
              f.set("title", e.target.value);
            }}
          />
        </FormField>
        <FormField label="Event type" required error={f.errors.type}>
          <Select
            value={f.text("type")}
            onChange={(e) => {
              f.set("type", e.target.value);
            }}
          >
            <option value="">Choose a type</option>
            {SUBMIT_EVENT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Description" required error={f.errors.description}>
          <Textarea
            rows={4}
            showCount
            maxLength={SUBMISSION_LIMITS.eventDescription}
            placeholder="What will people see or learn? Who should attend?"
            value={f.text("description")}
            onChange={(e) => {
              f.set("description", e.target.value);
            }}
          />
        </FormField>
      </FormCard>
      <FormCard title="Date and place">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Start date" required error={f.errors.startDate}>
            <DatePicker
              placeholder="DD/MM/YYYY"
              value={fromIso(f.v.startDate)}
              onChange={(d) => {
                f.set("startDate", d ? isoDay(d) : "");
              }}
              invalid={Boolean(f.errors.startDate)}
            />
          </FormField>
          <FormField label="End date" required error={f.errors.endDate}>
            <DatePicker
              placeholder="DD/MM/YYYY"
              value={fromIso(f.v.endDate)}
              onChange={(d) => {
                f.set("endDate", d ? isoDay(d) : "");
              }}
              invalid={Boolean(f.errors.endDate)}
            />
          </FormField>
        </div>
        <div className="flex flex-col gap-2">
          <p id="format-label" className="type-label text-primary">
            Format <span className="text-error">*</span>
          </p>
          <RadioGroup
            aria-labelledby="format-label"
            value={f.text("format")}
            onValueChange={(x) => {
              f.set("format", x);
            }}
            className="flex flex-wrap gap-6"
          >
            {SUBMIT_FORMATS.map((m) => (
              <Radio key={m} value={m} label={m} />
            ))}
          </RadioGroup>
        </div>
        <FormField label="Venue and city" required={f.text("format") !== "Online"} error={f.errors.venue}>
          <Input
            placeholder="e.g. Bharat Mandapam, New Delhi"
            value={f.text("venue")}
            onChange={(e) => {
              f.set("venue", e.target.value);
            }}
          />
        </FormField>
      </FormCard>
      <FormCard title="Organiser and tickets">
        <FormField label="Organiser" required error={f.errors.organiser} helper="From your company profile">
          <Input
            value={f.text("organiser")}
            onChange={(e) => {
              f.set("organiser", e.target.value);
            }}
          />
        </FormField>
        <FormField
          label="Ticket or registration link"
          required
          error={f.errors.link}
          helper="Paid events must show the ticket price on this page"
        >
          <Input
            type="url"
            placeholder="https://"
            value={f.text("link")}
            onChange={(e) => {
              f.set("link", e.target.value);
            }}
          />
        </FormField>
        <div className="flex flex-col gap-2">
          <span className="type-label text-primary">Logo</span>
          <FileUpload
            multiple={false}
            accept="image/png,image/jpeg,image/svg+xml,.png,.jpg,.jpeg,.svg"
            label="Drop your logo here or browse"
            hint={`${uploadHint("logo")}. Square logos work best.`}
            check={(file) => checkFile("logo", file)}
            error={logoProblem}
            onFiles={(files) => {
              uploads.add(files);
            }}
          />
          {logo ? (
            <FileRow
              name={logo.name}
              status={logo.state}
              progress={logo.progress}
              meta={logo.meta}
              error={logo.problem}
              onRemove={() => {
                uploads.remove(logo.localId);
              }}
            />
          ) : null}
          {logoProblem ? (
            <Alert tone="error" title="Logo not uploaded">
              Choose a smaller PNG, JPG or SVG file. Everything else you entered is still here.
            </Alert>
          ) : null}
        </div>
      </FormCard>
      {f.network ? (
        <NetworkError onRetry={send} cancelHref="/events" />
      ) : (
        <Actions
          pending={f.pending || logo?.state === "uploading" || logo?.state === "checking"}
          label="Submit for review"
          cancel="/events"
        />
      )}
    </Shell>
  );
}

// -------------------------------------------------------------------------------------------------- press release

export function PressReleaseForm({ company, contact }: { company: string; contact: { name: string; email: string } }) {
  const f = useSubmission("press_release", { contactName: contact.name, contactEmail: contact.email, embargo: false });
  const uploads = useUploads("press_image", { max: SUBMISSION_LIMITS.pressImages });
  if (f.result?.ok) {
    return (
      <Success
        title="Thanks, your press release is under review"
        text="We review within 1 working day. We'll either publish it with a Press release label or email you about changes."
        reference={f.result.reference}
        actions={[
          { label: "Submit another", href: "/news/submit?new=1", primary: true },
          { label: "Go to my workspace", href: "/supplier" },
        ]}
      />
    );
  }
  const busy = uploads.items.some((i) => i.state === "uploading" || i.state === "checking");
  const send = () => {
    if (busy) return;
    f.submit({ images: uploads.items.filter((i) => i.state === "uploaded").map((i) => i.fileId) });
  };
  const bad = uploads.items.find((i) => i.state === "error");
  return (
    <Shell onSubmit={send}>
      {f.trap}
      <ErrorSummary errors={f.errors} />
      <Limited result={f.result} />
      <FormCard title="Press release">
        <FormField label="Company" required helper="Verified company, from your profile" error={f.errors.company}>
          <Input value={company} readOnly />
        </FormField>
        <FormField label="Headline" required error={f.errors.headline}>
          <Input
            maxLength={SUBMISSION_LIMITS.pressHeadline}
            placeholder="Say what happened in under 120 characters"
            value={f.text("headline")}
            onChange={(e) => {
              f.set("headline", e.target.value);
            }}
          />
        </FormField>
        <FormField label="Body" required error={f.errors.body}>
          <Textarea
            rows={6}
            showCount
            maxLength={SUBMISSION_LIMITS.pressBody}
            placeholder="Paste your release. Start with the news, then the details."
            value={f.text("body")}
            onChange={(e) => {
              f.set("body", e.target.value);
            }}
          />
        </FormField>
      </FormCard>
      <FormCard title="Timing">
        <Checkbox
          label="Hold until an embargo date and time"
          checked={f.v.embargo === true}
          onCheckedChange={(on) => {
            f.set("embargo", on === true);
          }}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Embargo date" error={f.errors.embargoDate}>
            <DatePicker
              placeholder="DD/MM/YYYY"
              value={fromIso(f.v.embargoDate)}
              onChange={(d) => {
                f.set("embargoDate", d ? isoDay(d) : "");
              }}
            />
          </FormField>
          <FormField label="Time (IST)">
            <Input
              type="time"
              placeholder="HH:MM"
              value={f.text("embargoTime")}
              onChange={(e) => {
                f.set("embargoTime", e.target.value);
              }}
            />
          </FormField>
        </div>
      </FormCard>
      <FormCard title="Images">
        <FileUpload
          multiple
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          label="Drop images here or browse"
          hint={uploadHint("press_image")}
          check={(file) => checkFile("press_image", file)}
          error={f.errors.images}
          onFiles={(files) => {
            uploads.add(files);
          }}
        />
        {uploads.items.map((i) => (
          <FileRow
            key={i.localId}
            name={i.name}
            status={i.state}
            progress={i.progress}
            meta={i.meta}
            error={i.problem}
            onRemove={() => {
              uploads.remove(i.localId);
            }}
          />
        ))}
        {bad ? (
          <Alert tone="error" title="Image not uploaded">
            Choose a JPG or PNG file up to 10 MB. Everything else you entered is still here.
          </Alert>
        ) : null}
        <FormField
          label="Image credit"
          required={uploads.items.length > 0}
          error={f.errors.credit}
          helper="Credit every image. We don't publish uncredited photos."
        >
          <Input
            placeholder="e.g. Photo: Konkan Hydrogen Tech"
            value={f.text("credit")}
            onChange={(e) => {
              f.set("credit", e.target.value);
            }}
          />
        </FormField>
      </FormCard>
      <FormCard title="Media contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" required error={f.errors.contactName}>
            <Input
              value={f.text("contactName")}
              onChange={(e) => {
                f.set("contactName", e.target.value);
              }}
            />
          </FormField>
          <FormField label="Email" required error={f.errors.contactEmail}>
            <Input
              type="email"
              value={f.text("contactEmail")}
              onChange={(e) => {
                f.set("contactEmail", e.target.value);
              }}
            />
          </FormField>
        </div>
        <FormField label="Phone">
          <Input
            type="tel"
            placeholder="+91 98200 00000"
            value={f.text("contactPhone")}
            onChange={(e) => {
              f.set("contactPhone", e.target.value);
            }}
          />
        </FormField>
      </FormCard>
      {f.network ? (
        <NetworkError onRetry={send} cancelHref="/news" />
      ) : (
        <Actions pending={f.pending || busy} label="Submit for review" cancel="/news" />
      )}
    </Shell>
  );
}

// ----------------------------------------------------------------------------------------------------- correction

export function CorrectionForm({ page }: { page: string }) {
  const f = useSubmission("correction", { page });
  if (f.result?.ok) {
    return (
      <Success
        title="Thanks, we've received your correction"
        text={
          f.text("email")
            ? "We'll check it against the source. Because you left an email, we'll tell you the outcome."
            : "We'll check it against the source and add a correction note if we change the page."
        }
        reference={f.result.reference}
        actions={[
          { label: "Back to the article", href: page.startsWith("/") ? page : "/", primary: true },
          { label: "Read our corrections policy", href: "/legal/corrections" },
        ]}
      />
    );
  }
  return (
    <Shell
      onSubmit={() => {
        f.submit();
      }}
    >
      {f.trap}
      <ErrorSummary errors={f.errors} />
      <Limited result={f.result} />
      <FormCard title="What needs correcting">
        <FormField label="Page" required error={f.errors.page} helper="Filled in from the page you came from">
          <Input
            value={f.text("page")}
            onChange={(e) => {
              f.set("page", e.target.value);
            }}
          />
        </FormField>
        <FormField label="What is wrong" required error={f.errors.wrong}>
          <Textarea
            rows={3}
            showCount
            maxLength={SUBMISSION_LIMITS.correction}
            placeholder="Quote the sentence or figure that's wrong"
            value={f.text("wrong")}
            onChange={(e) => {
              f.set("wrong", e.target.value);
            }}
          />
        </FormField>
        <FormField label="Correct information" required error={f.errors.correct}>
          <Textarea
            rows={3}
            showCount
            maxLength={SUBMISSION_LIMITS.correction}
            placeholder="What should it say?"
            value={f.text("correct")}
            onChange={(e) => {
              f.set("correct", e.target.value);
            }}
          />
        </FormField>
        <FormField
          label="Source link"
          required
          error={f.errors.source}
          helper="An official notice, filing or the original report"
        >
          <Input
            type="url"
            placeholder="https://"
            value={f.text("source")}
            onChange={(e) => {
              f.set("source", e.target.value);
            }}
          />
        </FormField>
      </FormCard>
      <FormCard title="Your contact (optional)">
        <FormField label="Email" error={f.errors.email} helper="Only if you'd like to hear the outcome">
          <Input
            type="email"
            placeholder="you@example.com"
            value={f.text("email")}
            onChange={(e) => {
              f.set("email", e.target.value);
            }}
          />
        </FormField>
      </FormCard>
      {f.network ? (
        <NetworkError
          onRetry={() => {
            f.submit();
          }}
          cancelHref={page || "/"}
        />
      ) : (
        <Actions pending={f.pending} label="Send correction" cancel={page.startsWith("/") ? page : "/"} />
      )}
    </Shell>
  );
}

// ---------------------------------------------------------------------------------------------------------- pitch

export function PitchForm() {
  const f = useSubmission("pitch", { nothingToDeclare: false });
  if (f.result?.ok) {
    return (
      <Success
        title="Thanks, your pitch is with our editors"
        text="An editor will reply by email, whether or not we take it."
        reference={f.result.reference}
        actions={[
          { label: "Read recent insights", href: "/knowledge/insights", primary: true },
          { label: "Back to home", href: "/" },
        ]}
      />
    );
  }
  return (
    <Shell
      onSubmit={() => {
        f.submit();
      }}
    >
      {f.trap}
      <ErrorSummary errors={f.errors} />
      <Limited result={f.result} />
      <FormCard title="About you">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" required error={f.errors.name}>
            <Input
              autoComplete="name"
              placeholder="Your full name"
              value={f.text("name")}
              onChange={(e) => {
                f.set("name", e.target.value);
              }}
            />
          </FormField>
          <FormField label="Email" required error={f.errors.email}>
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={f.text("email")}
              onChange={(e) => {
                f.set("email", e.target.value);
              }}
            />
          </FormField>
        </div>
        <FormField label="Affiliation" required error={f.errors.affiliation}>
          <Input
            placeholder="Company, institute or independent"
            value={f.text("affiliation")}
            onChange={(e) => {
              f.set("affiliation", e.target.value);
            }}
          />
        </FormField>
      </FormCard>
      <FormCard title="Your pitch">
        <FormField label="Topic" required error={f.errors.topic}>
          <Input
            placeholder="One line: what's the story?"
            value={f.text("topic")}
            onChange={(e) => {
              f.set("topic", e.target.value);
            }}
          />
        </FormField>
        <FormField label="Outline" required error={f.errors.outline}>
          <Textarea
            rows={4}
            showCount
            maxLength={SUBMISSION_LIMITS.pitchOutline}
            placeholder="Three to five points, and why readers should care"
            value={f.text("outline")}
            onChange={(e) => {
              f.set("outline", e.target.value);
            }}
          />
        </FormField>
        <FormField label="Sample of your writing" error={f.errors.sample} helper="A link to something you've written">
          <Input
            type="url"
            placeholder="https://"
            value={f.text("sample")}
            onChange={(e) => {
              f.set("sample", e.target.value);
            }}
          />
        </FormField>
      </FormCard>
      <FormCard title="Conflicts of interest">
        <FormField label="Anything to declare" error={f.errors.conflicts}>
          <Textarea
            rows={3}
            placeholder="Any company, investor or client connected to this topic"
            value={f.text("conflicts")}
            onChange={(e) => {
              f.set("conflicts", e.target.value);
            }}
          />
        </FormField>
        <Checkbox
          label="I have nothing to declare"
          checked={f.v.nothingToDeclare === true}
          onCheckedChange={(on) => {
            f.set("nothingToDeclare", on === true);
          }}
        />
      </FormCard>
      {f.network ? (
        <NetworkError
          onRetry={() => {
            f.submit();
          }}
          cancelHref="/knowledge/insights"
        />
      ) : (
        <Actions pending={f.pending} label="Send pitch" cancel="/knowledge/insights" />
      )}
    </Shell>
  );
}
