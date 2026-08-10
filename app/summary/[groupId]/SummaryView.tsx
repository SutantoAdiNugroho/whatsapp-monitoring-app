'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MessageCircle, AlertTriangle, HelpCircle, Activity, Users, UserMinus, History, Filter, TrendingUp, TrendingDown, Minus } from 'lucide-react';

function DateFormatter({ timestamp }: { timestamp: number }) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <span className="text-xs text-gray-400">Loading...</span>;
  }

  return (
    <span className="text-xs text-gray-400">
      {new Date(timestamp * 1000).toLocaleString()}
    </span>
  );
}

export default function SummaryView({ group: initialGroup, summary: initialSummary, currentFilter }: { group: any, summary: any, currentFilter: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activePage, setActivePage] = useState(1);
  const [inactivePage, setInactivePage] = useState(1);
  const [chatPage, setChatPage] = useState(1);

  const [filterType, setFilterType] = useState(currentFilter || 'all');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');

  const [group, setGroup] = useState(initialGroup);
  const [summary, setSummary] = useState(initialSummary);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddAction, setShowAddAction] = useState(false);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionDescription, setNewActionDescription] = useState('');
  
  // Sentiment modal state
  const [showSentimentModal, setShowSentimentModal] = useState(false);
  const [sentimentFilter, setSentimentFilter] = useState<'positive' | 'negative' | 'neutral'>('positive');
  const [sentimentPage, setSentimentPage] = useState(1);
  
  // Chat history filter state
  const [chatSortOrder, setChatSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedSenders, setSelectedSenders] = useState<string[]>([]);
  const [showSenderFilter, setShowSenderFilter] = useState(false);

  const uniqueSenders: any[] = useMemo(() => {
    const arr = Array.from(new Set((summary?.allMessages || []).map((m: any) => m.senderId)));
    return arr;
  }, [summary?.allMessages]);

  // Real-time data fetching with polling
  useEffect(() => {
    const groupId = initialGroup.id; // Use initial ID to avoid dependency issues
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (filterType) params.append('filter', filterType);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        const res = await fetch(`https://wa-monitoring-be.rumahsiapkerja.com/api/summary/${groupId}?${params.toString()}`, { 
          cache: 'no-store' 
        });
        if (res.ok) {
          const data = await res.json();
          setGroup(data.group);
          setSummary(data.summary);
        }
      } catch (error) {
        console.error('Error fetching real-time data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Poll every 30 minutes
    const interval = setInterval(fetchData, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [initialGroup.id, filterType, startDate, endDate]);

  const itemsPerPage = 10;

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFilterType(val);
    if (val !== 'custom') {
      router.push(`?filter=${val}`);
    }
  };

  const applyCustomDate = () => {
    if (startDate && endDate) {
      router.push(`?filter=custom&startDate=${startDate}&endDate=${endDate}`);
    }
  };

  const handleAddAction = async (title?: string, description?: string) => {
    const actionTitle = title || newActionTitle;
    if (!actionTitle.trim()) return;
    
    try {
      const res = await fetch(`https://wa-monitoring-be.rumahsiapkerja.com/api/groups/${group.id}/action-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: actionTitle,
          description: description || newActionDescription || null
        })
      });
      
      if (res.ok) {
        const newAction = await res.json();
        setSummary({
          ...summary,
          actionItems: {
            ...(summary.actionItems || { existing: [], suggested: [] }),
            existing: [newAction, ...(summary.actionItems?.existing || [])],
            suggested: (summary.actionItems?.suggested || []).filter((s: string) => s.toLowerCase() !== actionTitle.toLowerCase())
          }
        });
        setNewActionTitle('');
        setNewActionDescription('');
        setShowAddAction(false);
      }
    } catch (error) {
      console.error('Error creating action item:', error);
    }
  };

  const handleUpdateActionStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`https://wa-monitoring-be.rumahsiapkerja.com/api/action-items/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (res.ok) {
        const updatedAction = await res.json();
        setSummary({
          ...summary,
          actionItems: {
            ...(summary.actionItems || { existing: [], suggested: [] }),
            existing: (summary.actionItems?.existing || []).map((a: any) => a.id === id ? updatedAction : a)
          }
        });
      }
    } catch (error) {
      console.error('Error updating action item:', error);
    }
  };

  const handleDeleteAction = async (id: string) => {
    try {
      const res = await fetch(`https://wa-monitoring-be.rumahsiapkerja.com/api/action-items/${id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setSummary({
          ...summary,
          actionItems: {
            ...(summary.actionItems || { existing: [], suggested: [] }),
            existing: (summary.actionItems?.existing || []).filter((a: any) => a.id !== id)
          }
        });
      }
    } catch (error) {
      console.error('Error deleting action item:', error);
    }
  };

  // Pagination Logic
  const activeUsers = summary.activeUsers || [];
  const inactiveUsers = summary.inactiveUsers || [];
  const allMessages = summary.allMessages || [];

  const paginatedActive = activeUsers.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);
  const paginatedInactive = inactiveUsers.slice((inactivePage - 1) * itemsPerPage, inactivePage * itemsPerPage);
  const paginatedChat = allMessages.slice((chatPage - 1) * itemsPerPage, chatPage * itemsPerPage);

  const renderPagination = (currentPage: number, totalItems: number, setPage: (p: number) => void) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;
    return (
      <div className="flex justify-between items-center mt-4">
        <button 
          onClick={() => setPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded disabled:opacity-50"
        >
          Prev
        </button>
        <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
        <button 
          onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-6 group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Groups
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{group.name || group.remoteJid}</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                Chat Summary Report
                {isLoading && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Updating...
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1">
                  <Filter size={14}/> Date Filter
                </label>
                <select 
                  value={filterType} 
                  onChange={handleFilterChange}
                  className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                >
                  <option value="all">Selama ini</option>
                  <option value="today">Hari ini</option>
                  <option value="yesterday">Kemarin</option>
                  <option value="3days">3 hari yang lalu</option>
                  <option value="7days">7 hari yang lalu</option>
                  <option value="14days">2 minggu yang lalu</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {filterType === 'custom' && (
                <div className="flex gap-2 items-end">
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg p-2"
                  />
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg p-2"
                  />
                  <button onClick={applyCustomDate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                    Apply
                  </button>
                </div>
              )}

              <div className="bg-white dark:bg-gray-900 px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-3 h-[42px]">
                <div className="text-blue-600">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{summary.totalMessages} <span className="text-xs text-gray-500 font-normal">Msgs</span></p>
                </div>
                {isLoading && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2" title="Updating..."></div>
                )}
              </div>

              {/* Sentiment Indicator */}
              <div className={`px-4 py-2 rounded-xl border shadow-sm flex items-center gap-3 h-[42px] ${
                summary.sentiment?.overall === 'positive' 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50' 
                  : summary.sentiment?.overall === 'negative'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50'
                  : summary.sentiment?.overall === 'passive'
                  ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50'
              }`}>
                <div className={
                  summary.sentiment?.overall === 'positive' 
                    ? 'text-green-600' 
                    : summary.sentiment?.overall === 'negative'
                    ? 'text-red-600'
                    : summary.sentiment?.overall === 'passive'
                    ? 'text-gray-600'
                    : 'text-blue-600'
                }>
                  {summary.sentiment?.overall === 'positive' && <TrendingUp size={20} />}
                  {summary.sentiment?.overall === 'negative' && <TrendingDown size={20} />}
                  {summary.sentiment?.overall === 'passive' && <Minus size={20} />}
                  {summary.sentiment?.overall === 'neutral' && <Activity size={20} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white leading-none capitalize">
                    {summary.sentiment?.overall || 'Neutral'} Vibe
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Main Topics */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col h-full lg:col-span-1">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
              <Activity className="text-green-500" size={20} /> Top 5 Topik Utama
            </h2>
            <div className="flex-1 space-y-4">
              {(summary?.mainTopics || []).map((topic: string, i: number) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 flex items-center justify-center shrink-0 font-bold text-sm">
                    {i + 1}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 pt-1 leading-relaxed">{topic}</p>
                </div>
              ))}
              {(summary?.mainTopics || []).length === 0 && (
                <p className="text-gray-500 italic text-center py-4">No main topics identified.</p>
              )}
            </div>
          </section>

          {/* Sentiment Analysis */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col h-full lg:col-span-1">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {summary.sentiment?.overall === 'positive' && <TrendingUp className="text-green-500" size={20} />}
                {summary.sentiment?.overall === 'negative' && <TrendingDown className="text-red-500" size={20} />}
                {summary.sentiment?.overall === 'passive' && <Minus className="text-gray-500" size={20} />}
                {summary.sentiment?.overall === 'neutral' && <Activity className="text-blue-500" size={20} />}
                Sentimen Grup
              </h2>
              <button 
                onClick={() => setShowSentimentModal(true)}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Detail
              </button>
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Positif</p>
                  <p className="text-lg font-bold text-green-600">{summary.sentiment?.details?.positiveCount || 0}</p>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Negatif</p>
                  <p className="text-lg font-bold text-red-600">{summary.sentiment?.details?.negativeCount || 0}</p>
                </div>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Emoji Positif: {summary.sentiment?.details?.emojiAnalysis?.positive || 0}</p>
                <p>Emoji Negatif: {summary.sentiment?.details?.emojiAnalysis?.negative || 0}</p>
                <p>Kata Positif: {summary.sentiment?.details?.wordAnalysis?.positive || 0}</p>
                <p>Kata Negatif: {summary.sentiment?.details?.wordAnalysis?.negative || 0}</p>
                <p>Pattern: {summary.sentiment?.details?.responsePattern || 'unknown'}</p>
              </div>
            </div>
          </section>

          {/* Unanswered Questions */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col h-full lg:col-span-1">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
              <HelpCircle className="text-orange-500" size={20} /> Pertanyaan Belum Terjawab
            </h2>
            <div className="flex-1 space-y-4">
              {(summary?.unansweredQuestions || []).map((q: string, i: number) => (
                <div key={i} className="p-4 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-xl">
                  <p className="text-gray-800 dark:text-gray-200">{q}</p>
                </div>
              ))}
              {(summary?.unansweredQuestions || []).length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <p className="text-gray-500 font-medium">All clear!</p>
                  <p className="text-sm text-gray-400">No unanswered questions found.</p>
                </div>
              )}
            </div>
          </section>

          {/* User Stats */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <Users className="text-blue-500" size={20} /> Active Users ({activeUsers.length})
              </h2>
              <p className="text-xs text-gray-500 mb-3">Users who sent messages in the selected time period</p>
              <div className="space-y-2 pr-2 min-h-[300px]">
                {paginatedActive.map((u: any, i: number) => (
                  <div key={i} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-3">
                    {u.profilePicUrl ? (
                      <img src={u.profilePicUrl} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-blue-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold">
                        {(u.name || u.phone || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">
                        {u.name || 'Unknown'} {u.phone ? `(${u.phone})` : ''}
                      </span>
                      <span className="text-xs text-gray-500">
                        {u.messageCount || 0} message{u.messageCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))}
                {activeUsers.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No active users found.</p>
                )}
              </div>
              {renderPagination(activePage, activeUsers.length, setActivePage)}
            </div>
            
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <UserMinus className="text-gray-400" size={20} /> Inactive Users ({inactiveUsers.length})
              </h2>
              <p className="text-xs text-gray-500 mb-3">Users who haven't sent messages in the selected time period</p>
              <div className="space-y-2 pr-2 min-h-[300px]">
                {paginatedInactive.map((u: any, i: number) => (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex items-center gap-3">
                    {u.profilePicUrl ? (
                      <img src={u.profilePicUrl} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 font-bold">
                        {(u.name || u.phone || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                        {u.name || 'Unknown'} {u.phone ? `(${u.phone})` : ''}
                      </span>
                    </div>
                  </div>
                ))}
                {inactiveUsers.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No inactive users found.</p>
                )}
              </div>
              {renderPagination(inactivePage, inactiveUsers.length, setInactivePage)}
            </div>
          </section>

          {/* Chat History */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm md:col-span-2 lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <History className="text-purple-500" size={20} /> Riwayat Percakapan
              </h2>
              <div className="flex gap-2">
                <select
                  value={chatSortOrder}
                  onChange={(e) => setChatSortOrder(e.target.value as 'desc' | 'asc')}
                  className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2"
                >
                  <option value="desc">Terbaru</option>
                  <option value="asc">Terlama</option>
                </select>
                <button
                  onClick={() => setShowSenderFilter(!showSenderFilter)}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Filter Pengirim
                </button>
              </div>
            </div>
            
            {showSenderFilter && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {(uniqueSenders as any).map((senderId: string) => {
                    const sender = (summary.allMessages || []).find((m: any) => m.senderId === senderId);
                    const name = sender?.senderName || sender?.phone || senderId;
                    return (
                      <label key={senderId} className="flex items-center gap-2 bg-white dark:bg-gray-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSenders.includes(senderId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSenders([...selectedSenders, senderId]);
                            } else {
                              setSelectedSenders(selectedSenders.filter(s => s !== senderId));
                            }
                          }}
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{name}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setSelectedSenders([])}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setSelectedSenders(Array.from(new Set(summary.allMessages.map((m: any) => m.senderId))))}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Select All
                  </button>
                </div>
              </div>
            )}
            
            <div className="space-y-4 pr-4 min-h-[400px]">
              {(() => {
                let filteredMessages = summary.allMessages || [];
                
                // Apply sender filter
                if (selectedSenders.length > 0) {
                  filteredMessages = filteredMessages.filter((m: any) => selectedSenders.includes(m.senderId));
                }
                
                // Apply sort
                if (chatSortOrder === 'asc') {
                  filteredMessages = [...filteredMessages].reverse();
                }
                
                // Apply pagination
                const paginatedFiltered = filteredMessages.slice((chatPage - 1) * itemsPerPage, chatPage * itemsPerPage);
                
                return paginatedFiltered.map((msg: any, i: number) => (
                <div key={i} className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700/50">
                  {msg.profilePicUrl ? (
                    <img src={msg.profilePicUrl} alt={msg.senderName} className="w-10 h-10 rounded-full object-cover shrink-0 mt-1" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 font-bold shrink-0 mt-1">
                      {(msg.senderName || msg.phone || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <span className="font-semibold text-sm text-purple-600 dark:text-purple-400 mr-2">
                          {msg.senderName || 'Unknown'} {msg.phone ? `(${msg.phone})` : ''}
                        </span>
                      </div>
                      <DateFormatter timestamp={msg.timestamp} />
                    </div>
                    <p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap">
                      {msg.text || <span className="italic text-gray-500">({msg.messageType})</span>}
                    </p>
                  </div>
                </div>
              ));
              })()}
              {(() => {
                let filteredMessages = summary.allMessages || [];
                if (selectedSenders.length > 0) {
                  filteredMessages = filteredMessages.filter((m: any) => selectedSenders.includes(m.senderId));
                }
                if (filteredMessages.length === 0) {
                  return <p className="text-center py-8 text-gray-500 italic">Belum ada percakapan.</p>;
                }
                return null;
              })()}
            </div>
            {(() => {
              let filteredMessages = summary.allMessages || [];
              if (selectedSenders.length > 0) {
                filteredMessages = filteredMessages.filter((m: any) => selectedSenders.includes(m.senderId));
              }
              return renderPagination(chatPage, filteredMessages.length, setChatPage);
            })()}
          </section>

          {/* Action Items - Moved to bottom */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm md:col-span-2 lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="text-blue-500" size={20} /> Action Items
              </h2>
              <button 
                onClick={() => setShowAddAction(!showAddAction)}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                {showAddAction ? 'Cancel' : '+ Add Action'}
              </button>
            </div>
            
            {showAddAction && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  placeholder="Action title..."
                  value={newActionTitle}
                  onChange={(e) => setNewActionTitle(e.target.value)}
                  className="w-full mb-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
                />
                <textarea
                  placeholder="Description (optional)..."
                  value={newActionDescription}
                  onChange={(e) => setNewActionDescription(e.target.value)}
                  className="w-full mb-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm resize-none"
                  rows={2}
                />
                  <button
                    onClick={() => { handleAddAction(); }}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Add Action Item
                  </button>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {((summary?.actionItems?.existing) || []).map((action: any) => (
                <div key={action.id} className={`flex gap-3 items-start p-4 rounded-xl border ${
                  action.status === 'completed' 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50' 
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/50'
                }`}>
                  <input 
                    type="checkbox" 
                    checked={action.status === 'completed'}
                    onChange={(e) => handleUpdateActionStatus(action.id, e.target.checked ? 'completed' : 'pending')}
                    className="mt-1.5 w-4 h-4 rounded text-blue-600 bg-white border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className={`text-sm leading-relaxed ${
                      action.status === 'completed' 
                        ? 'text-gray-500 dark:text-gray-400 line-through' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>{action.title}</p>
                    {action.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{action.description}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleDeleteAction(action.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* AI suggested action items (strings) */}
              {((summary?.actionItems?.suggested) || []).map((suggestion: string, i: number) => (
                <div key={`suggested-${i}`} className={`flex gap-3 items-start p-4 rounded-xl border bg-yellow-50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-800/30`}>
                  <div className="flex-1">
                    <p className={`text-sm leading-relaxed text-gray-800 dark:text-gray-200`}>{suggestion}</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => { handleAddAction(suggestion, ''); }}
                        className="text-xs text-green-600 hover:text-green-800"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {(((summary?.actionItems?.existing) || []).length === 0 && ((summary?.actionItems?.suggested) || []).length === 0) && (
                <div className="col-span-full py-6 text-center text-gray-500 italic">
                  No action items yet. Click "+ Add Action" to create one.
                </div>
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
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Detail Sentimen {sentimentFilter === 'positive' ? 'Positif' : sentimentFilter === 'negative' ? 'Negatif' : 'Netral'}
              </h3>
              <button 
                onClick={() => setShowSentimentModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex gap-2">
              <button
                onClick={() => { setSentimentFilter('positive'); setSentimentPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm ${sentimentFilter === 'positive' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              >
                Positif ({summary.sentiment?.messages?.positive?.length || 0})
              </button>
              <button
                onClick={() => { setSentimentFilter('negative'); setSentimentPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm ${sentimentFilter === 'negative' ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              >
                Negatif ({summary.sentiment?.messages?.negative?.length || 0})
              </button>
              <button
                onClick={() => { setSentimentFilter('neutral'); setSentimentPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm ${sentimentFilter === 'neutral' ? 'bg-gray-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              >
                Netral ({summary.sentiment?.messages?.neutral?.length || 0})
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {(() => {
                  const messages = summary.sentiment?.messages?.[sentimentFilter] || [];
                  const itemsPerPage = 10;
                  const totalPages = Math.ceil(messages.length / itemsPerPage);
                  const paginatedMessages = messages.slice((sentimentPage - 1) * itemsPerPage, sentimentPage * itemsPerPage);
                  
                  return paginatedMessages.map((msg: any, i: number) => (
                    <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="flex gap-3">
                        {msg.profilePicUrl ? (
                          <img src={msg.profilePicUrl} alt={msg.senderName} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 font-bold">
                            {(msg.senderName || msg.phone || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-sm text-gray-900 dark:text-white">
                              {msg.senderName || 'Unknown'} {msg.phone ? `(${msg.phone})` : ''}
                            </span>
                            <DateFormatter timestamp={msg.timestamp} />
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 text-sm">{msg.text}</p>
                          <div className="mt-2 text-xs text-gray-500">
                            Score: {msg.sentimentScore?.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <span className="text-sm text-gray-500">
                Page {sentimentPage} of {Math.ceil((summary.sentiment?.messages?.[sentimentFilter]?.length || 0) / 10)}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSentimentPage(Math.max(1, sentimentPage - 1))}
                  disabled={sentimentPage === 1}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => setSentimentPage(Math.min(Math.ceil((summary.sentiment?.messages?.[sentimentFilter]?.length || 0) / 10), sentimentPage + 1))}
                  disabled={sentimentPage >= Math.ceil((summary.sentiment?.messages?.[sentimentFilter]?.length || 0) / 10)}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
