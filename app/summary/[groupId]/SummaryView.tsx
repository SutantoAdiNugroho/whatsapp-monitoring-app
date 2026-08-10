'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MessageCircle, AlertTriangle, HelpCircle, Activity, Users, UserMinus, History, Filter } from 'lucide-react';

export default function SummaryView({ group, summary, currentFilter }: { group: any, summary: any, currentFilter: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activePage, setActivePage] = useState(1);
  const [inactivePage, setInactivePage] = useState(1);
  const [chatPage, setChatPage] = useState(1);

  const [filterType, setFilterType] = useState(currentFilter || 'all');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');

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
              <p className="text-gray-500 dark:text-gray-400 mt-1">Chat Summary Report</p>
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
              </div>
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Main Topics */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col h-full">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
              <Activity className="text-green-500" size={20} /> Topik Utama
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

          {/* Unanswered Questions */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col h-full">
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
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <Users className="text-blue-500" size={20} /> Active Users ({activeUsers.length})
              </h2>
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
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm md:col-span-2">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
              <History className="text-purple-500" size={20} /> Riwayat Percakapan
            </h2>
            <div className="space-y-4 pr-4 min-h-[400px]">
              {paginatedChat.map((msg: any, i: number) => (
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
                      <span className="text-xs text-gray-400">
                        {new Date(msg.timestamp * 1000).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap">
                      {msg.text || <span className="italic text-gray-500">({msg.messageType})</span>}
                    </p>
                  </div>
                </div>
              ))}
              {allMessages.length === 0 && (
                <p className="text-center py-8 text-gray-500 italic">Belum ada percakapan.</p>
              )}
            </div>
            {renderPagination(chatPage, allMessages.length, setChatPage)}
          </section>

          {/* Action Items - Moved to bottom */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm md:col-span-2">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
              <AlertTriangle className="text-blue-500" size={20} /> Action Items
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(summary?.actionItems || []).map((action: string, i: number) => (
                <div key={i} className="flex gap-3 items-start p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
                  <input type="checkbox" className="mt-1.5 w-4 h-4 rounded text-blue-600 bg-white border-gray-300 focus:ring-blue-500" disabled />
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{action}</p>
                </div>
              ))}
              {(summary?.actionItems || []).length === 0 && (
                <div className="col-span-full py-6 text-center text-gray-500 italic">
                  No action items identified.
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
