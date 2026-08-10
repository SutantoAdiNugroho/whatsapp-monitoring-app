import Link from 'next/link';
import { Users, Activity } from 'lucide-react';

async function getGroups() {
  const res = await fetch('http://localhost:3005/api/groups', { cache: 'no-store' });
  if (!res.ok) {
    return { groups: [] };
  }
  return res.json();
}

export default async function Home() {
  const { groups } = await getGroups();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 text-white">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">WhatsApp Monitor</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Monitoring {groups.length} active groups</p>
            </div>
          </div>
        </header>

        <main>
          {groups.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <Users size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No Groups Found</h3>
              <p className="text-gray-500 dark:text-gray-400">No monitored groups available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((group: any) => (
                <Link 
                  href={`/summary/${group.id}`} 
                  key={group.id}
                  className="group relative bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 ease-out hover:-translate-y-1"
                >
                  <div className="absolute top-4 right-4 text-gray-300 group-hover:text-blue-500 transition-colors">
                    <Users size={20} />
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2 pr-8 truncate">
                    {group.name || group.remoteJid}
                  </h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400 truncate w-full">
                      ID: {group.remoteJid}
                    </span>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
                      View Summary
                    </span>
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                      Active
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
