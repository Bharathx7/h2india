import { permanentRedirect } from "next/navigation";

// The home page links the SIGHT snapshot here (step 5.1); the tracker lives under Opportunities (step 5.4, A62).
export default function TrackerSight() {
  permanentRedirect("/opportunities/sight");
}
