// The GSTIN provider behind one interface (playbook step 3.3). The real provider is decision M4.

export type PortalStatus = "Active" | "Inactive" | "Cancelled";

export interface GstinRecord {
  gstin: string;
  legalName: string;
  status: PortalStatus;
  /** City, for example "Pune". */
  city: string;
  address: string;
}

export interface GstinProvider {
  /** The record on the GST portal, or null when the portal has no such GSTIN. */
  lookup(gstin: string, options?: { attempt?: number }): Promise<GstinRecord | null>;
  /** Every GSTIN registered under a PAN. */
  listByPan(pan: string, options?: { attempt?: number }): Promise<GstinRecord[]>;
}

/** The portal or provider did not answer. The person continues and a background job checks later. */
export class GstinProviderUnavailableError extends Error {
  readonly code = "GSTIN_PROVIDER_UNAVAILABLE";
}
