import type { IconName } from "@h2india/ui";

// What a member gets (the For members page, 17 Nov 2026). One list for the For members page and the member sign-up
// page (founder v2, 18 Nov 2026), so both always say the same thing.

export interface MemberBenefit {
  icon: IconName;
  title: string;
  text: string;
}

export const MEMBER_BENEFITS: MemberBenefit[] = [
  {
    icon: "heart",
    title: "Save for later",
    text: "Save products, news, schemes, tenders and jobs, and find them again in one list.",
  },
  {
    icon: "users",
    title: "Follow companies and topics",
    text: "Follow suppliers, companies and topics, and see their updates on your dashboard.",
  },
  {
    icon: "bell",
    title: "Alerts that match you",
    text: "Get an alert when a new tender, scheme, grant or job matches the filters you choose.",
  },
  {
    icon: "building",
    title: "Open the directory",
    text: "Browse companies, people and associations across India's hydrogen ecosystem.",
  },
  {
    icon: "file-text",
    title: "Learn with Hydrogen 101",
    text: "Short chapters and quizzes on how hydrogen is made, stored, moved and used. Your progress is saved.",
  },
  {
    icon: "calendar",
    title: "Events and webinars",
    text: "Register for webinars and keep your events, links and replays together.",
  },
  {
    icon: "clipboard-check",
    title: "Track job applications",
    text: "Keep a list of the jobs you applied to and when they close.",
  },
  {
    icon: "user",
    title: "Your profile, your choice",
    text: "Appear in the people directory only if you turn your profile on. Your email and phone are never shown.",
  },
];

/** The three steps to join (For members · How it works). */
export const MEMBER_JOIN_STEPS = [
  { title: "Join as a member", text: "Your name, what you do and your email." },
  { title: "Confirm your email", text: "Open the link we email you. No password to remember." },
  { title: "Start", text: "Save, follow and set your alerts from your member dashboard." },
];
