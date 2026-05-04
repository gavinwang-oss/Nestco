"use client";
import Navbar from "@/components/Navbar";

const bgStyle = {
  backgroundImage: `url('/sb1.png')`,
    backgroundSize: "cover",
    backgroundPosition: "center", backgroundAttachment: "fixed",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen flex flex-col" style={bgStyle}>
      <Navbar />

      <div className="max-w-2xl mx-auto w-full px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-950 tracking-tight">Terms of Service</h1>
          <p className="text-sm text-gray-400 mt-1">Last updated: April 11, 2026</p>
        </div>

        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-7 space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Nestco (&quot;the Platform&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform. We may update these terms at any time, and continued use constitutes acceptance of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">2. Eligibility</h2>
            <p>
              Nestco is intended for currently enrolled students at the University of California, Berkeley. By using the Platform, you represent that you are at least 18 years old and are a current UC Berkeley student or affiliate.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">3. The Platform</h2>
            <p>
              Nestco is a marketplace that connects students seeking sublets with students offering them. Nestco is not a landlord, tenant, property manager, real estate broker, or party to any lease or sublease agreement. We do not own, manage, or control any properties listed on the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">4. User Responsibilities — Listings</h2>
            <p>
              By posting a listing on Nestco, you represent and warrant that:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
              <li>You have the legal right to sublet the property, including any necessary permissions from your landlord or property management company.</li>
              <li>All information in your listing is accurate and not misleading.</li>
              <li>Your listing complies with all applicable local, state, and federal laws, including fair housing laws.</li>
            </ul>
            <p className="mt-2">
              Nestco does not verify lease terms, landlord permissions, or the legality of any sublease arrangement. It is your sole responsibility to ensure you are authorized to sublet your property. If your lease prohibits subletting, you assume all risk and liability for any consequences of listing on the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">5. User Responsibilities — Renters</h2>
            <p>
              By using Nestco to find a sublet, you acknowledge that Nestco does not guarantee the accuracy of any listing, the condition of any property, or the validity of any sublease arrangement. You are responsible for conducting your own due diligence before entering into any agreement with a lister, including verifying that the sublease is legally permitted.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">6. Fair Housing</h2>
            <p>
              All users must comply with the Fair Housing Act and applicable California fair housing laws. Listings may not discriminate on the basis of race, color, religion, sex, national origin, familial status, disability, sexual orientation, gender identity, or any other protected characteristic, except as narrowly permitted by law for shared living spaces.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">7. AI Features</h2>
            <p>
              Nestco uses artificial intelligence to help match users with listings and to draft introductory messages. AI-generated content is provided as a convenience and may not always be accurate. You are responsible for reviewing and approving any AI-drafted messages before they are sent. Nestco is not liable for the content of AI-generated suggestions.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">8. Prohibited Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
              <li>Post false, misleading, or fraudulent listings.</li>
              <li>Harass, threaten, or abuse other users.</li>
              <li>Use the Platform for any unlawful purpose.</li>
              <li>Attempt to circumvent rate limits, security measures, or access controls.</li>
              <li>Scrape, crawl, or otherwise extract data from the Platform without permission.</li>
              <li>Impersonate another person or misrepresent your affiliation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">9. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless Nestco, its founders, operators, and affiliates from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys&apos; fees) arising out of or related to: (a) your use of the Platform; (b) your violation of these Terms; (c) your violation of any lease agreement, law, or regulation; or (d) any dispute between you and another user, landlord, or third party.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">10. Limitation of Liability</h2>
            <p>
              Nestco is provided &quot;as is&quot; without warranties of any kind. To the maximum extent permitted by law, Nestco shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of housing, financial losses from lease violations, or damages arising from interactions with other users. In no event shall Nestco&apos;s total liability exceed the amount you have paid to Nestco in the twelve months preceding the claim, or $100, whichever is greater.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">11. Privacy</h2>
            <p>
              Your profile information (name, age, major, year, gender, and optionally race/ethnicity) is shared with other users as part of the Platform&apos;s functionality. Your name is only revealed to another user after a mutual match. By using the Platform, you consent to this limited sharing of your information. We do not sell your data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">12. Account Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time, with or without notice, for conduct that we determine violates these Terms or is harmful to other users or the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">13. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of California. Any disputes arising from these Terms or your use of the Platform shall be resolved in the courts of Alameda County, California.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">14. Contact</h2>
            <p>
              Questions about these Terms? Reach us at{" "}
              <a href="mailto:support@nestco.ai" className="text-black underline underline-offset-2">
                support@nestco.ai
              </a>
              .
            </p>
          </section>
        </div>

        <p className="text-xs text-gray-400 mt-5 text-center">
          By using Nestco, you acknowledge that you have read, understood, and agree to these Terms of Service.
        </p>
      </div>
    </div>
  );
}
