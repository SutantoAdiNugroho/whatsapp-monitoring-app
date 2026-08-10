import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import SummaryView from './SummaryView';

async function getSummary(groupId: string, searchParams: any) {
  const params = new URLSearchParams();
  if (searchParams?.filter) params.append('filter', searchParams.filter);
  if (searchParams?.startDate) params.append('startDate', searchParams.startDate);
  if (searchParams?.endDate) params.append('endDate', searchParams.endDate);
  
  const res = await fetch(`https://wa-monitoring-be.rumahsiapkerja.com/api/summary/${groupId}?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) {
    return null;
  }
  return res.json();
}

export default async function SummaryPage({ params, searchParams }: { params: Promise<{ groupId: string }>, searchParams: Promise<any> }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const data = await getSummary(resolvedParams.groupId, resolvedSearchParams);

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8 flex flex-col items-center justify-center text-center">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Group Not Found</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Could not load summary data for this group.</p>
        <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { group, summary } = data;

  return <SummaryView group={group} summary={summary} currentFilter={resolvedSearchParams?.filter || 'all'} />;
}
