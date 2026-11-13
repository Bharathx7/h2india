import { redirect } from "next/navigation";

// Queues (627:8): opens on the first queue, Suppliers (step 11.2).
export default function QueuesPage() {
  redirect("/admin/queues/suppliers");
}
