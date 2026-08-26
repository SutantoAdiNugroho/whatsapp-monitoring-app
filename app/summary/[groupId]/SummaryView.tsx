'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MessageCircle, AlertTriangle, HelpCircle, Activity, Users, UserMinus, History, Filter, TrendingUp, TrendingDown, Minus, RefreshCw, ThumbsUp, AlertCircle } from 'lucide-react';

const API_BASE = 'https://wa-monitoring-be.rumahsiapkerja.com';

function DateFormatter({ timestamp }: { timestamp: number }) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);
  if (!isClient) return <span className="text-xs text-gray-400">--</span>;
  return <span className="text-xs text-gray-400">{new Date(timestamp * 1000).toLocaleString()}</span>;
}

export default function SummaryView({ groupId }: { groupId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activePage, setActivePage] = useState(1);
  const [inactivePage, setInactivePage] = useState(1);
  const [chatPage, setChatPage] = useState(1);

  const [filterType, setFilterType] = useState(searchParams.get('filter') || 'all');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');

  const [group, setGroup] = useState<any>({});
  const [summary, setSummary] = useState<any>({});
  const [aiData, setAiData] = useState<any>(null);

  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'generating' | 'ready' | 'error'>('idle');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [aiLastUpdated, setAiLastUpdated] = useState<string | null>(null);

  const [showAddAction, setShowAddAction] = useState(false);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionDescription, setNewActionDescription] = useState('');

  const [showSentimentModal, setShowSentimentModal] = useState(false);
  const [sentimentFilter, setSentimentFilter] = useState<'positive' | 'negative' | 'neutral'>('positive');
  const [sentimentPage, setSentimentPage] = useState(1);

  const [chatSortOrder, setChatSortOrder] = useState<'desc' | 'asc'>('asc');
  const [selectedSenders, setSelectedSenders] = useState<string[]>([]);
  const [showSenderFilter, setShowSenderFilter] = useState(false);

  // Foster parent report state
  const [fosterParentReports, setFosterParentReports] = useState<any[]>([]);
  const [fosterParentStats, setFosterParentStats] = useState<any>(null);
  const [fosterParentPage, setFosterParentPage] = useState(1);
  const [isUpdatingFosterParent, setIsUpdatingFosterParent] = useState(false);
  const [fosterParentSearch, setFosterParentSearch] = useState('');
  const [filterActiveInAIIman, setFilterActiveInAIIman] = useState<'all' | 'yes' | 'no'>('all');
  const [filterActiveInGroup, setFilterActiveInGroup] = useState<'all' | 'yes' | 'no'>('all');

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const uniqueSenders: any[] = useMemo(() => {
    return Array.from(new Set((summary?.allMessages || []).map((m: any) => m.senderId)));
  }, [summary?.allMessages]);

  // Fetch stats (fast - DB only)
  useEffect(() => {
    const fetchStats = async () => {
      setIsLoadingStats(true);
      try {
        const params = new URLSearchParams();
        if (filterType) params.append('filter', filterType);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const res = await fetch(`${API_BASE}/api/summary/${groupId}/stats?${params.toString()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setGroup(data.group);
          setSummary((prev: any) => ({ ...prev, ...data.summary }));
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setIsLoadingStats(false);
      }
    };
    fetchStats();
  }, [groupId, filterType, startDate, endDate]);

  // Fetch AI summary from cache (non-blocking)
  const fetchAi = useCallback(async () => {
    setAiStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/api/summary/${groupId}/ai`, { cache: 'no-store' });
      if (!res.ok) { setAiStatus('error'); return; }
      const json = await res.json();

      if (json.status === 'generating') {
        setAiStatus('generating');
        startPolling();
      } else if (json.status === 'ready' && json.data) {
        setAiStatus('ready');
        applyAiData(json.data);
        stopPolling();
      }
    } catch (err) {
      console.error('Error fetching AI data:', err);
      setAiStatus('error');
    }
  }, [groupId]);

  useEffect(() => {
    fetchAi();
    return () => stopPolling();
  }, [groupId]);

  const applyAiData = (data: any) => {
    setAiData(data);
    setAiLastUpdated(data.lastUpdated || null);
    setSummary((prev: any) => ({
      ...prev,
      mainTopics: data.mainTopics || [],
      unansweredQuestions: data.unansweredQuestions || [],
      sentiment: data.sentiment,
      feedback: data.feedback || [],
      kendala: data.kendala || [],
      actionItems: {
        existing: prev.actionItems?.existing || [],
        suggested: data.suggestedActionItems || []
      }
    }));
  };

  const fetchFosterParentReports = useCallback(async (page = 1) => {
    try {
      const res = await fetch(`${API_BASE}/api/groups/${groupId}/foster-parent-report?page=${page}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setFosterParentReports(data.reports || []);
        setFosterParentStats(data.stats || null);
      }
    } catch (err) {
      console.error('Error fetching foster parent reports:', err);
    }
  }, [groupId]);

  const handleUpdateFosterParentReport = async () => {
    setIsUpdatingFosterParent(true);
    try {
      const res = await fetch(`${API_BASE}/api/groups/${groupId}/foster-parent-report/update`, {
        method: 'POST'
      });
      if (res.ok) {
        await fetchFosterParentReports();
      }
    } catch (err) {
      console.error('Error updating foster parent report:', err);
    } finally {
      setIsUpdatingFosterParent(false);
    }
  };

  useEffect(() => {
    fetchFosterParentReports(fosterParentPage);
  }, [fetchFosterParentReports, fosterParentPage]);

  const startPolling = () => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/summary/${groupId}/ai`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        if (json.status === 'ready' && json.data) {
          setAiStatus('ready');
          applyAiData(json.data);
          stopPolling();
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const handleRefreshAi = async () => {
    setIsRefreshing(true);
    setAiStatus('generating');
    stopPolling();
    try {
      await fetch(`${API_BASE}/api/summary/${groupId}/ai/refresh`, { method: 'POST' });
      startPolling();
    } catch (err) {
      console.error('Error triggering refresh:', err);
      setAiStatus('error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const itemsPerPage = 10;

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFilterType(val);
    if (val !== 'custom') router.push(`?filter=${val}`);
  };

  const applyCustomDate = () => {
    if (startDate && endDate) router.push(`?filter=custom&startDate=${startDate}&endDate=${endDate}`);
  };

  const handleAddAction = async () => {
    if (!newActionTitle.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/groups/${groupId}/action-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newActionTitle, description: newActionDescription || null })
      });
      if (res.ok) {
        const newAction = await res.json();
        setSummary((prev: any) => ({
          ...prev,
          actionItems: {
            existing: [newAction, ...(prev.actionItems?.existing || [])],
            suggested: (prev.actionItems?.suggested || []).filter((s: string) => s.toLowerCase() !== newActionTitle.toLowerCase())
          }
        }));
        setNewActionTitle('');
        setNewActionDescription('');
        setShowAddAction(false);
      }
    } catch (err) { console.error('Error creating action item:', err); }
  };

  const handleUpdateActionStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/action-items/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const updated = await res.json();
        setSummary((prev: any) => ({
          ...prev,
          actionItems: {
            ...prev.actionItems,
            existing: (prev.actionItems?.existing || []).map((a: any) => a.id === id ? updated : a)
          }
        }));
      }
    } catch (err) { console.error('Error updating action item:', err); }
  };

  const handleDeleteAction = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/action-items/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSummary((prev: any) => ({
          ...prev,
          actionItems: {
            ...prev.actionItems,
            existing: (prev.actionItems?.existing || []).filter((a: any) => a.id !== id)
          }
        }));
      }
    } catch (err) { console.error('Error deleting action item:', err); }
  };

  const isLoadingAi = aiStatus === 'loading' || aiStatus === 'generating';
  const activeUsers = (summary.activeUsers || []).sort((a: any, b: any) => (b.messageCount || 0) - (a.messageCount || 0));
  const inactiveUsers = summary.inactiveUsers || [];
  const paginatedActive = activeUsers.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);
  const paginatedInactive = inactiveUsers.slice((inactivePage - 1) * itemsPerPage, inactivePage * itemsPerPage);

  const renderPagination = (currentPage: number, totalItems: number, setPage: (p: number) => void) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;
    return (
      <div className="flex justify-between items-center mt-4">
        <button onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded disabled:opacity-50">Prev</button>
        <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
        <button onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded disabled:opacity-50">Next</button>
      </div>
    );
  };

  const AiStatusBadge = () => {
    if (aiStatus === 'generating') return (
      <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full border border-amber-200">
        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
        AI sedang memproses...
      </span>
    );
    if (aiStatus === 'ready' && aiLastUpdated) return (
      <span className="text-xs text-gray-400">Diperbarui: {new Date(aiLastUpdated).toLocaleString('id-ID')}</span>
    );
    if (aiStatus === 'error') return (
      <span className="text-xs text-red-500">Gagal memuat AI</span>
    );
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-6 group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Groups
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                {group?.name || group?.remoteJid || 'Loading...'}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                Chat Summary Report
                {isLoadingStats && <span className="flex items-center gap-1 text-xs text-green-600"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>Memuat data...</span>}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              {/* Date Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1"><Filter size={14}/> Filter</label>
                <select value={filterType} onChange={handleFilterChange} className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm rounded-lg p-2">
                  <option value="all">Selama ini</option>
                  <option value="today">Hari ini</option>
                  <option value="yesterday">Kemarin</option>
                  <option value="3days">3 hari yang lalu</option>
                  <option value="7days">7 hari yang lalu</option>
                  <option value="14days">2 minggu yang lalu</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              {filterType === 'custom' && (
                <div className="flex gap-2 items-end">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm rounded-lg p-2"/>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm rounded-lg p-2"/>
                  <button onClick={applyCustomDate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Apply</button>
                </div>
              )}
              {/* Total messages badge */}
              <div className="bg-white dark:bg-gray-900 px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-2 h-[42px]">
                <MessageCircle size={18} className="text-blue-500"/>
                <p className="text-base font-bold text-gray-900 dark:text-white leading-none">{summary.totalMessages || 0} <span className="text-xs text-gray-500 font-normal">Msgs</span></p>
              </div>
              {/* Refresh AI button */}
              <button
                onClick={handleRefreshAi}
                disabled={isRefreshing || aiStatus === 'generating'}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed h-[42px]"
                title="Update semua data AI"
              >
                <RefreshCw size={15} className={isRefreshing || aiStatus === 'generating' ? 'animate-spin' : ''} />
                Update AI
              </button>
            </div>
          </div>

          {/* AI Status bar */}
          <div className="mt-3 flex items-center gap-3">
            <AiStatusBadge />
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Main Topics */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col h-full lg:col-span-1">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-between gap-2 mb-6">
              <span className="flex items-center gap-2"><Activity className="text-green-500" size={20}/> Top 5 Topik Utama</span>
              {isLoadingAi && <div className="w-4 h-4 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>}
            </h2>
            <div className="flex-1 space-y-4">
              {isLoadingAi && !summary?.mainTopics?.length ? (
                Array.from({length: 3}).map((_, i) => (
                  <div key={i} className="flex gap-4 items-start animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full mt-2"></div>
                  </div>
                ))
              ) : (
                <>
                  {(summary?.mainTopics || []).map((topic: string, i: number) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 flex items-center justify-center shrink-0 font-bold text-sm">{i + 1}</div>
                      <p className="text-gray-700 dark:text-gray-300 pt-1 leading-relaxed">{topic}</p>
                    </div>
                  ))}
                  {!summary?.mainTopics?.length && <p className="text-gray-500 italic text-center py-4">Belum ada topik.</p>}
                </>
              )}
            </div>
          </section>

          {/* Sentiment */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col h-full lg:col-span-1">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {summary.sentiment?.overall === 'positive' && <TrendingUp className="text-green-500" size={20}/>}
                {summary.sentiment?.overall === 'negative' && <TrendingDown className="text-red-500" size={20}/>}
                {summary.sentiment?.overall === 'passive' && <Minus className="text-gray-500" size={20}/>}
                {(!summary.sentiment?.overall || summary.sentiment?.overall === 'neutral') && <Activity className="text-blue-500" size={20}/>}
                Sentimen Grup
              </h2>
              <button onClick={() => setShowSentimentModal(true)} disabled={!summary.sentiment} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">Detail</button>
            </div>
            {isLoadingAi ? (
              <div className="flex-1 space-y-4 animate-pulse">
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                  <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
                </div>
              </div>
            ) : (
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Positif</p>
                    <p className="text-xl font-bold text-green-600">{summary.sentiment?.details?.positiveCount || 0}</p>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Negatif</p>
                    <p className="text-xl font-bold text-red-600">{summary.sentiment?.details?.negativeCount || 0}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Netral</p>
                    <p className="text-xl font-bold text-gray-600">{summary.sentiment?.details?.neutralCount || 0}</p>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${
                    summary.sentiment?.overall === 'positive' ? 'bg-green-100 dark:bg-green-900/30' :
                    summary.sentiment?.overall === 'negative' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-50 dark:bg-blue-900/20'
                  }`}>
                    <p className="text-xs text-gray-500">Vibe</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-white capitalize">{summary.sentiment?.overall || '-'}</p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 space-y-1 pt-1">
                  <p>Emoji Positif: <strong>{summary.sentiment?.details?.emojiAnalysis?.positive ?? 0}</strong> · Negatif: <strong>{summary.sentiment?.details?.emojiAnalysis?.negative ?? 0}</strong></p>
                  <p>Kata Positif: <strong>{summary.sentiment?.details?.wordAnalysis?.positive ?? 0}</strong> · Negatif: <strong>{summary.sentiment?.details?.wordAnalysis?.negative ?? 0}</strong></p>
                  <p className="mt-1 italic">"{summary.sentiment?.details?.responsePattern || '–'}"</p>
                </div>
              </div>
            )}
          </section>

          {/* Unanswered Questions */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col h-full lg:col-span-1">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-between gap-2 mb-6">
              <span className="flex items-center gap-2"><HelpCircle className="text-orange-500" size={20}/> Pertanyaan Belum Terjawab</span>
              {isLoadingAi && <div className="w-4 h-4 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin"></div>}
            </h2>
            <div className="flex-1 space-y-3">
              {isLoadingAi && !summary?.unansweredQuestions?.length ? (
                Array.from({length: 2}).map((_, i) => <div key={i} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse h-14"></div>)
              ) : (
                <>
                  {(summary?.unansweredQuestions || []).map((q: string, i: number) => (
                    <div key={i} className="p-3 bg-orange-50/60 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-xl">
                      <p className="text-gray-800 dark:text-gray-200 text-sm">{q}</p>
                    </div>
                  ))}
                  {!summary?.unansweredQuestions?.length && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                      <p className="text-gray-500 text-sm">Semua pertanyaan sudah terjawab.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Feedback & Kendala */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Feedback */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <ThumbsUp className="text-teal-500" size={20}/> Feedback dari Percakapan
                {isLoadingAi && <div className="w-4 h-4 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin ml-auto"></div>}
              </h2>
              <div className="space-y-3 min-h-[120px]">
                {isLoadingAi && !summary?.feedback?.length ? (
                  Array.from({length: 2}).map((_, i) => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>)
                ) : (
                  <>
                    {(summary?.feedback || []).map((fb: string, i: number) => (
                      <div key={i} className="flex gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800/30 rounded-xl">
                        <div className="w-2 h-2 bg-teal-400 rounded-full mt-1.5 shrink-0"></div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm">{fb}</p>
                      </div>
                    ))}
                    {!summary?.feedback?.length && <p className="text-sm text-gray-500 italic">Belum ada feedback teridentifikasi.</p>}
                  </>
                )}
              </div>
            </div>

            {/* Kendala */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <AlertCircle className="text-rose-500" size={20}/> Kendala dalam Grup
                {isLoadingAi && <div className="w-4 h-4 border-2 border-gray-300 border-t-rose-500 rounded-full animate-spin ml-auto"></div>}
              </h2>
              <div className="space-y-3 min-h-[120px]">
                {isLoadingAi && !summary?.kendala?.length ? (
                  Array.from({length: 2}).map((_, i) => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>)
                ) : (
                  <>
                    {(summary?.kendala || []).map((k: string, i: number) => (
                      <div key={i} className="flex gap-3 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30 rounded-xl">
                        <div className="w-2 h-2 bg-rose-400 rounded-full mt-1.5 shrink-0"></div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm">{k}</p>
                      </div>
                    ))}
                    {!summary?.kendala?.length && <p className="text-sm text-gray-500 italic">Tidak ada kendala teridentifikasi.</p>}
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Foster Parent Conversation Report */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm md:col-span-2 lg:col-span-3">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="text-indigo-500" size={20}/> Foster Parent Conversation Report
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Total: {fosterParentStats?.totalFosterParents || 0} | 
                  Active in AI Iman: {fosterParentStats?.activeInGroup || 0} | 
                  Inactive in AI Iman: {fosterParentStats?.inactiveInGroup || 0}
                  {fosterParentStats?.lastUpdated && ` | Updated: ${new Date(fosterParentStats.lastUpdated).toLocaleString('id-ID')}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <input
                  type="text"
                  placeholder="Search by name, email, or whatsapp..."
                  value={fosterParentSearch}
                  onChange={(e) => setFosterParentSearch(e.target.value)}
                  className="flex-1 min-w-[200px] px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm rounded-lg"
                />
                <select
                  value={filterActiveInAIIman}
                  onChange={(e) => setFilterActiveInAIIman(e.target.value as 'all' | 'yes' | 'no')}
                  className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm rounded-lg"
                >
                  <option value="all">Active in AI Iman: All</option>
                  <option value="yes">Active in AI Iman: Yes</option>
                  <option value="no">Active in AI Iman: No</option>
                </select>
                <select
                  value={filterActiveInGroup}
                  onChange={(e) => setFilterActiveInGroup(e.target.value as 'all' | 'yes' | 'no')}
                  className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm rounded-lg"
                >
                  <option value="all">Active in Group: All</option>
                  <option value="yes">Active in Group: Yes</option>
                  <option value="no">Active in Group: No</option>
                </select>
                <button
                  onClick={handleUpdateFosterParentReport}
                  disabled={isUpdatingFosterParent}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <RefreshCw size={15} className={isUpdatingFosterParent ? 'animate-spin' : ''} />
                  Update Manual
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Nama</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">WhatsApp</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Umur</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Gender</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Active in AI Iman</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Messages to AI Iman</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Active in Group</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Group Messages</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Engagement Score</th>
                  </tr>
                </thead>
                <tbody>
                  {fosterParentReports.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-gray-500 italic">Belum ada data foster parent.</td>
                    </tr>
                  ) : (
                    fosterParentReports
                      .filter((report: any) => {
                        const searchLower = fosterParentSearch.toLowerCase();
                        const matchesSearch = (
                          report.fosterParentName?.toLowerCase().includes(searchLower) ||
                          report.fosterParentEmail?.toLowerCase().includes(searchLower) ||
                          report.fosterParentPhone?.includes(searchLower)
                        );
                        
                        const matchesActiveInAIIman = 
                          filterActiveInAIIman === 'all' ||
                          (filterActiveInAIIman === 'yes' && report.messageCount > 0) ||
                          (filterActiveInAIIman === 'no' && report.messageCount === 0);
                        
                        const matchesActiveInGroup = 
                          filterActiveInGroup === 'all' ||
                          (filterActiveInGroup === 'yes' && report.isActiveInGroup) ||
                          (filterActiveInGroup === 'no' && !report.isActiveInGroup);
                        
                        return matchesSearch && matchesActiveInAIIman && matchesActiveInGroup;
                      })
                      .sort((a: any, b: any) => (b.messageCount || 0) - (a.messageCount || 0))
                      .map((report: any, i: number) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{report.fosterParentName}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{report.fosterParentPhone}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{report.fosterParentEmail || '-'}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{report.fosterParentAge || '-'}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{report.fosterParentGender || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          {report.messageCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold">
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-semibold">
                              No
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400 font-semibold">{report.messageCount || 0}</td>
                        <td className="py-3 px-4 text-center">
                          {report.isActiveInGroup ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-semibold">
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs font-semibold">
                              No
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">{report.groupMessageCount || 0}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-semibold ${report.engagementScore >= 70 ? 'text-green-600' : report.engagementScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {report.engagementScore || 0}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination for foster parent reports */}
            {fosterParentStats && fosterParentStats.totalFosterParents > 10 && (
              <div className="flex justify-between items-center mt-4">
                <button 
                  onClick={() => setFosterParentPage(p => Math.max(1, p - 1))}
                  disabled={fosterParentPage === 1}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-500">
                  Page {fosterParentPage} of {Math.ceil(fosterParentStats.totalFosterParents / 10)}
                </span>
                <button 
                  onClick={() => setFosterParentPage(p => Math.min(Math.ceil(fosterParentStats.totalFosterParents / 10), p + 1))}
                  disabled={fosterParentPage >= Math.ceil(fosterParentStats.totalFosterParents / 10)}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </section>

          {/* Active & Inactive Users */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                <Users className="text-blue-500" size={20}/> Active Users in Group ({activeUsers.length})
              </h2>
              <p className="text-xs text-gray-500 mb-3">User yang aktif mengirim pesan</p>
              <div className="space-y-2 min-h-[280px]">
                {isLoadingStats ? (
                  Array.from({length: 5}).map((_, i) => (
                    <div key={i} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  ))
                ) : (
                  <>
                    {paginatedActive.map((u: any, i: number) => (
                      <div key={i} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-3">
                        {u.profilePicUrl ? (
                          <img src={u.profilePicUrl} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-blue-200"/>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-blue-700 font-bold">
                            {(u.name || u.phone || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white text-sm">{u.name || 'Unknown'} {u.phone ? `(${u.phone})` : ''}</span>
                          <p className="text-xs text-gray-500">{u.messageCount || 0} pesan</p>
                        </div>
                      </div>
                    ))}
                    {!activeUsers.length && <p className="text-sm text-gray-500 italic">Tidak ada active user.</p>}
                  </>
                )}
              </div>
              {renderPagination(activePage, activeUsers.length, setActivePage)}
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                <UserMinus className="text-gray-400" size={20}/> Inactive Users in Group ({inactiveUsers.length})
              </h2>
              <p className="text-xs text-gray-500 mb-3">User yang tidak mengirim pesan</p>
              <div className="space-y-2 min-h-[280px]">
                {isLoadingStats ? (
                  Array.from({length: 5}).map((_, i) => (
                    <div key={i} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  ))
                ) : (
                  <>
                    {inactiveUsers.map((u: any, i: number) => (
                      <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex items-center gap-3">
                        {u.profilePicUrl ? (
                          <img src={u.profilePicUrl} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-gray-200"/>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 font-bold">
                            {(u.name || u.phone || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">{u.name || 'Unknown'} {u.phone ? `(${u.phone})` : ''}</span>
                      </div>
                    ))}
                    {!inactiveUsers.length && <p className="text-sm text-gray-500 italic">Semua user aktif.</p>}
                  </>
                )}
              </div>
              {renderPagination(inactivePage, inactiveUsers.length, setInactivePage)}
            </div>
          </section>

          {/* Chat History */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm md:col-span-2 lg:col-span-3">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <History className="text-purple-500" size={20}/> Riwayat Percakapan
              </h2>
              <div className="flex gap-2">
                <select value={chatSortOrder} onChange={(e) => setChatSortOrder(e.target.value as 'desc' | 'asc')} className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm rounded-lg px-3 py-2">
                  <option value="asc">Terlama</option>
                  <option value="desc">Terbaru</option>
                </select>
                <button onClick={() => setShowSenderFilter(!showSenderFilter)} className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-sm rounded-lg hover:bg-gray-200">Filter Pengirim</button>
              </div>
            </div>

            {showSenderFilter && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {(uniqueSenders as any[]).map((senderId: string) => {
                    const msg = (summary.allMessages || []).find((m: any) => m.senderId === senderId);
                    return (
                      <label key={senderId} className="flex items-center gap-2 bg-white dark:bg-gray-900 px-3 py-1.5 rounded-lg border cursor-pointer text-sm">
                        <input type="checkbox" checked={selectedSenders.includes(senderId)} onChange={(e) => {
                          if (e.target.checked) setSelectedSenders([...selectedSenders, senderId]);
                          else setSelectedSenders(selectedSenders.filter(s => s !== senderId));
                        }} className="rounded"/>
                        {msg?.senderName || senderId.split('@')[0]}
                      </label>
                    );
                  })}
                </div>
                <button onClick={() => setSelectedSenders([])} className="text-xs text-gray-400 mt-2 hover:text-gray-600">Clear</button>
              </div>
            )}

            <div className="space-y-3 min-h-[300px]">
              {isLoadingStats ? (
                Array.from({length: 4}).map((_, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0"></div>
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    </div>
                  </div>
                ))
              ) : (() => {
                let msgs = summary.allMessages || [];
                if (selectedSenders.length > 0) msgs = msgs.filter((m: any) => selectedSenders.includes(m.senderId));
                if (chatSortOrder === 'desc') msgs = [...msgs].reverse();
                const paginated = msgs.slice((chatPage - 1) * itemsPerPage, chatPage * itemsPerPage);

                if (!paginated.length) return <p className="text-center py-8 text-gray-500 italic">Belum ada percakapan.</p>;

                return paginated.map((msg: any, i: number) => (
                  <div key={i} className="flex gap-3 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700/50">
                    {msg.profilePicUrl ? (
                      <img src={msg.profilePicUrl} alt={msg.senderName} className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5"/>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 font-bold shrink-0 mt-0.5">
                        {(msg.senderName || msg.phone || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm text-purple-600 dark:text-purple-400">{msg.senderName || 'Unknown'} {msg.phone ? `(${msg.phone})` : ''}</span>
                        <DateFormatter timestamp={msg.timestamp}/>
                      </div>
                      <p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap break-words">
                        {msg.text || <span className="italic text-gray-500">({msg.messageType})</span>}
                      </p>
                    </div>
                  </div>
                ));
              })()}
            </div>
            {(() => {
              let msgs = summary.allMessages || [];
              if (selectedSenders.length > 0) msgs = msgs.filter((m: any) => selectedSenders.includes(m.senderId));
              return renderPagination(chatPage, msgs.length, setChatPage);
            })()}
          </section>

          {/* Action Items */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm md:col-span-2 lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="text-blue-500" size={20}/> Action Items
                {isLoadingAi && <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin ml-1"></div>}
              </h2>
              <button onClick={() => { setShowAddAction(!showAddAction); if (!showAddAction) { setNewActionTitle(''); setNewActionDescription(''); }}} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                {showAddAction ? 'Cancel' : '+ Add Action'}
              </button>
            </div>

            {showAddAction && (
              <div className="mb-5 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <input type="text" placeholder="Action title..." value={newActionTitle} onChange={(e) => setNewActionTitle(e.target.value)} className="w-full mb-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"/>
                <textarea placeholder="Description (optional)..." value={newActionDescription} onChange={(e) => setNewActionDescription(e.target.value)} className="w-full mb-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm resize-none" rows={2}/>
                <button onClick={handleAddAction} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">Save Action Item</button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {((summary?.actionItems?.existing) || []).map((action: any) => (
                <div key={action.id} className={`flex gap-3 items-start p-4 rounded-xl border ${action.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/50'}`}>
                  <input type="checkbox" checked={action.status === 'completed'} onChange={(e) => handleUpdateActionStatus(action.id, e.target.checked ? 'completed' : 'pending')} className="mt-1.5 w-4 h-4 rounded text-blue-600 cursor-pointer"/>
                  <div className="flex-1">
                    <p className={`text-sm leading-relaxed ${action.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>{action.title}</p>
                    {action.description && <p className="text-xs text-gray-500 mt-1">{action.description}</p>}
                    {action.status === 'completed' && action.completedAt && (
                      <p className="text-xs text-green-600 mt-1 font-medium">Selesai: <DateFormatter timestamp={Math.floor(new Date(action.completedAt).getTime() / 1000)}/></p>
                    )}
                    <button onClick={() => handleDeleteAction(action.id)} className="text-xs text-red-500 hover:text-red-700 mt-2">Hapus</button>
                  </div>
                </div>
              ))}

              {((summary?.actionItems?.suggested) || []).map((suggestion: string, i: number) => (
                <div key={`sug-${i}`} className="flex gap-3 items-start p-4 rounded-xl border bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/30">
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded">AI Saran</span>
                    <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">{suggestion}</p>
                    <button onClick={() => { setNewActionTitle(suggestion); setNewActionDescription(''); setShowAddAction(true); }} className="text-xs font-semibold text-green-600 hover:text-green-800 px-2 py-1 bg-green-100 dark:bg-green-900/50 rounded mt-2">Create</button>
                  </div>
                </div>
              ))}

              {(!summary?.actionItems?.existing?.length && !summary?.actionItems?.suggested?.length && !isLoadingAi) && (
                <div className="col-span-full py-6 text-center text-gray-500 italic">Belum ada action items. Klik "+ Add Action" untuk membuat satu.</div>
              )}
            </div>
          </section>
        </main>
      </div>

      {/* Sentiment Detail Modal */}
      {showSentimentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Detail Sentimen – {sentimentFilter === 'positive' ? 'Positif' : sentimentFilter === 'negative' ? 'Negatif' : 'Netral'}</h3>
              <button onClick={() => setShowSentimentModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex gap-2">
              {(['positive', 'negative', 'neutral'] as const).map(type => (
                <button key={type} onClick={() => { setSentimentFilter(type); setSentimentPage(1); }} className={`px-4 py-2 rounded-lg text-sm capitalize ${sentimentFilter === type ? (type === 'positive' ? 'bg-green-600 text-white' : type === 'negative' ? 'bg-red-600 text-white' : 'bg-gray-600 text-white') : 'bg-gray-100 text-gray-700'}`}>
                  {type === 'positive' ? 'Positif' : type === 'negative' ? 'Negatif' : 'Netral'} ({summary.sentiment?.messages?.[type]?.length || 0})
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {(() => {
                const msgs = summary.sentiment?.messages?.[sentimentFilter] || [];
                const paginated = msgs.slice((sentimentPage - 1) * itemsPerPage, sentimentPage * itemsPerPage);
                if (!paginated.length) return <p className="text-center text-gray-500 italic py-8">Tidak ada pesan {sentimentFilter}.</p>;
                return paginated.map((msg: any, i: number) => (
                  <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex gap-3">
                      {msg.profilePicUrl ? (
                        <img src={msg.profilePicUrl} alt={msg.senderName} className="w-9 h-9 rounded-full object-cover"/>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                          {(msg.senderName || msg.phone || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-sm text-gray-900 dark:text-white">{msg.senderName || 'Unknown'} {msg.phone ? `(${msg.phone})` : ''}</span>
                          <DateFormatter timestamp={msg.timestamp}/>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm">{msg.text}</p>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <span className="text-sm text-gray-500">
                Page {sentimentPage} of {Math.ceil((summary.sentiment?.messages?.[sentimentFilter]?.length || 0) / itemsPerPage) || 1}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setSentimentPage(p => Math.max(1, p - 1))} disabled={sentimentPage === 1} className="px-3 py-1 bg-gray-100 rounded text-sm disabled:opacity-50">Prev</button>
                <button onClick={() => setSentimentPage(p => Math.min(Math.ceil((summary.sentiment?.messages?.[sentimentFilter]?.length || 0) / itemsPerPage), p + 1))} disabled={sentimentPage >= Math.ceil((summary.sentiment?.messages?.[sentimentFilter]?.length || 0) / itemsPerPage)} className="px-3 py-1 bg-gray-100 rounded text-sm disabled:opacity-50">Next</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
