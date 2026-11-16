import type { NoticeProps } from "../notice";

// Knowledge messages (step 4.4). Not drawn (M21, wording A9): the copy of a gated report, in the words of
// "Your report is ready" (736:833).

type Message = Omit<NoticeProps, "appUrl"> & { subject: string };

export function reportDownloadMessage(input: { name: string; title: string; url: string; days: number }): Message {
  return {
    subject: `Your report: ${input.title}`,
    preview: "Here's the copy you asked for.",
    reason: "You're getting this because you downloaded this report on H2 Economy.",
    eyebrow: "Reports",
    headline: "Your report is ready",
    paragraphs: [
      `Hi ${input.name || "there"}, here's your copy of ${input.title}.`,
      `The link works for ${String(input.days)} days. After that, download it again from the report page.`,
    ],
    button: { label: "Download the PDF", href: input.url },
  };
}
