import React from 'react';
import AdminLayout from '../components/AdminLayout';

export default function TermsPage() {
  return (
    <AdminLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-700 text-slate-800 dark:text-white">Terms &amp; Conditions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Last updated: 23 May 2026</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm prose prose-slate dark:prose-invert max-w-none text-sm">
          <p>By accessing and using the Lakee e Shopping Admin Portal, you agree to be bound by these Terms and Conditions. These terms govern your use of the platform and all associated services provided by Lakee e Shopping India Pvt Ltd.</p>
          <h3>1. Authorized Use</h3>
          <p>Access to this portal is restricted to authorized personnel only. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.</p>
          <h3>2. Data Privacy</h3>
          <p>All data accessed through this portal is confidential and proprietary. You must not share, export, or disclose any data to unauthorized parties.</p>
          <h3>3. Compliance</h3>
          <p>Users must comply with all applicable laws and regulations, including but not limited to data protection laws, GST regulations, and e-commerce guidelines.</p>
          <h3>4. Limitation of Liability</h3>
          <p>Lakee e Shopping India Pvt Ltd shall not be liable for any indirect, incidental, or consequential damages arising from the use of this portal.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
