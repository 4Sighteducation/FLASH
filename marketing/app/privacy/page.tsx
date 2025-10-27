import Navigation from '../components/Navigation'
import '../legal.css'

export default function PrivacyPolicy() {
  return (
    <>
      <Navigation />
      <main className="legal-page">
        <div className="container">
          <h1>Privacy Policy</h1>
          <p className="updated">Last Updated: October 25, 2025</p>
          
          <section>
            <h2>1. Introduction</h2>
            <p>Welcome to FL4SH ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website.</p>
          </section>
          
          <section>
            <h2>2. Information We Collect</h2>
            <h3>Personal Information</h3>
            <ul>
              <li><strong>Account Information:</strong> Email address, username, password (encrypted)</li>
              <li><strong>Profile Data:</strong> Exam level (GCSE/A-Level), exam board, subjects</li>
              <li><strong>Study Data:</strong> Flashcards created, study sessions, progress statistics</li>
              <li><strong>Usage Data:</strong> How you interact with the app, features used, time spent</li>
            </ul>
            
            <h3>Automatically Collected Information</h3>
            <ul>
              <li>Device information (type, operating system, unique device identifiers)</li>
              <li>IP address and general location data</li>
              <li>App performance and crash data</li>
              <li>Analytics data (via third-party services)</li>
            </ul>
          </section>
          
          <section>
            <h2>3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve FL4SH services</li>
              <li>Personalize your learning experience</li>
              <li>Generate AI-powered flashcards specific to your exam board</li>
              <li>Track your study progress and provide analytics</li>
              <li>Send you important updates and notifications</li>
              <li>Process payments and manage subscriptions</li>
              <li>Respond to your support requests</li>
              <li>Prevent fraud and ensure platform security</li>
            </ul>
          </section>
          
          <section>
            <h2>4. Data Storage and Security</h2>
            <p>Your data is stored securely using Supabase (PostgreSQL database) with:</p>
            <ul>
              <li>Industry-standard encryption (AES-256)</li>
              <li>Secure authentication via OAuth 2.0 and JWT tokens</li>
              <li>Row-level security policies</li>
              <li>Regular security audits and updates</li>
              <li>Data centers located in the EU (GDPR compliant)</li>
            </ul>
          </section>
          
          <section>
            <h2>5. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul>
              <li><strong>Supabase:</strong> Database and authentication</li>
              <li><strong>OpenAI:</strong> AI card generation and voice analysis</li>
              <li><strong>Vercel:</strong> Hosting and serverless functions</li>
              <li><strong>Expo/EAS:</strong> Mobile app infrastructure</li>
              <li><strong>Stripe:</strong> Payment processing (future)</li>
            </ul>
            <p>Each service has its own privacy policy and data handling practices.</p>
          </section>
          
          <section>
            <h2>6. Your Rights (GDPR & UK GDPR)</h2>
            <p>You have the right to:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Data Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Restriction:</strong> Limit how we process your data</li>
              <li><strong>Object:</strong> Object to processing of your data</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent at any time</li>
            </ul>
          </section>
          
          <section>
            <h2>7. Children's Privacy</h2>
            <p>FL4SH is designed for students aged 13 and above. We do not knowingly collect personal information from children under 13. If you are a parent and believe your child has provided us with personal information, please contact us.</p>
          </section>
          
          <section>
            <h2>8. Data Retention</h2>
            <p>We retain your personal information only as long as necessary to provide our services and for legitimate business purposes. When you delete your account, we will delete or anonymize your personal data within 30 days.</p>
          </section>
          
          <section>
            <h2>9. Cookies and Tracking</h2>
            <p>We use cookies and similar technologies to:</p>
            <ul>
              <li>Keep you logged in</li>
              <li>Remember your preferences</li>
              <li>Analyze usage patterns</li>
              <li>Improve user experience</li>
            </ul>
            <p>You can control cookies through your browser settings.</p>
          </section>
          
          <section>
            <h2>10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.</p>
          </section>
          
          <section>
            <h2>11. Contact Us</h2>
            <p>If you have questions about this Privacy Policy, please contact us:</p>
            <div className="contact-box">
              <p><strong>4Sight Education Ltd</strong></p>
              <p>Email: <a href="mailto:privacy@fl4shcards.com">privacy@fl4shcards.com</a></p>
              <p>Address: [Your registered business address]</p>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

