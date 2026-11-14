import { redirect } from "next/navigation";

// "States" in the breadcrumbs (751:7362): the comparison is the overview of every state.
export default function States() {
  redirect("/states/compare");
}
