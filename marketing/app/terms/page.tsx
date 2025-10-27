import Navigation from '../components/Navigation'
import '../legal.css'

export default function TermsOfService() {
  return (
    <>
      <Navigation />
      <main className="legal-page">
        <div className="container">
          <h1>Terms of Service</h1>
          <p className="updated">Last Updated: October 25, 2025</p>
          
          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing and using FL4SH ("the Service"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
          </section>
          
          <section>
            <h2>2. Description of Service</h2>
            <p>FL4SH is an AI-powered flashcard learning platform designed for GCSE and A-Level students. The Service includes:</p>
            <ul>
              <li>Access to over 10,000 exam specification topics and subtopics</li>
              <li>AI-generated flashcards based on official exam content</li>
              <li>Spaced repetition learning system (Leitner boxes)</li>
              <li>Past paper questions, mark schemes, and examiners reports</li>
              <li>AI voice analysis and feedback (Pro tier)</li>
              <li>Progress tracking and analytics</li>
            </ul>
          </section>
          
          <section>
            <h2>3. User Accounts</h2>
            <h3>Registration</h3>
            <ul>
              <li>You must be at least 13 years old to create an account</li>
              <li>You must provide accurate and complete information</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You are responsible for all activities under your account</li>
            </ul>
            
            <h3>Account Termination</h3>
            <p>We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent, abusive, or illegal activities.</p>
          </section>
          
          <section>
            <h2>4. Subscription Plans and Payments</h2>
            <h3>Free Tier</h3>
            <p>Limited access to 1 subject and 10 flashcards. No payment required.</p>
            
            <h3>Premium Tier (£2.99/month)</h3>
            <p>Unlimited subjects, unlimited flashcards, offline mode, and priority support.</p>
            
            <h3>Pro Tier (£4.99/month)</h3>
            <p>Everything in Premium plus AI card generation, voice analysis, past papers, and advanced analytics.</p>
            
            <h3>Billing</h3>
            <ul>
              <li>Subscriptions are billed monthly</li>
              <li>Payments processed via Apple App Store or Google Play Store</li>
              <li>Prices are in GBP (British Pounds)</li>
              <li>You can cancel anytime - no refunds for partial months</li>
            </ul>
          </section>
          
          <section>
            <h2>5. Acceptable Use</h2>
            <p>You agree NOT to:</p>
            <ul>
              <li>Share your account with others</li>
              <li>Use the Service for any illegal purposes</li>
              <li>Attempt to reverse engineer or hack the Service</li>
              <li>Upload malicious content or spam</li>
              <li>Scrape or copy our database of exam content</li>
              <li>Violate any exam board's intellectual property rights</li>
              <li>Resell or redistribute FL4SH content</li>
            </ul>
          </section>
          
          <section>
            <h2>6. Intellectual Property</h2>
            <h3>FL4SH Content</h3>
            <p>All content, features, and functionality (including but not limited to software, text, graphics, logos, and AI-generated content) are owned by 4Sight Education Ltd and protected by copyright, trademark, and other laws.</p>
            
            <h3>User Content</h3>
            <p>You retain ownership of flashcards you create. By using FL4SH, you grant us a license to store and display your content as necessary to provide the Service.</p>
            
            <h3>Exam Board Content</h3>
            <p>Past papers, mark schemes, and exam specifications remain the property of their respective exam boards. FL4SH provides access for educational purposes only.</p>
          </section>
          
          <section>
            <h2>7. Disclaimers and Limitations</h2>
            <h3>No Guarantee of Results</h3>
            <p>While FL4SH is designed to improve study efficiency, we cannot guarantee specific exam results or grade improvements.</p>
            
            <h3>AI Accuracy</h3>
            <p>AI-generated content and voice analysis are provided as study aids. Always verify information with official exam board materials and teachers.</p>
            
            <h3>Service Availability</h3>
            <p>We strive for 99.9% uptime but cannot guarantee uninterrupted service. Maintenance windows may occur.</p>
          </section>
          
          <section>
            <h2>8. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, 4Sight Education Ltd shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of FL4SH.</p>
          </section>
          
          <section>
            <h2>9. Refund Policy</h2>
            <p>Refunds are handled according to Apple App Store and Google Play Store policies. Generally, subscriptions are non-refundable, but you can cancel at any time to prevent future charges.</p>
          </section>
          
          <section>
            <h2>10. Changes to Terms</h2>
            <p>We may modify these Terms of Service at any time. We will notify users of material changes via email or in-app notification. Continued use of the Service after changes constitutes acceptance.</p>
          </section>
          
          <section>
            <h2>11. Governing Law</h2>
            <p>These Terms are governed by the laws of England and Wales. Any disputes will be resolved in the courts of England and Wales.</p>
          </section>
          
          <section>
            <h2>12. Contact Information</h2>
            <div className="contact-box">
              <p><strong>4Sight Education Ltd</strong></p>
              <p>Email: <a href="mailto:legal@fl4shcards.com">legal@fl4shcards.com</a></p>
              <p>Support: <a href="mailto:support@fl4shcards.com">support@fl4shcards.com</a></p>
              <p>Website: <a href="https://fl4shcards.com">fl4shcards.com</a></p>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

