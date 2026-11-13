import { redirect } from "next/navigation";

// Queues (629:367). Listings arrive in step 8.3; Suppliers, RFQs, Content, Events, Jobs and Comments in step 11.2.
export default function QueuesPage() {
  redirect("/admin/queues/listings");
}
