import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans p-8">
      <div className="max-w-4xl mx-auto bg-white p-12 rounded-3xl shadow-sm border border-slate-100">
        <Link to="/" className="text-indigo-600 font-bold mb-8 block">&larr; Back to Home</Link>
        <h1 className="text-4xl font-black text-slate-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">1. Introduction</h2>
          <p>
            At OminiCSR, we take your privacy seriously. This Privacy Policy explains how
            we collect, use, disclose, and safeguard your information when you visit our Platform.
          </p>

          <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">2. Information Collection</h2>
          <p>
            We may collect information about you in a variety of ways, including personal data like your name,
            email address, and business information, as well as usage data when you interact with our platform.
          </p>

          <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">3. Use of Information</h2>
          <p>
            We use the information we collect to provide, maintain, and improve our services, 
            to communicate with you, and to ensure the security and integrity of our platform.
          </p>

          <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">4. Disclosure</h2>
          <p>
            We do not share your personal information with third parties except as necessary to provide
            our services or as required by law.
          </p>
          
          <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">5. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at support@ominicsr.com.
          </p>
        </div>
      </div>
    </div>
  );
}
