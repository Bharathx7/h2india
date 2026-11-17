"use server";

import { addBankAccount, BankError, cancelBankChange, confirmBankAccount } from "@h2india/core/supplier";
import { revalidatePath } from "next/cache";
import { requestContext } from "@/server/request-context";
import { supplierActor } from "./actor";

// Payout bank account (step 8.6). Core checks payout_bank.change, the Confirm it's you step-up and writes the audit log.

type Result = { ok: true } | { ok: false; error: string };

async function run(work: () => Promise<unknown>): Promise<Result> {
  try {
    await work();
  } catch (error) {
    if (error instanceof BankError) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath("/supplier/bank");
  revalidatePath("/supplier");
  return { ok: true };
}

export async function addBankAccountAction(input: {
  holderName: string;
  accountNumber: string;
  confirmNumber: string;
  ifsc: string;
}) {
  const { db, actor, supplier } = await supplierActor();
  const context = await requestContext();
  return run(() => addBankAccount(db, actor, supplier.organisationId, { ...input, context }));
}

export async function confirmBankAccountAction(id: string) {
  const { db, actor, supplier } = await supplierActor();
  const context = await requestContext();
  return run(() => confirmBankAccount(db, actor, supplier.organisationId, { id, context }));
}

export async function cancelBankChangeAction(id: string) {
  const { db, actor, supplier } = await supplierActor();
  const context = await requestContext();
  return run(() => cancelBankChange(db, actor, supplier.organisationId, { id, context }));
}
