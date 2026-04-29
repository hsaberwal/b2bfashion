"use client";

import { LegalPage, type LegalContent } from "@/components/LegalPage";

const DEFAULT_CONTENT: LegalContent = {
  title: "Returns Policy",
  subtitle:
    "As a wholesale supplier, returns are handled under strict conditions. Please read this policy carefully before requesting a return.",
  body: `At Coleridge UK Ltd, we aim to ensure that all products meet our quality standards. As a wholesale supplier, returns are handled under strict conditions. Please read this policy carefully before requesting a return.

## 1. Requesting a Return

To initiate a return, you must first contact us by email at cul.admin@coleridgeuk.com. Your request must include your name, order details, the SKU number(s) of the item(s) you wish to return, the reason for the return, and clear supporting images where applicable.

All returns must be authorised by us in advance. We reserve the right to refuse any return that has not been approved prior to being sent back.

## 2. Timeframes for Returns

Any claims for damaged, faulty, or incorrect goods must be reported within 3 days of delivery. Claims made outside of this timeframe may not be accepted.

## 3. Return Conditions

To be eligible for a return:

* Items must be unused and in their original condition
* Items must be returned with original packaging where possible
* Goods must not be altered, worn, or damaged after delivery

Due to the nature of wholesale garments, slight variations in finish or appearance are not considered faults.

## 4. Non-Returnable Items

We do not accept returns for:

* Items that have been used, worn, or altered
* Goods returned without prior authorisation
* Products that are not faulty but no longer required (unless agreed at our discretion)

## 5. Return Process

Once your return request has been approved, we will provide instructions for returning the goods. Depending on the situation, we may arrange a collection, or you may be required to send the goods back to us at your own cost.

Unless the return is due to a fault or error on our part, the customer is responsible for return shipping costs.

## 6. Restocking Fee

Where returns are accepted for reasons other than faults or errors, a 25% restocking and administration fee may be applied.

## 7. Inspection and Refunds

All returned goods will be inspected upon receipt. Once approved, refunds will be processed accordingly. We reserve the right to refuse a refund if the returned goods do not meet the conditions outlined in this policy.

Refunds will be issued via the original payment method where possible.

## 8. Contact Us

If you have any questions regarding returns, please contact us at cul.admin@coleridgeuk.com.

This returns policy forms part of our terms of trading and may be updated from time to time.`,
};

export default function ReturnsPage() {
  return (
    <LegalPage
      storageKey="returns"
      defaultContent={DEFAULT_CONTENT}
      adminLabel="Returns Policy"
    />
  );
}
