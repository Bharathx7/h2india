"use client";

import {
  EXPERIENCE,
  JOB_FUNCTIONS,
  JOB_POST_LIMITS,
  JOB_TYPES,
  latestClosingDay,
  salaryLabel,
  WORK_MODES,
  type JobPostErrors,
  type JobPostInput,
} from "@h2india/core/opportunities/rules";
import {
  Alert,
  Button,
  DatePicker,
  FormField,
  Icon,
  Input,
  JobCard,
  Radio,
  RadioGroup,
  Select,
  Switch,
  Textarea,
  VerifiedBadge,
} from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { saveJob } from "./actions";

// Post a job (467:7472, step 5.5). The server checks everything again (checkJobPost); this form shows the same
// messages next to each field. "How it will look" is the job card as it will appear in the list. Featured jobs are an
// editors' choice (A69), so the form has no Featured option.

export interface PosterCompany {
  organisationId: string;
  name: string;
  initials: string;
  verified: boolean;
}

type Values = JobPostInput & { id: number | null; organisationId: string };

const isoDay = (d: Date) =>
  `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromIso = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : undefined);
const shortDay = (s: string) => fromIso(s)?.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) ?? "";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-card border border-default bg-page p-5">
      <legend className="float-left type-h4 text-primary">{title}</legend>
      {children}
    </fieldset>
  );
}

export function JobPostForm({ initial, companies }: { initial: Values; companies: PosterCompany[] }) {
  const router = useRouter();
  const [v, setV] = useState<Values>(initial);
  const [errors, setErrors] = useState<JobPostErrors>({});
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [skill, setSkill] = useState("");
  const [pending, start] = useTransition();
  const company = companies.find((c) => c.organisationId === v.organisationId) ?? companies[0];
  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setV((x) => ({ ...x, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const addSkill = () => {
    const s = skill.trim();
    if (!s) return;
    if (v.skills.length >= JOB_POST_LIMITS.skillsMax) {
      setErrors((e) => ({ ...e, skills: `Add up to ${String(JOB_POST_LIMITS.skillsMax)} skills` }));
      return;
    }
    if (!v.skills.includes(s)) set("skills", [...v.skills, s]);
    setSkill("");
  };

  const send = (intent: "draft" | "preview" | "submit") => {
    setMessage(null);
    start(async () => {
      const r = await saveJob(v, intent);
      if (!r.ok) {
        setErrors(r.errors);
        setMessage({
          tone: "error",
          text: r.message ?? "Some details need changing. Check the fields marked below.",
        });
        return;
      }
      setErrors({});
      if (intent === "preview") router.push(`/opportunities/jobs/post/preview?id=${String(r.id)}`);
      else if (intent === "submit") router.push(`/opportunities/jobs/post/submitted?id=${String(r.id)}`);
      else {
        setV((x) => ({ ...x, id: r.id }));
        router.replace(`/opportunities/jobs/post?id=${String(r.id)}`, { scroll: false });
        setMessage({ tone: "success", text: "Draft saved. Only people in your company can see it." });
      }
    });
  };

  const preview = {
    company: company?.name ?? "",
    initials: company?.initials ?? "",
    role: v.role.trim() || "Job title",
    where: [v.location.trim() || "City", v.workMode].filter(Boolean).join(" · "),
    chips: [
      v.experience,
      v.showSalary && v.salaryFrom
        ? salaryLabel(v.salaryTo && v.salaryTo !== v.salaryFrom ? `${v.salaryFrom}–${v.salaryTo}` : v.salaryFrom)
        : null,
    ].filter((x): x is string => Boolean(x)),
    dates: v.closesOn ? `Closes ${shortDay(v.closesOn)}` : "Closing date not set",
  };

  return (
    <form
      className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        send("submit");
      }}
      noValidate
    >
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {message ? <Alert live tone={message.tone} title={message.text} /> : null}
        <Card title="Role">
          <FormField label="Job title" required error={errors.role}>
            <Input
              value={v.role}
              maxLength={JOB_POST_LIMITS.roleMax}
              onChange={(e) => {
                set("role", e.target.value);
              }}
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Function" required error={errors.function}>
              <Select
                value={v.function}
                onChange={(e) => {
                  set("function", e.target.value);
                }}
              >
                <option value="">Choose</option>
                {JOB_FUNCTIONS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Job type" required error={errors.jobType}>
              <Select
                value={v.jobType}
                onChange={(e) => {
                  set("jobType", e.target.value);
                }}
              >
                {JOB_TYPES.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Experience" required error={errors.experience}>
              <Select
                value={v.experience}
                onChange={(e) => {
                  set("experience", e.target.value);
                }}
              >
                <option value="">Choose</option>
                {EXPERIENCE.map((x) => (
                  <option key={x.value}>{x.value}</option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField label="Description" required error={errors.description}>
            <Textarea
              rows={5}
              showCount
              maxLength={JOB_POST_LIMITS.descriptionMax}
              value={v.description}
              onChange={(e) => {
                set("description", e.target.value);
              }}
            />
          </FormField>
          <FormField label={`Skills (up to ${String(JOB_POST_LIMITS.skillsMax)})`} error={errors.skills}>
            <Input
              value={skill}
              maxLength={JOB_POST_LIMITS.skillMax}
              placeholder="Add a skill"
              onChange={(e) => {
                setSkill(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              onBlur={addSkill}
            />
          </FormField>
          {v.skills.length ? (
            <ul className="-mt-2 flex flex-wrap gap-2" aria-label="Skills">
              {v.skills.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => {
                      set(
                        "skills",
                        v.skills.filter((x) => x !== s),
                      );
                    }}
                    className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-inverse px-3 type-label text-inverse"
                  >
                    {s}
                    <Icon name="x" size={14} />
                    <span className="sr-only">: remove</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        <Card title="Location">
          <FormField label="City" required error={errors.location}>
            <Input
              value={v.location}
              placeholder="For example Ratnagiri, Maharashtra"
              onChange={(e) => {
                set("location", e.target.value);
              }}
            />
          </FormField>
          <div className="flex flex-col gap-2">
            <p id="mode-label" className="type-label text-primary">
              Work mode <span className="text-error">*</span>
            </p>
            <RadioGroup
              aria-labelledby="mode-label"
              value={v.workMode}
              onValueChange={(x) => {
                set("workMode", x);
              }}
              className="flex flex-wrap gap-6"
            >
              {WORK_MODES.map((m) => (
                <Radio key={m} value={m} label={m} />
              ))}
            </RadioGroup>
          </div>
        </Card>

        <Card title="Salary">
          <Switch
            label="Show a salary band"
            checked={v.showSalary}
            onCheckedChange={(on) => {
              set("showSalary", on);
            }}
          />
          {v.showSalary ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="From" error={errors.salaryFrom}>
                <Input
                  inputMode="decimal"
                  suffix="lakh a year"
                  value={v.salaryFrom}
                  onChange={(e) => {
                    set("salaryFrom", e.target.value);
                  }}
                />
              </FormField>
              <FormField label="To" error={errors.salaryTo}>
                <Input
                  inputMode="decimal"
                  suffix="lakh a year"
                  value={v.salaryTo}
                  onChange={(e) => {
                    set("salaryTo", e.target.value);
                  }}
                />
              </FormField>
            </div>
          ) : null}
          <p className="type-caption text-secondary">Optional. Jobs with a salary band get more applications.</p>
        </Card>

        <Card title="How to apply">
          <RadioGroup
            aria-label="How to apply"
            value={v.applyBy}
            onValueChange={(x) => {
              set("applyBy", x);
            }}
          >
            <Radio value="link" label="Link to our careers page" />
            <Radio value="inbox" label="Receive applications in my H2 India inbox" disabled />
          </RadioGroup>
          <p className="-mt-2 type-caption text-secondary">
            Applications in your H2 India inbox arrive with the supplier inbox.
          </p>
          <FormField label="Careers page link" required error={errors.careersUrl ?? errors.applyBy}>
            <Input
              type="url"
              value={v.careersUrl}
              placeholder="https://"
              onChange={(e) => {
                set("careersUrl", e.target.value);
              }}
            />
          </FormField>
          <FormField
            label="Closing date"
            required
            error={errors.closesOn}
            helper={`Up to ${String(JOB_POST_LIMITS.closingMaxDays)} days from today`}
          >
            <DatePicker
              value={fromIso(v.closesOn)}
              onChange={(d) => {
                const day = d ? isoDay(d) : "";
                set("closesOn", day && day > latestClosingDay() ? latestClosingDay() : day);
              }}
            />
          </FormField>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              send("draft");
            }}
          >
            Save draft
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              send("preview");
            }}
          >
            Preview
          </Button>
          <Button type="submit" disabled={pending}>
            Submit for review
          </Button>
        </div>
      </div>

      <aside className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
        <section aria-label="Posting as" className="flex flex-col gap-3 rounded-card border border-default bg-page p-4">
          <p className="type-eyebrow text-secondary">POSTING AS</p>
          {companies.length > 1 ? (
            <label>
              <span className="sr-only">Company</span>
              <Select
                value={v.organisationId}
                onChange={(e) => {
                  set("organisationId", e.target.value);
                }}
              >
                {companies.map((c) => (
                  <option key={c.organisationId} value={c.organisationId}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          {company ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-pill bg-mint type-label-sm text-primary">
                {company.initials}
              </span>
              <span className="type-label text-primary">{company.name}</span>
              {company.verified ? <VerifiedBadge kind="supplier" /> : null}
            </div>
          ) : null}
        </section>
        <p className="type-label-sm text-secondary">How it will look</p>
        <div inert className="pointer-events-none">
          <JobCard {...preview} href="#" />
        </div>
      </aside>
    </form>
  );
}
