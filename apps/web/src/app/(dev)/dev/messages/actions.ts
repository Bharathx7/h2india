"use server";

import { isEnabled } from "@h2india/config";
import { sendTestMessage } from "@h2india/core/notify";
import type { TemplateId } from "@h2india/core/notify";
import { getSession } from "@/server/auth";

export async function sendTest(template: TemplateId): Promise<string> {
  if (process.env.NODE_ENV !== "development" && !isEnabled("devPages")) return "Not available here";
  const session = await getSession();
  if (!session) return "Sign in first";
  try {
    return `Sent to ${await sendTestMessage(session.user.id, template)}`;
  } catch (error) {
    return error instanceof Error ? error.message : "Couldn't send";
  }
}
