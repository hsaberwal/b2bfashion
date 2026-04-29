"use client";

import { LegalPage, type LegalContent } from "@/components/LegalPage";

const DEFAULT_CONTENT: LegalContent = {
  title: "Privacy Policy",
  subtitle:
    "Coleridge UK Ltd respects your privacy and is committed to protecting your personal data.",
  body: `This privacy policy explains how we collect, use, and protect your information when you use our wholesale website.

## 1. Who We Are

Coleridge UK Ltd
32–34 Sampson Road North
Birmingham, B11 1BL
Email: cul.admin@coleridgeuk.com

We operate as the data controller for all personal data collected through our website and business operations, meaning we are responsible for how your personal data is used and protected.

## 2. What Personal Data We Collect

We may collect and process a range of personal data in order to operate our wholesale business effectively. This includes your name, email address, phone number, billing and shipping addresses, and details relating to your order history. We also collect certain technical information when you use our website, such as usage data gathered through cookies and analytics tools.

## 3. How We Collect Your Data

We collect personal data through a variety of channels depending on how you interact with us. This includes information you provide via website forms such as contact or order forms, during the checkout process, and when placing orders by email or telephone. We also collect data automatically through cookies and similar technologies when you browse our website.

## 4. How We Use Your Data

We use your personal data to manage and support our business operations. This includes processing and fulfilling your orders, providing customer service and support, and sending you updates relating to your orders. Where you have given consent, we may also use your data to send marketing communications. In addition, we use collected data to improve our website, products, and overall customer experience.

## 5. Legal Basis for Processing

Under UK GDPR, we rely on the following legal bases:

* Contractual necessity – to process and deliver your orders
* Legitimate interests – to improve our services and customer experience
* Consent – for marketing communications (where applicable)

## 6. Sharing Your Data

We may share your personal data with trusted third-party service providers where necessary to run our business. This includes payment processors, delivery providers such as Royal Mail and courier services, website platforms, and professional service providers such as accountants or business software providers. These third parties are only permitted to process your data in accordance with our instructions and applicable data protection laws.

## 7. International Transfers

Some of our service providers may process data outside the UK. Where this happens, we ensure appropriate safeguards are in place to protect your data in accordance with UK GDPR requirements.

## 8. Data Retention

We retain your personal data only as long as necessary to fulfil the purposes we collected it for, including satisfying legal, accounting, or reporting requirements.

## 9. Your Rights

Under UK data protection law, you have several rights in relation to your personal data. These include the right to access the personal data we hold about you, to request correction of inaccurate or incomplete data, and to request deletion of your data where appropriate. You also have the right to object to or restrict certain types of processing and to withdraw consent for marketing at any time. To exercise any of these rights, please contact us at cul.admin@coleridgeuk.com.

## 10. Cookies

We use cookies and similar technologies to ensure the website functions properly, to analyse website traffic, and to improve user experience. Where required, you will be asked to consent to non-essential cookies when visiting our website. You can also control or disable cookies through your browser settings.

## 11. Data Security

We implement appropriate technical and organisational security measures, including secure servers, access controls, and internal data protection procedures, to safeguard personal data against unauthorised access, loss, or misuse.

## 12. Marketing Communications

We may send you marketing emails if you have opted in to receive them. You can unsubscribe at any time by clicking the unsubscribe link in our emails or contacting us directly.

## 13. Website Hosting and Technical Data

Our website is hosted on our own servers. As part of operating the website, certain technical data such as IP addresses, browser type, and access times may be collected and stored in server logs for security, monitoring, and maintenance purposes.

## 14. Changes to This Policy

We may update this privacy policy from time to time. Any changes will be posted on this page with an updated effective date.

## 15. Contact Us

If you have any questions about this privacy policy or how we handle your data, please contact:

Coleridge UK Ltd
Email: cul.admin@coleridgeuk.com

We process personal data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018. This privacy policy is designed to comply with UK GDPR and applicable data protection laws.`,
};

export default function PrivacyPage() {
  return (
    <LegalPage
      storageKey="privacy"
      defaultContent={DEFAULT_CONTENT}
      adminLabel="Privacy Policy"
    />
  );
}
