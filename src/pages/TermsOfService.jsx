import { Link } from 'react-router-dom';

/**
 * Terms of Service page.
 *
 * IMPORTANT: This is a template tailored to Fixit Genie's product as
 * implemented in the codebase as of mid-2026. It is NOT legal advice. Have a
 * licensed attorney in your jurisdiction review it before publishing, and
 * adjust dispute-resolution / governing-law clauses to fit your actual
 * legal entity and business state. Pay particular attention to: arbitration
 * clauses, payment terms, and any consumer-protection laws in states where
 * you do business.
 *
 * Things to find-and-replace before going live:
 *   Media Spark Hub LLC        e.g. "Fixit Genie, LLC"
 *   936 W. Little York Houston, TX 77091     e.g. "123 Main St, Houston, TX 77001"
 *   fixitgenied2026@gmail.com        e.g. "support@fixitgenie.com"
 *   fixitgenied2026@gmail.com          e.g. "legal@fixitgenie.com"
 *   May 19, 2026       e.g. "May 19, 2026"
 *   Texas                e.g. "Texas"
 *   Harris County, Texas               e.g. "Harris County, Texas"
 */
export default function TermsOfService() {
  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '900px' }}>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Terms of Service</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Effective Date: May 19, 2026
        </p>

        <Section title="1. Acceptance of Terms">
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) constitute a legal agreement between
            you and Media Spark Hub LLC (&ldquo;Fixit Genie,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
            governing your access to and use of the Fixit Genie web application
            and related services (collectively, the &ldquo;Service&rdquo;).
          </p>
          <p>
            By creating an account, posting a service request, submitting a bid,
            or otherwise using the Service, you agree to be bound by these
            Terms and our <Link to="/privacy" style={{ color: 'var(--color-primary-light)' }}>Privacy Policy</Link>.
            If you do not agree, do not use the Service.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>You must be at least 18 years old and able to form a binding
            contract to use the Service. Professionals offering services must
            additionally hold any required licenses, insurance, and certifications
            for their trade in the jurisdiction where they operate.</p>
        </Section>

        <Section title="3. Account Registration">
          <p>You agree to provide accurate, current, and complete information
            during registration and to keep your account information up to date.
            You are responsible for safeguarding your password and for any
            activity under your account. Notify us immediately of unauthorized
            access.</p>
        </Section>

        <Section title="4. Description of the Service">
          <p>Fixit Genie is a marketplace that connects homeowners with
            independent home-service professionals (&ldquo;Pros&rdquo;). Homeowners post
            service requests; Pros submit bids; the parties communicate via
            in-app messaging; and the homeowner ultimately chooses whether to
            accept a bid.</p>
          <p><strong>We are a platform, not a service provider.</strong> Fixit Genie
            does not perform any home-service work, does not employ Pros, and
            does not warrant the quality, safety, legality, or completion of
            any work performed by Pros. All agreements between homeowners and
            Pros are between those parties directly.</p>
        </Section>

        <Section title="5. User Obligations and Acceptable Use">
          <p>You agree NOT to:</p>
          <ul style={listStyle}>
            <li>Provide false, misleading, or fraudulent information.</li>
            <li>Use the Service for any illegal purpose or in violation of any
              applicable law.</li>
            <li>Harass, threaten, abuse, defame, or impersonate other users.</li>
            <li>Send unsolicited spam, advertising, or promotional content
              through the messaging feature.</li>
            <li>Attempt to circumvent the Service to conduct business off-platform
              in a way that evades any applicable fees (where applicable).</li>
            <li>Upload content that infringes intellectual property rights,
              contains malware, or violates anyone's privacy.</li>
            <li>Reverse-engineer, scrape, or interfere with the Service.</li>
            <li>Create multiple accounts to manipulate ratings or reviews.</li>
          </ul>
        </Section>

        <Section title="6. Homeowner Responsibilities">
          <p>If you post a service request, you agree to:</p>
          <ul style={listStyle}>
            <li>Provide accurate descriptions of the work needed.</li>
            <li>Respond to bids and questions in a reasonable timeframe.</li>
            <li>Honor any agreements you make with a Pro after accepting their bid.</li>
            <li>Pay agreed amounts directly to the Pro per the terms you
              negotiate.</li>
          </ul>
        </Section>

        <Section title="7. Professional (Pro) Responsibilities">
          <p>If you sign up as a Pro, you agree to:</p>
          <ul style={listStyle}>
            <li>Provide accurate information about your services, qualifications,
              licenses, and insurance.</li>
            <li>Submit good-faith bids only on work you intend to perform.</li>
            <li>Perform any accepted work in a professional, workmanlike manner
              that meets applicable trade standards.</li>
            <li>Comply with all applicable laws including those concerning
              business licensing, taxes, and worker safety.</li>
            <li>Maintain the confidentiality of homeowner contact information
              that is revealed upon bid acceptance.</li>
          </ul>
        </Section>

        <Section title="8. Premium Subscription (Pros)">
          <p>Pros may upgrade to a Premium subscription for additional features
            including SMS job alerts in their service area, priority search
            placement, and a verification badge. Premium subscriptions:</p>
          <ul style={listStyle}>
            <li>Are billed monthly via Stripe at the current advertised rate
              ($15/month at the time of writing).</li>
            <li>Renew automatically until canceled.</li>
            <li>May be canceled at any time via the Stripe customer portal;
              cancellation takes effect at the end of the current billing period.</li>
            <li>Are non-refundable for partial months, except where required by
              law.</li>
          </ul>
          <p>We may change Premium features or pricing on prior notice. Continued
            use of a Premium account after a price change constitutes acceptance
            of the new price.</p>
        </Section>

        <Section title="9. SMS Notifications">
          <p>By enabling the &ldquo;SMS Alerts&rdquo; toggle in your Pro Dashboard, you
            expressly consent to receive automated SMS messages from us at the
            phone number you provided. Standard message and data rates may apply.</p>
          <ul style={listStyle}>
            <li>Reply <strong>STOP</strong> to any message to unsubscribe.</li>
            <li>Reply <strong>HELP</strong> for assistance.</li>
            <li>You may also disable SMS Alerts via the toggle in your dashboard.</li>
            <li>Message frequency varies by activity in your service area.</li>
            <li>You represent that the phone number on file is yours and that
              you have authority to consent to receive SMS at that number.</li>
          </ul>
          <p>Full SMS terms are described in our
            <Link to="/privacy" style={{ color: 'var(--color-primary-light)' }}> Privacy Policy</Link>.</p>
        </Section>

        <Section title="10. Content You Submit">
          <p>You retain ownership of any content you submit to the Service
            (text, photos, profile information). By submitting content, you
            grant us a non-exclusive, worldwide, royalty-free license to use,
            store, reproduce, display, and transmit that content solely as
            necessary to operate and improve the Service.</p>
          <p>You are solely responsible for the content you submit and represent
            that you have all necessary rights to submit it. We may remove
            content that violates these Terms.</p>
        </Section>

        <Section title="11. Reviews and Ratings">
          <p>Homeowners may leave ratings and reviews about Pros they have
            worked with. Reviews must be honest, based on actual experience,
            and free of profanity, threats, or false statements. We reserve
            the right to remove reviews that violate these guidelines.</p>
        </Section>

        <Section title="12. Disclaimers">
          <p style={{ fontWeight: 600 }}>
            THE SERVICE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS
            WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, TO THE FULLEST
            EXTENT PERMITTED BY LAW.
          </p>
          <p>We do not warrant: (a) that the Service will be uninterrupted or
            error-free; (b) the quality, safety, or legality of any work
            performed by a Pro; (c) the accuracy of any user-submitted content;
            or (d) that any homeowner or Pro will fulfill their obligations.</p>
          <p>Fixit Genie does not vet every Pro's licensing, insurance, or
            background beyond the verification step shown on Pro profiles, and
            you should independently verify a Pro's qualifications before
            engaging them.</p>
        </Section>

        <Section title="13. Limitation of Liability">
          <p style={{ fontWeight: 600 }}>
            TO THE FULLEST EXTENT PERMITTED BY LAW, Media Spark Hub LLC AND ITS
            OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR
            ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
            DAMAGES, INCLUDING LOST PROFITS, ARISING OUT OF OR RELATED TO YOUR
            USE OF THE SERVICE OR ANY DISPUTE WITH ANOTHER USER.
          </p>
          <p>Our aggregate liability for any claim arising out of or related
            to the Service will not exceed the greater of (a) the amount you
            paid to us in the twelve months preceding the claim, or (b) one
            hundred U.S. dollars ($100).</p>
        </Section>

        <Section title="14. Indemnification">
          <p>You agree to indemnify, defend, and hold harmless Media Spark Hub LLC
            and its officers, directors, employees, and agents from any
            claims, liabilities, damages, and expenses (including attorney
            fees) arising out of your use of the Service, your content, your
            interactions with other users, or your violation of these Terms.</p>
        </Section>

        <Section title="15. Termination">
          <p>You may close your account at any time by contacting us. We may
            suspend or terminate your account, with or without notice, if you
            violate these Terms or if your conduct creates risk for the
            Service or other users.</p>
          <p>Upon termination, your right to use the Service ends, but
            sections of these Terms that by their nature should survive
            (including ownership, disclaimers, limitations of liability, and
            dispute resolution) will continue to apply.</p>
        </Section>

        <Section title="16. Dispute Resolution and Governing Law">
          <p>These Terms are governed by the laws of the State of Texas,
            without regard to its conflict-of-laws principles. You and
            Media Spark Hub LLC agree that any dispute arising out of or related
            to these Terms or the Service will be resolved exclusively in the
            state or federal courts located in Harris County, Texas, and you consent to
            the personal jurisdiction of those courts.</p>
          <p>If you have a concern, please contact us first at fixitgenied2026@gmail.com
            so we can attempt to resolve it informally.</p>
        </Section>

        <Section title="17. Changes to These Terms">
          <p>We may update these Terms from time to time. Material changes
            will be posted on this page with an updated Effective Date. If a
            change materially affects your rights, we may also notify you by
            email. Your continued use of the Service after a change takes
            effect constitutes acceptance of the updated Terms.</p>
        </Section>

        <Section title="18. Contact Us">
          <p>Questions about these Terms? Contact us at:</p>
          <p style={{ marginLeft: '1rem' }}>
            Media Spark Hub LLC<br />
            936 W. Little York Houston, TX 77091<br />
            Email: fixitgenied2026@gmail.com
          </p>
        </Section>

        <div style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          See also: <Link to="/privacy" style={{ color: 'var(--color-primary-light)' }}>Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: '1.75rem' }}>
      <h2 style={{ fontSize: '1.15rem', marginBottom: '0.6rem', color: 'var(--text-main)' }}>
        {title}
      </h2>
      <div style={{ color: 'var(--text-main)', lineHeight: 1.55, fontSize: '0.95rem' }}>
        {children}
      </div>
    </section>
  );
}

const listStyle = {
  paddingLeft: '1.25rem',
  margin: '0.5rem 0',
};
