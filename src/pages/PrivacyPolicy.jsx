import { Link } from 'react-router-dom';

/**
 * Privacy Policy page.
 *
 * IMPORTANT: This is a template tailored to Fixit Genie's data practices as
 * implemented in the codebase as of mid-2026. It is NOT legal advice. Before
 * publishing, you should have a licensed attorney in your jurisdiction
 * review it. Pay particular attention to: CCPA / state privacy laws if you
 * operate in California, Virginia, Colorado, etc., COPPA if any of your
 * users might be under 13, and TCPA / CTIA guidelines for the SMS section.
 *
 * Things to find-and-replace before going live:
 *   Media Spark Hub LLC        e.g. "Fixit Genie, LLC" or your legal entity
 *   936 W. Little York Houston, TX 77091     e.g. "123 Main St, Houston, TX 77001"
 *   fixitgenied2026@gmail.com        e.g. "privacy@fixitgenie.com"
 *   May 19, 2026       e.g. "May 19, 2026"
 *   [STATE]                e.g. "Texas"
 */
export default function PrivacyPolicy() {
  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '900px' }}>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Privacy Policy</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Effective Date: May 19, 2026
        </p>

        <Section title="1. Introduction">
          <p>
            Media Spark Hub LLC (&ldquo;Fixit Genie,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
            &ldquo;our&rdquo;) operates a marketplace platform connecting homeowners with
            home-service professionals (the &ldquo;Service&rdquo;). This Privacy Policy
            explains what information we collect from users, how we use it,
            who we share it with, and the choices you have about your data.
          </p>
          <p>
            By creating an account or using the Service, you agree to the
            collection and use of information in accordance with this Policy.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p><strong>Account Information.</strong> When you register, we collect
            your name, email address, account type (homeowner or professional),
            and a password (stored hashed and salted).</p>

          <p><strong>Profile Information.</strong> You may add a profile photo, a
            phone number, a default city, state, and ZIP code, and an optional
            short bio. Professionals additionally provide business details,
            services offered, government-issued ID, license documents, and
            insurance certificates as part of onboarding.</p>

          <p><strong>Service Requests and Bids.</strong> Homeowners post service
            requests (category, location, urgency, free-text description).
            Professionals submit bids (price, message). All of this is stored
            in our database.</p>

          <p><strong>Messages and Attachments.</strong> Conversations between
            homeowners and professionals — including text and photo attachments —
            are stored as a permanent record. Photos are uploaded to a private
            storage bucket and are visible only to the conversation
            participants (and our administrators for compliance and moderation
            purposes).</p>

          <p><strong>Payment Information.</strong> If you purchase a Premium
            subscription, payments are processed by Stripe. We do not store
            your full payment-card details on our servers; Stripe handles all
            sensitive payment data under their own privacy and security policies.</p>

          <p><strong>Usage Data.</strong> We may collect information about how
            you interact with the Service, including pages visited, features
            used, and approximate session timing. We track an active-session
            timestamp (last_seen_at) so we can deliver email and SMS notifications
            only when you are not already in the app.</p>

          <p><strong>Device and Log Data.</strong> Our hosting and infrastructure
            providers may automatically record standard server logs containing
            IP addresses, browser type, and timestamps.</p>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul style={listStyle}>
            <li>To create and maintain your account.</li>
            <li>To facilitate connections between homeowners and professionals,
              including matching service requests with relevant professionals.</li>
            <li>To deliver email notifications when you receive a new message
              and are not actively in the app.</li>
            <li>To deliver SMS alerts to opted-in Premium professionals when a
              new service request is posted in their service area.</li>
            <li>To process payments and manage subscriptions through Stripe.</li>
            <li>To prevent fraud, abuse, and violations of our Terms of Service.</li>
            <li>To improve the Service and develop new features.</li>
            <li>To comply with legal obligations.</li>
          </ul>
        </Section>

        <Section title="4. Sharing With Third Parties">
          <p>We do not sell your personal information. We share information
            only with the following categories of service providers, and only
            to the extent necessary to operate the Service:</p>

          <ul style={listStyle}>
            <li><strong>Supabase</strong> — our database, authentication, file
              storage, and real-time messaging backend.</li>
            <li><strong>Stripe</strong> — payment processing for Premium
              subscriptions.</li>
            <li><strong>Resend</strong> — outbound email for notifications and
              transactional messages.</li>
            <li><strong>Twilio</strong> — SMS delivery for Premium professional
              alerts.</li>
            <li><strong>Sentry</strong> — error monitoring and crash reporting,
              which may include non-personal technical context about errors.</li>
            <li><strong>Netlify</strong> — web hosting; serves the application
              to your browser.</li>
          </ul>

          <p>We may also disclose information when required by law, when
            responding to valid legal process, or to protect the rights,
            property, or safety of Media Spark Hub LLC, our users, or others.</p>

          <p>When you accept a bid, your contact details (name, email, phone,
            and exact address) are made visible to the matched professional so
            they can perform the work. Before acceptance, professionals see
            only your general area and the description you provided.</p>
        </Section>

        <Section title="5. Data Retention">
          <p>We retain account information for as long as your account is
            active. Messages and conversations are retained as a permanent
            record and are not hard-deleted, in keeping with our
            record-keeping goal for both parties (e.g. for disputes,
            warranty references, or repeat work).</p>
          <p>Individual messages may be soft-deleted by their sender — when
            this happens the content is hidden in the UI and replaced with
            a placeholder, but a row remains in our database for audit purposes.</p>
          <p>Completed jobs and their conversations are automatically archived
            (hidden from active inboxes) thirty (30) days after the homeowner
            marks the job complete.</p>
          <p>You may request deletion of your account at any time by contacting
            us. Some information may be retained as required by law (e.g. for
            tax records) or for legitimate business purposes (e.g. fraud
            prevention).</p>
        </Section>

        <Section title="6. SMS and Email Communications">
          <p><strong>Email notifications.</strong> By creating an account you
            consent to receive transactional emails related to your account
            (password resets, security alerts, account verification, and so on).
            You may opt out of new-message email notifications via your profile
            settings; transactional emails cannot be opted out of as long as
            you maintain an account.</p>

          <p><strong>SMS notifications (Premium professionals only).</strong>
            Professionals who upgrade to a Premium subscription and explicitly
            enable the &ldquo;SMS Alerts&rdquo; toggle in their dashboard will
            receive text messages from us when a new homeowner request is
            posted in their target ZIP code. Standard message and data rates
            may apply.</p>
          <ul style={listStyle}>
            <li>You may opt out at any time by replying <strong>STOP</strong>
              to any SMS we send. This will immediately and permanently
              unsubscribe you from future SMS.</li>
            <li>You may also disable SMS Alerts via the toggle on your Pro
              Dashboard.</li>
            <li>For help, reply <strong>HELP</strong> to any of our SMS
              messages or email fixitgenied2026@gmail.com.</li>
            <li>Message frequency varies based on activity in your service area
              and may be several messages per day.</li>
            <li>By enabling SMS Alerts, you certify that the phone number on
              file is yours and that you consent to receive SMS at that number.</li>
          </ul>
        </Section>

        <Section title="7. Your Rights">
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul style={listStyle}>
            <li>Access the personal information we hold about you.</li>
            <li>Request correction of inaccurate information.</li>
            <li>Request deletion of your account and associated personal data,
              subject to limited exceptions.</li>
            <li>Object to or restrict certain processing activities.</li>
            <li>Withdraw consent (where consent is the basis for processing).</li>
            <li>Lodge a complaint with a data protection authority.</li>
          </ul>
          <p>To exercise any of these rights, email us at fixitgenied2026@gmail.com.</p>
        </Section>

        <Section title="8. Cookies and Tracking">
          <p>The Service uses cookies and similar technologies that are
            essential for authentication (so we can keep you logged in).
            We do not use third-party advertising or cross-site tracking
            cookies.</p>
        </Section>

        <Section title="9. Security">
          <p>We use industry-standard safeguards including encrypted
            connections (TLS), row-level security policies in our database,
            and private storage buckets for user-uploaded files. No method
            of transmission or storage is 100% secure, however, and we cannot
            guarantee absolute security.</p>
          <p>If you believe your account has been compromised, change your
            password immediately and contact us at fixitgenied2026@gmail.com.</p>
        </Section>

        <Section title="10. Children's Privacy">
          <p>The Service is not intended for users under the age of 18. We do
            not knowingly collect personal information from anyone under 18.
            If you believe a minor has provided information to us, please
            contact us so we can remove it.</p>
        </Section>

        <Section title="11. International Users">
          <p>The Service is operated from the United States. If you access the
            Service from outside the U.S., your information will be processed
            in the U.S., which may have different data-protection rules than
            your country of residence.</p>
        </Section>

        <Section title="12. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. Material
            changes will be posted on this page with an updated Effective
            Date and, where appropriate, notified to you by email.</p>
        </Section>

        <Section title="13. Contact Us">
          <p>If you have any questions about this Privacy Policy or your data,
            contact us at:</p>
          <p style={{ marginLeft: '1rem' }}>
            Media Spark Hub LLC<br />
            936 W. Little York Houston, TX 77091<br />
            Email: fixitgenied2026@gmail.com
          </p>
        </Section>

        <div style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          See also: <Link to="/terms" style={{ color: 'var(--color-primary-light)' }}>Terms of Service</Link>
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
