import { parseServerEnv } from "@h2india/config";
import { renderReportDownload } from "@h2india/emails";
import { deliverEmail } from "./channels";

// The emailed copy of a gated report (step 4.4; "We've also emailed a copy to your work email", 736:833).
// Not drawn (M21, wording A9).

export async function sendReportCopy(input: {
  to: string;
  name: string;
  title: string;
  url: string;
  days: number;
  userId?: string | null;
}): Promise<void> {
  const env = parseServerEnv();
  await deliverEmail({
    template: "email.report_download",
    event: "report.download",
    userId: input.userId ?? null,
    to: input.to,
    mail: await renderReportDownload(env.APP_URL, {
      name: input.name,
      title: input.title,
      url: input.url,
      days: input.days,
    }),
  });
}
