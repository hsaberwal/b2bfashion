"use client";

import { LegalPage, type LegalContent } from "@/components/LegalPage";

const DEFAULT_CONTENT: LegalContent = {
  title: "Terms and Conditions",
  subtitle: "Coleridge (UK) Ltd — Terms and Conditions of Trading",
  body: `Placing this order constitutes a binding contract to purchase items listed overleaf.

Orders are accepted by us subject to availability of goods and raw materials.

All prices are Ex-works and excluding VAT.

No order can be cancelled once in production. The buyer is responsible for the value of the order in full.

Coleridge UK Ltd shall retain ownership of the goods until the invoices are paid in full. Goods must not be passed to a third party until paid for in full.

Any shortages or damaged goods must be notified within three days of delivery. No claim will otherwise be accepted.

Any goods delivered and consequently returned for any other reason than being faulty and accepted by us will incur a charge of 25% for admin and restocking.

Many garments supplied are made by hand processes and there may be variation in printing etc. Each garment is unique in many instances, and this shall not be a reason for a return. Unauthorised returns shall be held entirely at the customer's own risk and expense.

For any faulty stock the customer must obtain authority from Coleridge (UK) Ltd before returning any goods. Any goods returned without prior consent or complaints rejected by us will be held at the customer's risk and expense.

Acceptance date of delivery of the goods may not be delayed by the customer except by prior agreement in writing.

Any unauthorised returns shall be held entirely at the customer's own risk and expense.

A claim by the customer shall at no time be grounds for withholding payment of any sum due to us nor shall it give rise to any set-off against payments due to us.

All dealings are subject to the jurisdiction of English law and any dispute shall be heard in a court of law in Birmingham (or a place of our choosing in England) and settled by reference to English law.

No variations whatsoever may be made to the above conditions.`,
};

export default function TermsPage() {
  return (
    <LegalPage
      storageKey="terms"
      defaultContent={DEFAULT_CONTENT}
      adminLabel="Terms and Conditions"
    />
  );
}
