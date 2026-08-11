import SummaryView from './SummaryView';

export default async function SummaryPage({ params }: { params: Promise<{ groupId: string }> }) {
  const resolvedParams = await params;
  return <SummaryView groupId={resolvedParams.groupId} />;
}
