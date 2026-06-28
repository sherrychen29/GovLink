import { SiteShell } from "@/components/SiteShell";

export const metadata = {
  title: "Terms and Conditions | GovLink",
};

export default function TermsPage() {
  return (
    <SiteShell>
      <div className="gl-container max-w-3xl py-12 lg:py-16">
        <h1 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
          Terms and Conditions
        </h1>
        <p className="mt-2 text-sm text-navy-600">
          City of San Jose | GovLink Civic Reporting Service | Effective Date: January 1, 2025
        </p>

        <div className="mt-10 space-y-10 text-navy-900">

          <section>
            <h2 className="text-xl font-bold text-navy-900">1. Acceptance of Terms</h2>
            <p className="mt-3 leading-relaxed">
              By accessing or using the GovLink civic reporting service ("Service"), you agree to be
              bound by these Terms and Conditions. If you do not agree to these terms, you must
              discontinue use of the Service immediately. These terms constitute a legally binding
              agreement between you and the City of San Jose ("City").
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy-900">2. Description of Service</h2>
            <p className="mt-3 leading-relaxed">
              GovLink is a digital platform operated by the City of San Jose that enables residents
              to submit non-emergency service requests and civic issue reports to City departments.
              The Service facilitates communication between residents and City staff for matters
              including, but not limited to, infrastructure maintenance, public works concerns,
              and neighborhood quality-of-life issues.
            </p>
            <p className="mt-3 leading-relaxed">
              The Service is intended solely for reporting non-emergency issues. For life-threatening
              emergencies, dial 911 immediately. GovLink does not dispatch emergency services and
              should not be used as a substitute for emergency response.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy-900">3. Eligibility and Account Registration</h2>
            <p className="mt-3 leading-relaxed">
              The Service is available to any person submitting a report related to public
              infrastructure or services within the City of San Jose. No account registration is
              required to submit a report. Optional contact information may be provided at the
              time of submission solely for the purpose of tracking report status. The City will not
              use contact information for commercial marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy-900">4. Submission of Reports</h2>
            <p className="mt-3 leading-relaxed">
              By submitting a report through the Service, you certify that:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">
              <li>The information provided is accurate and complete to the best of your knowledge.</li>
              <li>The reported issue is a genuine, non-emergency public concern within City jurisdiction.</li>
              <li>You are not submitting false, misleading, or malicious reports.</li>
              <li>Any photographs or media submitted are your own original content or content you have the right to share, and do not depict private individuals without consent.</li>
            </ul>
            <p className="mt-3 leading-relaxed">
              The City reserves the right to decline, close, or reclassify any report that does not
              fall within the scope of City services, is determined to be outside City jurisdiction,
              or is found to be duplicative of an existing active report.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy-900">5. Use of Submitted Content</h2>
            <p className="mt-3 leading-relaxed">
              By submitting a report, you grant the City of San Jose a non-exclusive, royalty-free,
              perpetual license to use, display, reproduce, and distribute the submitted content,
              including photographs and descriptions, for the purposes of service delivery,
              public transparency, and civic record-keeping. Submitted reports may be made
              publicly visible on the GovLink platform in accordance with applicable public records laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy-900">6. Privacy and Data Collection</h2>
            <p className="mt-3 leading-relaxed">
              The City of San Jose collects and processes information submitted through the Service
              in accordance with the California Consumer Privacy Act (CCPA) and applicable state
              and federal privacy laws. Information collected through GovLink, including report
              content, location data, and optional contact details, is used exclusively to process
              and respond to service requests and to improve the Service.
            </p>
            <p className="mt-3 leading-relaxed">
              Location data provided at the time of report submission is used solely to route the
              report to the appropriate City department. The City does not sell personal information
              to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy-900">7. Prohibited Conduct</h2>
            <p className="mt-3 leading-relaxed">
              Users of the Service are prohibited from:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">
              <li>Submitting false, fraudulent, or malicious reports intended to misuse City resources.</li>
              <li>Using the Service to harass, defame, or target any individual or group.</li>
              <li>Uploading content that is unlawful, obscene, or in violation of any third-party rights.</li>
              <li>Attempting to gain unauthorized access to City systems or data through the Service.</li>
              <li>Using automated tools, bots, or scripts to submit reports without prior written authorization from the City.</li>
            </ul>
            <p className="mt-3 leading-relaxed">
              Violations of these prohibitions may result in termination of access to the Service and
              referral to appropriate law enforcement authorities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy-900">8. Response Time and Service Levels</h2>
            <p className="mt-3 leading-relaxed">
              The City of San Jose does not guarantee a specific response time for any report submitted
              through the Service. Response and resolution timelines vary based on the nature and
              severity of the issue, available City resources, and departmental workloads.
              Submission of a report through GovLink does not constitute a contractual obligation
              by the City to perform any specific action within any specific timeframe.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy-900">9. Limitation of Liability</h2>
            <p className="mt-3 leading-relaxed">
              To the fullest extent permitted by applicable law, the City of San Jose, its officers,
              employees, agents, and contractors shall not be liable for any direct, indirect,
              incidental, special, or consequential damages arising out of or related to your use of
              the Service, including reliance on information provided through the Service, delays
              in response, or any action or inaction taken by the City based on a submitted report.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy-900">10. Disclaimer of Warranties</h2>
            <p className="mt-3 leading-relaxed">
              The Service is provided on an "as is" and "as available" basis without warranties of
              any kind, either express or implied. The City does not warrant that the Service will
              be uninterrupted, error-free, or free from technical defects. The City may suspend,
              modify, or discontinue the Service at any time without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy-900">11. Modifications to Terms</h2>
            <p className="mt-3 leading-relaxed">
              The City of San Jose reserves the right to modify these Terms and Conditions at any
              time. Updated terms will be posted to this page with a revised effective date.
              Continued use of the Service following the posting of revised terms constitutes
              acceptance of those changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy-900">12. Governing Law</h2>
            <p className="mt-3 leading-relaxed">
              These Terms and Conditions are governed by and construed in accordance with the laws
              of the State of California. Any disputes arising under or in connection with these
              terms shall be subject to the exclusive jurisdiction of the courts of the County of
              Santa Clara, California.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy-900">13. Contact Information</h2>
            <p className="mt-3 leading-relaxed">
              For questions regarding these Terms and Conditions or the GovLink Service, contact
              the City of San Jose Office of the City Clerk at:
            </p>
            <address className="mt-3 not-italic leading-relaxed text-navy-700">
              City of San Jose<br />
              200 East Santa Clara Street<br />
              San Jose, CA 95113<br />
              Phone: (408) 535-1260
            </address>
          </section>

        </div>
      </div>
    </SiteShell>
  );
}
