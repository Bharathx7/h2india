"use client";

import { Alert, Button, FormField, Input, Modal, Textarea } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changeCompanyGstinAction } from "./actions";

/**
 * Change a company's GSTIN (founder QC, 17 Nov 2026, A189): only H2 Economy can change a verified one, with a reason
 * that goes in the audit log. The old GSTIN is retired, so quotes and orders issued under it keep showing it.
 */
export function ChangeGstin({ organisationId, current }: { organisationId: string; current: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [gstin, setGstin] = useState("");
  const [place, setPlace] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        Change GSTIN
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title="Change this company's GSTIN"
        description={
          current
            ? `${current} is retired and kept on old quotes and orders. The new GSTIN is checked with GST records.`
            : "The new GSTIN is checked with GST records."
        }
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() => {
                start(async () => {
                  const r = await changeCompanyGstinAction(organisationId, gstin, place, reason);
                  if (!r.ok) {
                    setError(r.error);
                    return;
                  }
                  setError("");
                  setOpen(false);
                  router.refresh();
                });
              }}
            >
              Change GSTIN
            </Button>
          </div>
        }
      >
        {error ? <Alert tone="error" title={error} live /> : null}
        <FormField label="New GSTIN">
          <Input
            value={gstin}
            onChange={(e) => {
              setGstin(e.target.value.toUpperCase());
            }}
          />
        </FormField>
        <FormField label="Place of business" helper="Optional">
          <Input
            value={place}
            onChange={(e) => {
              setPlace(e.target.value);
            }}
          />
        </FormField>
        <FormField label="Reason" helper="Goes in the audit log, for example the company's written request.">
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
            }}
          />
        </FormField>
      </Modal>
    </>
  );
}
