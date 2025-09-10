
export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
            <h1 className="text-3xl font-bold font-headline text-primary">Privacy Policy</h1>
            <p className="text-muted-foreground mt-2">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        
        <div className="space-y-8 text-muted-foreground">
            <p>Welcome to TecoTransit. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about our policy, or our practices with regards to your personal information, please contact us at tecotransit@gmail.com.</p>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">1. WHAT INFORMATION DO WE COLLECT?</h2>
                <p>We collect personal information that you voluntarily provide to us when you make a booking on our website. The personal information we collect includes the following:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Personal Information:</strong> Name, email address, and phone number.</li>
                    <li><strong>Booking Information:</strong> Pickup location, destination, intended and alternative departure dates, vehicle type, and luggage count.</li>
                </ul>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">2. HOW DO WE USE YOUR INFORMATION?</h2>
                <p>We use the information we collect or receive for the following purposes:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>To facilitate the booking process.</strong> We use your information to process your booking requests, manage your trip, and communicate with you about your booking status.</li>
                    <li><strong>To send administrative information to you.</strong> We may use your personal information to send you service and new feature information and/or information about changes to our terms, conditions, and policies.</li>
                    <li><strong>To protect our Services.</strong> We may use your information as part of our efforts to keep our website safe and secure.</li>
                </ul>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">3. WILL YOUR INFORMATION BE SHARED WITH ANYONE?</h2>
                <p>We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. Your information is shared with our administrative team to confirm and manage your booking. We do not sell your personal information to third parties.</p>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">4. HOW LONG DO WE KEEP YOUR INFORMATION?</h2>
                <p>We will only keep your personal information for as long as it is necessary for the purposes set out in this privacy policy, unless a longer retention period is required or permitted by law (such as tax, accounting, or other legal requirements).</p>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">5. HOW DO WE KEEP YOUR INFORMATION SAFE?</h2>
                <p>We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure.</p>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">6. WHAT ARE YOUR PRIVACY RIGHTS?</h2>
                <p>In accordance with the Nigeria Data Protection Act (NDPA), you have certain rights regarding your personal data. These may include the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Request access and obtain a copy of your personal information.</li>
                    <li>Request correction of any inaccurate or incomplete data.</li>
                    <li>Request erasure of your personal data.</li>
                    <li>Withdraw your consent at any time.</li>
                </ul>
                <p>To make such a request, please use the contact details provided below.</p>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">7. HOW CAN YOU CONTACT US ABOUT THIS POLICY?</h2>
                <p>If you have questions or comments about this policy, you may email us at tecotransit@gmail.com or by post to:</p>
                <p className="pt-2">
                    <strong>TecoTransit</strong><br />
                    KM. 8.5, Afe Babalola Way<br />
                    Ado Ekiti, Nigeria
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
