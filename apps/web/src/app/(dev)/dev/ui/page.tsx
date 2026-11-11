import {
  Alert,
  ArrowLink,
  CategoryChip,
  Checkbox,
  CountChip,
  EmptyState,
  FormField,
  Input,
  Radio,
  RadioGroup,
  Select,
  Skeleton,
  StatusBadge,
  STATUS_TONE,
  Switch,
  Textarea,
  VerifiedBadge,
  BackToTop,
  Button,
  Icon,
  ICON_NAMES,
  IconButton,
  LanguageSelector,
  TextLink,
  type ButtonSize,
  type ButtonVariant,
} from "@h2india/ui";
import { forcedState } from "@/lib/dev-state";
import { AsyncDemo, FilterChipsDemo, OtpDemo } from "./Demos";
import { NavigationDemo, OverlayHintsDemo, UploadDemo } from "./Demos2";
import { GallerySection, Row } from "./Section";

// Component gallery (playbook steps 2.3 and 2.6). One section per Figma component section on page 02 (node 8:3).
// Hover, pressed and focus are real states: hover or tab through the page to see them.

const VARIANTS: ButtonVariant[] = ["primary", "secondary", "outline", "ghost", "inverse", "destructive"];
const SIZES: ButtonSize[] = ["sm", "md", "lg"];
const SIZE_NAME = { sm: "Small", md: "Medium", lg: "Large" } as const;

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const forced = forcedState((await searchParams).state);
  return (
    <main className="mx-auto max-w-[1312px] px-6 py-16">
      <p className="type-eyebrow text-secondary">Developer · steps 2.3 to 2.6</p>
      <h1 className="type-h1 mt-2">Component gallery</h1>
      <p className="type-body-lg mt-2 max-w-3xl">
        Rebuilt from Figma page 02 Components. Each section names the Figma component set it reproduces. Compare at 1440
        and 390.
      </p>
      <nav aria-label="Gallery sections" className="mt-6 flex flex-wrap gap-4">
        <TextLink href="#icons" showIcon={false}>
          Icons
        </TextLink>
        <TextLink href="#buttons" showIcon={false}>
          Buttons and links
        </TextLink>
        <TextLink href="#forms" showIcon={false}>
          Form controls
        </TextLink>
        <TextLink href="#selection" showIcon={false}>
          Selection
        </TextLink>
        <TextLink href="#feedback" showIcon={false}>
          Feedback and status
        </TextLink>
        <TextLink href="#navigation" showIcon={false}>
          Navigation
        </TextLink>
        <TextLink href="#states" showIcon={false}>
          Required states
        </TextLink>
      </nav>

      <GallerySection id="icons" title="Icons" node="section Icons, 61 components">
        <ul className="grid grid-cols-3 gap-4 sm:grid-cols-6 lg:grid-cols-10">
          {ICON_NAMES.map((name) => (
            <li
              key={name}
              className="flex flex-col items-center gap-2 rounded-control border border-default p-3 text-icon-primary"
            >
              <Icon name={name} />
              <span className="type-caption text-secondary">{name}</span>
            </li>
          ))}
        </ul>
      </GallerySection>

      <GallerySection
        id="buttons"
        title="Buttons and links v2"
        node="150:608 · 151:96 · 151:22 · 12:308 · 151:117 · 151:135"
      >
        {VARIANTS.map((variant) => (
          <Row key={variant} label={`Button v2 · ${variant}`} surface={variant === "inverse" ? "inverse" : undefined}>
            {SIZES.map((size) => (
              <Button key={size} variant={variant} size={size}>
                Request a quote
              </Button>
            ))}
            <Button variant={variant} size="md" leadingIcon="plus">
              Add product
            </Button>
            <Button variant={variant} size="md" arrow>
              See suppliers
            </Button>
            <Button variant={variant} size="md" disabled>
              Disabled
            </Button>
          </Row>
        ))}
        <Row label="Button as a link">
          <Button asChild variant="primary" arrow>
            <a href="#buttons">Browse the marketplace</a>
          </Button>
        </Row>
        <Row label="Icon button v2 · solid and outline">
          {SIZES.map((size) => (
            <IconButton key={`s-${size}`} icon="arrow-right" label={`Next (${SIZE_NAME[size]})`} size={size} />
          ))}
          {SIZES.map((size) => (
            <IconButton
              key={`o-${size}`}
              icon="arrow-right"
              label={`Next, outline (${SIZE_NAME[size]})`}
              size={size}
              look="outline"
            />
          ))}
        </Row>
        <Row label="Link and arrow link">
          <TextLink href="#buttons">View all products</TextLink>
          <TextLink href="#buttons" showIcon={false}>
            Terms of use
          </TextLink>
          <ArrowLink href="#buttons">See all categories</ArrowLink>
        </Row>
        <Row label="Back to top and language selector">
          <BackToTop />
          <LanguageSelector />
        </Row>
      </GallerySection>
      <GallerySection id="forms" title="Form controls" node="14:73 · 14:90 · 14:103 · 14:132">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          <FormField label="Company GSTIN" required helper="Printed on your GST invoice.">
            <Input placeholder="Placeholder" />
          </FormField>
          <FormField label="Company GSTIN" required error="Enter a 15-character GSTIN, for example 29ABCDE1234F1Z5.">
            <Input defaultValue="29ABCDE1234" />
          </FormField>
          <FormField label="Search equipment">
            <Input leadingIcon="search" placeholder="Electrolysers, compressors, sensors" type="search" />
          </FormField>
          <FormField label="Budget">
            <Input prefix="₹" inputMode="numeric" defaultValue="48,79,400" />
          </FormField>
          <FormField label="Rated power">
            <Input suffix="kW" inputMode="decimal" placeholder="1000" />
          </FormField>
          <FormField label="Mobile number">
            <Input prefix="+91" type="tel" autoComplete="tel-national" placeholder="98765 43210" />
          </FormField>
          <FormField label="Category">
            <Select placeholder="Select a category" defaultValue="">
              <option value="pem">PEM electrolysers</option>
              <option value="alk">Alkaline electrolysers</option>
              <option value="comp">Hydrogen compression systems</option>
            </Select>
          </FormField>
          <FormField label="Category" error="Choose a category.">
            <Select placeholder="Select a category" defaultValue="">
              <option value="pem">PEM electrolysers</option>
            </Select>
          </FormField>
          <FormField label="Disabled">
            <Input placeholder="Placeholder" disabled />
          </FormField>
          <FormField label="Requirements" helper="Describe the configuration you need.">
            <Textarea maxLength={1000} showCount placeholder="Describe the configuration you need" />
          </FormField>
          <FormField label="Requirements" error="Tell suppliers what you need.">
            <Textarea maxLength={1000} showCount />
          </FormField>
          <FormField label="Disabled">
            <Textarea disabled placeholder="Describe the configuration you need" />
          </FormField>
        </div>
      </GallerySection>

      <GallerySection
        id="selection"
        title="Selection and upload"
        node="18:69 · 18:91 · 18:108 · 18:142 · 18:164 · 18:215"
      >
        <Row label="Checkbox">
          <Checkbox label="ISO 22734 certified" />
          <Checkbox label="ISO 22734 certified" defaultChecked />
          <Checkbox label="Select all rows" checked="indeterminate" />
          <Checkbox label="ISO 22734 certified" disabled />
          <Checkbox label="ISO 22734 certified" disabled defaultChecked />
        </Row>
        <Row label="Radio">
          <RadioGroup defaultValue="online" aria-label="Payment method" className="flex-row gap-6">
            <Radio value="online" label="Pay online" />
            <Radio value="po" label="Purchase order" />
            <Radio value="credit" label="Pay later" disabled />
          </RadioGroup>
        </Row>
        <Row label="Switch">
          <Switch label="Email me when a quote arrives" defaultChecked />
          <Switch label="WhatsApp me when a quote arrives" />
          <Switch label="Disabled" disabled />
        </Row>
        <OtpDemo />
        <UploadDemo />
      </GallerySection>

      <GallerySection
        id="feedback"
        title="Feedback and status"
        node="20:96 · 20:115 · 20:127 · 20:136 · 20:150 · 20:245 · 20:281 · 20:338"
      >
        <Row label="Status badge · every status word in the database">
          {Object.keys(STATUS_TONE).map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </Row>
        <Row label="Verified badge">
          <VerifiedBadge kind="supplier" />
          <VerifiedBadge kind="gst" />
          <VerifiedBadge kind="certificate" />
        </Row>
        <Row label="Chip · category, filter, count">
          <CategoryChip>PEM electrolysers</CategoryChip>
          <CategoryChip selected>PEM electrolysers</CategoryChip>
          <CategoryChip touch>Pressure: 30–350 bar</CategoryChip>
          <FilterChipsDemo />
          <CountChip>12</CountChip>
        </Row>
        <div className="flex flex-col gap-4">
          <Alert
            tone="info"
            title="Verification takes up to 2 working days"
            action={
              <TextLink href="#feedback" showIcon={false}>
                Learn more
              </TextLink>
            }
          >
            You can add products while we review your documents.
          </Alert>
          <Alert
            tone="success"
            title="Quote request sent to 3 suppliers"
            action={
              <TextLink href="#feedback" showIcon={false}>
                View request
              </TextLink>
            }
          >
            Quotes are due by 12 Nov 2026. We will email you as each one arrives.
          </Alert>
          <Alert
            tone="warning"
            title="Changes requested on your application"
            action={
              <TextLink href="#feedback" showIcon={false}>
                Open verification
              </TextLink>
            }
          >
            Upload a clearer copy of your GST certificate.
          </Alert>
          <Alert
            tone="error"
            title="Payment not completed"
            action={
              <TextLink href="#feedback" showIcon={false}>
                Try again
              </TextLink>
            }
          >
            Your bank declined the payment. Try again or choose another method.
          </Alert>
          <Alert
            tone="warning"
            layout="banner"
            title="Changes requested on your application"
            action={
              <TextLink href="#feedback" showIcon={false}>
                Open verification
              </TextLink>
            }
          >
            Upload a clearer copy of your GST certificate.
          </Alert>
        </div>
        <Row label="Skeleton · text, table row, card">
          <Skeleton className="w-80" />
          <Skeleton kind="table-row" className="w-140" />
          <Skeleton kind="card" className="w-70" />
        </Row>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <EmptyState kind="first-use" title="No products yet" action={<Button>Add a product</Button>}>
            Add your first product so buyers can find you in the marketplace.
          </EmptyState>
          <EmptyState
            kind="no-results"
            title="No equipment matches these filters"
            action={<Button>Request a quote</Button>}
          >
            Try removing a filter, or ask suppliers for a quote on your specification.
          </EmptyState>
          <EmptyState kind="error" title="Something went wrong" action={<Button variant="outline">Try again</Button>}>
            We could not load this page. Check your connection and try again.
          </EmptyState>
        </div>
        <OverlayHintsDemo />
      </GallerySection>

      <GallerySection
        id="navigation"
        title="Navigation"
        node="21:161 · 21:186 · 21:212 · 21:224 · 21:285 · 21:314 · 21:372 · 21:431 · 21:444"
      >
        <NavigationDemo />
      </GallerySection>

      <GallerySection id="states" title="Required states" node="step 2.5 · state boards 381:12972, 381:13116, 127:6804">
        <p className="type-body-sm text-body">
          Every data section uses AsyncSection. In development, add ?state=loading, ?state=empty or ?state=error to the
          address to force a state.
        </p>
        <AsyncDemo forced={forced} />
      </GallerySection>
    </main>
  );
}
