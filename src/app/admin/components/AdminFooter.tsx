import React from 'react';
import Link from 'next/link';

export default function AdminFooter() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
      <p className="text-xs text-slate-400 dark:text-slate-500">
        © 2026 Lakee e Shopping India Pvt Ltd. All rights reserved.
      </p>
      <div className="flex items-center gap-4">
        <Link href="/admin/terms" className="text-xs text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          Terms &amp; Conditions
        </Link>
        <Link href="/admin/privacy" className="text-xs text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
