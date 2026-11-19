import { redirect } from "next/navigation";

// "I changed my mobile number" was removed with the mobile number (founder, 19 Nov 2026, A195; to come back later).
// Old links return to the Forgot access hub.
export default function ChangedMobilePage() {
  redirect("/forgot-access");
}
