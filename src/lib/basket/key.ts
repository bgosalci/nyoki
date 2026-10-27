import { createHash } from "node:crypto";

import type { StoredChoices } from "@/lib/basket/lines";

/**
 * A line's piece and choices as one short value, so the same piece with the
 * same choices is one line - its quantity added to - and the database can
 * hold that with a unique index. Hashed, because printed words can run long.
 * Personalisation is put in field order, so the order things were typed in
 * makes no difference.
 */
export function lineKey(productId: string, stored: StoredChoices): string {
  const personalisation = Object.keys(stored.personalisation)
    .sort()
    .map((id) => [id, stored.personalisation[id]]);

  const canonical = JSON.stringify([
    productId,
    stored.variantId,
    stored.packId,
    stored.message,
    stored.messageText,
    stored.personalise,
    personalisation,
  ]);

  return createHash("sha256").update(canonical).digest("hex");
}
