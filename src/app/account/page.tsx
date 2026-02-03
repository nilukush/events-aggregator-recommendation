/**
 * Account Page
 * Shows user profile, preferences link, and account options
 */

import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { AccountContent } from "./AccountContent";

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<AccountSkeleton />}>
          <AccountContent />
        </Suspense>
      </main>
    </div>
  );
}

function AccountSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="flex-1">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
