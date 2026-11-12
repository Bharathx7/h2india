"use client";

// Replaces Payload's Publish button (step 4.2): articles are published from the Workflow panel, which keeps the review,
// legal check and schedule. Drafts still save automatically.
export function WorkflowPublish() {
  return <span style={{ fontSize: 13, opacity: 0.75 }}>Publish from the Workflow panel</span>;
}
