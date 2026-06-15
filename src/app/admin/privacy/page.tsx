import React from 'react';
import AdminLayout from '../components/AdminLayout';

export default function PrivacyPage() {
  return (
    <AdminLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-700 text-slate-800 dark:text-white">Privacy Policy</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Last updated: 23 May 2026</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm prose prose-slate dark:prose-invert max-w-none text-sm">
          <p>Lakee e Shopping India Pvt Ltd is committed to protecting your privacy. This policy explains how we collect, use, and safeguard information when you use our Admin Portal.</p>
          <h3>1. Information We Collect</h3>
          <p>We collect information you provide directly, such as login credentials, profile details, and activity logs generated during your use of the portal.</p>
          <h3>2. How We Use Information</h3>
          <p>Information is used to authenticate users, provide portal functionality, generate audit logs, and improve our services. We do not sell personal information to third parties.</p>
          <h3>3. Data Security</h3>
          <p>We implement industry-standard security measures including encryption, secure token authentication, and access controls to protect your data.</p>
          <h3>4. Data Retention</h3>
          <p>We retain data for as long as necessary to provide services and comply with legal obligations. You may request deletion of your data by contacting our support team.</p>
          <h3>5. Contact</h3>
          <p>For privacy-related inquiries, contact us at privacy@lakeeshop.com.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
