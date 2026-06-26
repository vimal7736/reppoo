import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | GreenTrack AI",
  description: "How GreenTrack AI collects, uses, and protects your data under UK GDPR.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy | GreenTrack AI",
    description: "How GreenTrack AI collects, uses, and protects your data under UK GDPR.",
    url: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-6 prose prose-sm md:prose-base dark:prose-invert prose-gray">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Effective Date: 1 June 2026 | Last Updated: 3 June 2026
      </p>

      <p className="lead dark:text-gray-200">
        GreenTrack AI Ltd (“we”, “us”, or “our”) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your personal data when you use our Service.
      </p>

      <div className="space-y-8 mt-8 dark:text-gray-300">
        <section>
          <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">2.1 Who We Are</h2>
          <p>
            GreenTrack AI Ltd is a company registered in Scotland, United Kingdom. We operate the GreenTrack AI platform — a SaaS tool that helps UK SMEs calculate and report carbon emissions from utility bills.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">2.2 Data We Collect</h2>
          
          <h3 className="font-semibold text-gray-800 dark:text-white mt-4">Account & Profile Data</h3>
          <ul className="list-disc pl-5">
            <li>Email address, full name, organisation details (name, logo), user roles (Owner, Admin, Member)</li>
          </ul>

          <h3 className="font-semibold text-gray-800 dark:text-white mt-4">Financial & Billing Data</h3>
          <ul className="list-disc pl-5">
            <li>Stripe Customer ID and subscription status (we do not store raw credit card details — all payments are handled securely by Stripe)</li>
          </ul>

          <h3 className="font-semibold text-gray-800 dark:text-white mt-4">Environmental & Utility Data (Core Data)</h3>
          <ul className="list-disc pl-5">
            <li>Uploaded utility bills (PDFs/images) stored in Supabase Storage</li>
            <li>Extracted data via Mindee OCR: supplier names, account numbers, bill dates, usage (kWh, litres, etc.), costs</li>
            <li>Calculated carbon emissions (kg CO₂e) using official DEFRA factors</li>
          </ul>

          <h3 className="font-semibold text-gray-800 dark:text-white mt-4">Technical & Analytics Data</h3>
          <ul className="list-disc pl-5">
            <li>IP addresses (for rate limiting via Upstash), device/browser information via Vercel Analytics, authentication tokens via Supabase</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">2.3 Third-Party Data Processors</h2>
          <p>
            We use the following trusted processors. All are GDPR-compliant and, where possible, use UK/EU data centres:
          </p>
          <div className="overflow-x-auto mt-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Processor</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Purpose</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Data Location</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">Supabase</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">Database, Authentication, File Storage</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">London, UK (eu-west-2)</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">Mindee</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">OCR / Document Parsing of utility bills</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">EU (GDPR compliant)</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">Stripe</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">Payments, Subscriptions, Billing</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">Global (PCI-DSS compliant)</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">Resend / Zoho SMTP</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">Transactional Emails</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">EU / UK</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">Vercel Analytics</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">Website Analytics</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">Global (anonymised)</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">Upstash (Redis)</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">API Rate Limiting</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">EU</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm">
            We have Data Processing Agreements (DPAs) in place with all processors. Mindee and Supabase are our primary processors for sensitive utility bill data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">2.4 How We Use Your Data</h2>
          <ul className="list-disc pl-5">
            <li>To provide and improve the Service (OCR processing, carbon calculations, dashboards, reports)</li>
            <li>To manage your account, subscriptions, and team access</li>
            <li>To send important service emails (invitations, billing, security alerts)</li>
            <li>To comply with legal obligations and prevent fraud</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">2.5 Data Retention</h2>
          <p>
            We retain your data for as long as your account is active or as needed to provide the Service. Upon cancellation:
          </p>
          <ul className="list-disc pl-5">
            <li><strong>Uploaded bills and extracted data:</strong> Deleted or anonymised within 30 days of account closure (unless required for legal/tax reasons)</li>
            <li><strong>Billing records:</strong> Retained for 7 years in line with UK tax law</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">2.6 Your Rights (UK GDPR)</h2>
          <p>
            You have the right to access, rectify, erase, restrict processing, data portability, and object to processing. To exercise these rights, email <a href="mailto:suhail@greentrackai.com" className="text-green-600 dark:text-green-400 hover:underline">suhail@greentrackai.com</a>. We will respond within one month.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">2.7 Security</h2>
          <p>
            We use industry-standard security measures including Row Level Security (RLS) in Supabase, edge middleware authentication, encrypted connections (TLS), and regular security reviews. Uploaded bills are processed securely via Mindee and stored in UK/EU data centres.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">2.8 International Transfers</h2>
          <p>
            Most data is stored and processed in the UK/EU. Where data is transferred outside the UK/EU (e.g. to Stripe or certain analytics providers), we ensure appropriate safeguards such as Standard Contractual Clauses or UK Addendums are in place.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">2.9 Contact & Complaints</h2>
          <p>
            For any privacy questions or complaints, contact: <a href="mailto:suhail@greentrackai.com" className="text-green-600 dark:text-green-400 hover:underline">suhail@greentrackai.com</a>. You also have the right to lodge a complaint with the UK Information Commissioner’s Office (ICO) at ico.org.uk.
          </p>
        </section>
      </div>

      <div className="mt-12 text-sm text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-800 pt-6">
        <a href="/" className="text-green-600 dark:text-green-400 hover:underline">← Back to GreenTrack AI</a>
      </div>
    </div>
  );
}
