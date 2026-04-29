"use client";

import { LegalPage, type LegalContent } from "@/components/LegalPage";

const DEFAULT_CONTENT: LegalContent = {
  title: "Shipping Information",
  subtitle:
    "How stock orders, forward orders, delivery requests, and combined shipments are handled at Coleridge UK Ltd.",
  body: `At Coleridge UK Ltd, we aim to dispatch orders as quickly and efficiently as possible. Please read the information below to understand how stock orders, forward orders, delivery requests, and combined shipments are handled.

## Stock Items

Where stock is available, stock items will usually be dispatched within one working day of the order being placed. This is subject to stock availability at the time the order is processed.

All stock deliveries are sent using our DPD courier service. Orders are sent on a tracked next-day delivery service, providing a 24-hour tracked delivery option once the parcel has been dispatched.

## Multiple Orders

If you place multiple orders, we may be able to send them together in one delivery. This can only be done if the first order has not already been dispatched. Once an order has been dispatched, it cannot be combined with another order.

## Forward Orders

Forward orders will be shipped once the relevant stock has arrived with us. We will dispatch these orders as soon as the stock becomes available, unless a specific delivery date has been requested.

## Requested Delivery Dates

Customers may request a specific delivery date for their order. To do this, please add a note to your order at checkout stating the preferred delivery date. Where possible, we will arrange dispatch so that your order is sent out for delivery on the requested date.

## Delivery Summary

Stock items are normally dispatched within one working day, subject to availability. Deliveries are sent via DPD using a tracked next-day delivery service. Forward orders are dispatched once stock is received, and requested delivery dates can be added as a note at checkout.

## Questions

If you have any questions about shipping or delivery, please contact us at cul.admin@coleridgeuk.com.`,
};

export default function ShippingPage() {
  return (
    <LegalPage
      storageKey="shipping"
      defaultContent={DEFAULT_CONTENT}
      adminLabel="Shipping Policy"
    />
  );
}
