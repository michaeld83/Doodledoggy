/**
 * Apply provider status updates to Contract / Reservation rows.
 * Provider document id is stored in the existing `docusignEnvelopeId` column
 * (no schema change). Contract.templateFieldsJson carries `provider`.
 */

import { prisma } from "@/lib/prisma";
import { contractStatusFromSignWell } from "@/lib/esign/signwell";

export async function applySignWellStatus(
  documentId: string,
  statusOrEvent: string
): Promise<{ contracts: number; reservations: number; contractStatus: string | null }> {
  const docStatus = statusOrEvent.toLowerCase().replace(/^document_/, "");
  const contractStatus = contractStatusFromSignWell(statusOrEvent);

  const contracts = await prisma.contract.findMany({
    where: { docusignEnvelopeId: documentId },
    select: { id: true, status: true },
  });
  for (const c of contracts) {
    let next: string | undefined;
    if (contractStatus === "SIGNED" || contractStatus === "CANCELLED") next = contractStatus;
    else if (contractStatus === "SENT" && c.status === "DRAFT") next = "SENT";
    // Never downgrade a signed contract
    if (c.status === "SIGNED") next = undefined;
    await prisma.contract.update({
      where: { id: c.id },
      data: { docusignStatus: docStatus, ...(next ? { status: next } : {}) },
    });
  }
  const res = await prisma.reservation.updateMany({
    where: { docusignEnvelopeId: documentId },
    data: { docusignStatus: docStatus },
  });
  return { contracts: contracts.length, reservations: res.count, contractStatus };
}
