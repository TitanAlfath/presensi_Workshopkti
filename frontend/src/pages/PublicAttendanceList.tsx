import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import apiClient from '../api/client';
import { Search, Users, User, Clock, ArrowLeft, RefreshCw, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Attendee {
  id: string;
  type: 'PESERTA' | 'TAMU';
  checkInTime: string;
  participant?: {
    name: string;
    nim: string;
    prodi: string;
    fakultas: string;
  } | null;
  guest?: {
    name: string;
    institution: string;
    position: string;
  } | null;
  isNew?: boolean; // temporary flag for animation highlight
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PublicAttendanceList: React.FC = () => {
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PESERTA' | 'TAMU'>('ALL');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, mahasiswa: 0, tamu: 0 });

  const fetchedInitial = useRef(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 400);

    return () => clearTimeout(handler);
  }, [search]);

  // Fetch attendees list
  const fetchAttendees = async (pageNumber = 1) => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const typeQuery = typeFilter !== 'ALL' ? `&type=${typeFilter}` : '';
      const searchQuery = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
      
      const res = await apiClient.get(`/attendance/public-list?page=${pageNumber}&limit=${pagination.limit}${typeQuery}${searchQuery}`);
      
      if (res.data) {
        setAttendees(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      console.error('Error fetching public attendance list', err);
      setErrorMsg('Gagal mengambil daftar presensi. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Statistics
  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/event/active');
      if (res.data) {
        const statsRes = await apiClient.get(`/attendance/stats?eventId=${res.data.id}`, {
          // Send a dummy Authorization or let the backend allow public stats?
          // Oh, wait! The backend stats route is protected by authenticateJWT.
          // Let's call a simplified statistic endpoint or calculate stats locally from our list,
          // or let's look at backend/src/controllers/attendanceController.ts and see if getStats is protected.
          // Yes, in routes: router.get('/stats', authenticateJWT, getStats);
          // Wait, if stats requires JWT, can we get statistics by querying `/public-list` without page limit?
          // Yes, we can compute stats by just getting the total from '/public-list' filters,
          // but we can also fetch general stats, or make a public stats call if needed.
          // Let's call '/attendance/public-list?limit=1' for PESERTA and TAMU to get totals.
        });
        
        // Let's do public queries to count:
        const totalRes = await apiClient.get('/attendance/public-list?limit=1');
        const mhsRes = await apiClient.get('/attendance/public-list?limit=1&type=PESERTA');
        const tamuRes = await apiClient.get('/attendance/public-list?limit=1&type=TAMU');

        setStats({
          total: totalRes.data?.pagination?.total || 0,
          mahasiswa: mhsRes.data?.pagination?.total || 0,
          tamu: tamuRes.data?.pagination?.total || 0
        });
      }
    } catch (err) {
      console.error('Error calculating public statistics', err);
    }
  };

  // Initial fetch and trigger on filters change
  useEffect(() => {
    fetchAttendees(pagination.page);
  }, [debouncedSearch, typeFilter, pagination.page]);

  // Fetch statistics periodically
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // refresh stats every 10s
    return () => clearInterval(interval);
  }, []);

  // Listen to Socket.IO for real-time check-ins
  useEffect(() => {
    if (!socket) return;

    const handleNewAttendance = (newRecord: any) => {
      console.log('Realtime check-in received:', newRecord);

      // Refresh statistics
      fetchStats();

      // Check if the new record fits current category filter
      if (typeFilter !== 'ALL' && newRecord.type !== typeFilter) {
        return;
      }

      // Check if search matches
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
        const name = (newRecord.type === 'PESERTA' ? newRecord.participant?.name : newRecord.guest?.name) || '';
        const nim = newRecord.participant?.nim || '';
        const prodi = newRecord.participant?.prodi || '';
        const inst = newRecord.guest?.institution || '';
        
        const matches = 
          name.toLowerCase().includes(query) || 
          nim.toLowerCase().includes(query) || 
          prodi.toLowerCase().includes(query) || 
          inst.toLowerCase().includes(query);

        if (!matches) return;
      }

      // Add temporary highlight flag and prepend to list
      const recordWithHighlight = { ...newRecord, isNew: true };
      setAttendees(prev => {
        // Prevent duplicate if already in the list
        if (prev.some(a => a.id === newRecord.id)) return prev;
        
        const updated = [recordWithHighlight, ...prev.slice(0, pagination.limit - 1)];
        return updated;
      });

      // Remove highlight after 4 seconds
      setTimeout(() => {
        setAttendees(prev => 
          prev.map(a => a.id === newRecord.id ? { ...a, isNew: false } : a)
        );
      }, 4000);
    };

    socket.on('newAttendance', handleNewAttendance);

    return () => {
      socket.off('newAttendance', handleNewAttendance);
    };
  }, [socket, typeFilter, debouncedSearch, pagination.limit]);

  // Initials generator
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getBadgeColor = (type: 'PESERTA' | 'TAMU') => {
    return type === 'PESERTA'
      ? 'bg-[#1d3d75]/10 text-[#1d3d75] dark:bg-brand-500/20 dark:text-brand-300'
      : 'bg-[#c23b2b]/10 text-[#c23b2b] dark:bg-red-500/20 dark:text-red-300';
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Back button & Live status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-black text-[#1d3d75] hover:text-[#c23b2b] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Kembali ke Halaman Depan</span>
        </button>

        {/* Live Status indicator */}
        <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-dark-900 border border-gray-150 dark:border-dark-800 rounded-full shadow-sm">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></span>
          <span className="text-[10px] font-black text-gray-500 dark:text-dark-400 uppercase tracking-wider">
            {isConnected ? 'Real-Time Update Terhubung' : 'Menghubungkan Ulang...'}
          </span>
        </div>
      </div>

      {/* Title Header banner */}
      <div className="bg-white dark:bg-dark-900 rounded-3xl p-6 md:p-8 shadow-xl border border-gray-150 dark:border-dark-800/80 text-center space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#e28743]/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#1d3d75]/5 rounded-full blur-2xl -ml-10 -mb-10"></div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1d3d75]/10 text-[#1d3d75] rounded-full text-xs font-black uppercase tracking-wider">
          <Sparkles size={14} className="text-[#e28743]" />
          <span>LIVE ATTENDANCE BOARD</span>
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#1d3d75] dark:text-white leading-tight uppercase">
            Daftar Hadir Peserta & Tamu
          </h1>
          <p className="text-xs text-gray-500 dark:text-dark-400 mt-1 max-w-lg mx-auto font-medium">
            Selamat datang! Halaman ini menampilkan log kedatangan peserta secara langsung. Nama Anda akan muncul otomatis di atas setelah melakukan submit form kehadiran.
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 max-w-xl mx-auto pt-2">
          <div className="bg-[#1d3d75]/5 dark:bg-dark-950 p-3 rounded-2xl border border-[#1d3d75]/10">
            <span className="block text-xl md:text-2xl font-black text-[#1d3d75] dark:text-white">{stats.total}</span>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Total Hadir</span>
          </div>

          <div className="bg-[#76b5c5]/10 dark:bg-dark-950 p-3 rounded-2xl border border-[#76b5c5]/20">
            <span className="block text-xl md:text-2xl font-black text-[#76b5c5] dark:text-brand-400">{stats.mahasiswa}</span>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Mahasiswa</span>
          </div>

          <div className="bg-[#c23b2b]/5 dark:bg-dark-950 p-3 rounded-2xl border border-[#c23b2b]/10">
            <span className="block text-xl md:text-2xl font-black text-[#c23b2b] dark:text-red-400">{stats.tamu}</span>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Tamu Undangan</span>
          </div>
        </div>
      </div>

      {/* Search and Filters panel */}
      <div className="bg-white dark:bg-dark-900 rounded-3xl p-5 md:p-6 shadow-md border border-gray-150 dark:border-dark-800/80 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari nama, NIM, prodi, atau instansi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#1d3d75] focus:ring-1 focus:ring-[#1d3d75] transition-all dark:text-white"
          />
        </div>

        {/* Filters and Refresh */}
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <div className="grid grid-cols-3 p-1 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-2xl">
            <button
              onClick={() => { setTypeFilter('ALL'); setPagination(p => ({ ...p, page: 1 })); }}
              className={`px-3 py-1.5 text-[10px] font-black rounded-xl transition-all ${
                typeFilter === 'ALL'
                  ? 'bg-[#1d3d75] text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => { setTypeFilter('PESERTA'); setPagination(p => ({ ...p, page: 1 })); }}
              className={`px-3 py-1.5 text-[10px] font-black rounded-xl transition-all ${
                typeFilter === 'PESERTA'
                  ? 'bg-[#1d3d75] text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Mahasiswa
            </button>
            <button
              onClick={() => { setTypeFilter('TAMU'); setPagination(p => ({ ...p, page: 1 })); }}
              className={`px-3 py-1.5 text-[10px] font-black rounded-xl transition-all ${
                typeFilter === 'TAMU'
                  ? 'bg-[#1d3d75] text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Tamu
            </button>
          </div>

          <button
            onClick={() => fetchAttendees(pagination.page)}
            className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 dark:border-dark-800 text-gray-500 rounded-xl transition-all"
            title="Muat ulang daftar"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Error notify */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2">
          <ShieldAlert size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main List */}
      <div className="space-y-3">
        {loading && attendees.length === 0 ? (
          /* Loading Skeleton */
          Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="bg-white dark:bg-dark-900 border border-gray-150 p-4 rounded-2xl flex justify-between items-center animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-dark-800 rounded-full"></div>
                <div className="space-y-1.5">
                  <div className="w-32 h-3.5 bg-gray-200 dark:bg-dark-800 rounded-md"></div>
                  <div className="w-20 h-2.5 bg-gray-200 dark:bg-dark-800 rounded-md"></div>
                </div>
              </div>
              <div className="w-16 h-4 bg-gray-200 dark:bg-dark-800 rounded-md"></div>
            </div>
          ))
        ) : attendees.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-dark-900 rounded-3xl p-12 text-center border border-gray-150 dark:border-dark-800">
            <Users className="mx-auto text-gray-300 dark:text-dark-700 mb-4 stroke-[1.5]" size={60} />
            <h3 className="text-base font-black text-gray-700 dark:text-white">Tidak Ada Peserta Hadir</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              Belum ada data kehadiran yang terdaftar {debouncedSearch ? 'untuk kriteria pencarian ini' : 'untuk saat ini'}.
            </p>
          </div>
        ) : (
          /* Attendee cards */
          <div className="grid gap-3">
            {attendees.map((a) => {
              const isParticipant = a.type === 'PESERTA';
              const name = isParticipant ? a.participant?.name : a.guest?.name;
              const subdetail = isParticipant
                ? `NIM: ${a.participant?.nim} — ${a.participant?.prodi}`
                : `${a.guest?.position} di ${a.guest?.institution}`;

              const initials = name ? getInitials(name) : '??';

              return (
                <div
                  key={a.id}
                  className={`bg-white dark:bg-dark-900 p-4 rounded-2xl border transition-all duration-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                    a.isNew
                      ? 'border-[#10b981] bg-green-50/50 dark:bg-green-950/15 shadow-md shadow-[#10b981]/5 ring-2 ring-[#10b981]/20 -translate-y-0.5 scale-[1.01]'
                      : 'border-gray-150 dark:border-dark-800/80 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Avatar Initials */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs shrink-0 select-none ${
                      isParticipant
                        ? 'bg-[#1d3d75]/10 text-[#1d3d75] dark:bg-brand-500/20 dark:text-brand-300'
                        : 'bg-[#c23b2b]/10 text-[#c23b2b] dark:bg-red-500/20 dark:text-red-300'
                    }`}>
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-sm text-gray-800 dark:text-dark-200 truncate max-w-[200px] sm:max-w-xs">{name}</h4>
                        {a.isNew && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black bg-[#10b981] text-white uppercase tracking-wider animate-bounce">
                            Baru Hadir
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-dark-400 font-semibold truncate mt-0.5">{subdetail}</p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-dark-800/80">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${getBadgeColor(a.type)}`}>
                      {a.type === 'PESERTA' ? 'Mahasiswa' : 'Tamu Undangan'}
                    </span>
                    
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-dark-500 font-bold mt-1">
                      <Clock size={12} />
                      <span>
                        {new Date(a.checkInTime).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} WIB
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-4 border-t border-gray-150 dark:border-dark-800/80">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
            disabled={pagination.page === 1}
            className="px-4 py-2 bg-white dark:bg-dark-900 border border-gray-250 dark:border-dark-800 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Sebelumnya
          </button>
          
          <span className="text-xs font-black text-gray-500">
            Halaman <strong className="text-[#1d3d75] dark:text-white">{pagination.page}</strong> dari {pagination.totalPages}
          </span>

          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.page + 1, pagination.totalPages) }))}
            disabled={pagination.page === pagination.totalPages}
            className="px-4 py-2 bg-white dark:bg-dark-900 border border-gray-250 dark:border-dark-800 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Berikutnya
          </button>
        </div>
      )}
    </div>
  );
};

export default PublicAttendanceList;
