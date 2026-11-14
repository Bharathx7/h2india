import { tokens } from "@h2india/ui";
import { ImageResponse } from "next/og";

// The default share image (step 5.10): the wordmark and the platform line on ink, in the brand colours from the
// design tokens. Pages with their own picture (articles with a lead image) set it in their metadata.

export const alt = "H2 India: India's hydrogen ecosystem platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const c = tokens.color;

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: c["bg/inverse"],
        color: c["text/inverse"],
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", fontSize: 84, fontWeight: 700 }}>
        <span>H</span>
        <span style={{ color: c["bg/accent"], fontSize: 52, marginBottom: -6 }}>2</span>
        <span>India</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.15 }}>India&apos;s hydrogen ecosystem platform</div>
        <div style={{ fontSize: 30, color: c["bg/mint"] }}>
          Products and companies, news, schemes, tenders and events in one place
        </div>
      </div>
    </div>,
    size,
  );
}
