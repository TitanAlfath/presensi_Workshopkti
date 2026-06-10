import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import apiClient from '../api/client';
import {
  Users,
  UserCheck,
  User,
  Activity,
  ArrowRight,
  TrendingUp,
  Sparkles,
  BellRing
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Stats {
  totalHadir: number;
  totalPeserta: number;
  totalTamu: number;
  hadirHariIni: number;
  byDate: { date: string; count: number }[];
  byProdi: { prodi: string; count: number }[];
  byFakultas: { fakultas: string; count: number }[];
}

interface RecentAttendance {
  id: string;
  type: 'PESERTA' | 'TAMU';
  checkInTime: string;
  participant?: { name: string; nim: string; prodi: string } | null;
  guest?: { name: string; institution: string; position: string } | null;
}

const AdminDashboard: React.FC = () => {
  const { socket } = useSocket();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ show: boolean; message: string; sub: string } | null>(null);

  const fetchDashboardData = async () => {
    try {
      const statsRes = await apiClient.get('/attendance/stats');
      setStats(statsRes.data);

      const listRes = await apiClient.get('/attendance/list?limit=5');
      setRecent(listRes.data.data);
    } catch (err) {
      console.error('Error fetching dashboard statistics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Listen for realtime attendance events
  useEffect(() => {
    if (!socket) return;

    const handleNewAttendance = (newRecord: any) => {
      // Re-trigger statistical fetching in background
      fetchDashboardData();

      // Show real-time check-in toast
      const isParticipant = newRecord.type === 'PESERTA';
      const name = isParticipant ? newRecord.participant?.name : newRecord.guest?.name;
      const detail = isParticipant ? `NIM: ${newRecord.participant?.nim}` : `Instansi: ${newRecord.guest?.institution}`;

      setToast({
        show: true,
        message: `${name} telah hadir!`,
        sub: `${newRecord.type} — ${detail}`
      });

      // Auto hide toast after 5s
      setTimeout(() => {
        setToast(null);
      }, 5000);
    };

    socket.on('newAttendance', handleNewAttendance);

    return () => {
      socket.off('newAttendance', handleNewAttendance);
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white dark:bg-dark-900 border border-gray-150 dark:border-dark-800 rounded-2xl animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-white dark:bg-dark-900 border border-gray-150 dark:border-dark-800 rounded-2xl animate-pulse"></div>
          <div className="h-80 bg-white dark:bg-dark-900 border border-gray-150 dark:border-dark-800 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Setup Line Chart for check-ins by Date
  const lineChartData = {
    labels: stats?.byDate.map(d => d.date) || [],
    datasets: [
      {
        label: 'Jumlah Kehadiran',
        data: stats?.byDate.map(d => d.count) || [],
        fill: true,
        borderColor: '#6366f1', // brand-500
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        pointBackgroundColor: '#6366f1',
        pointHoverRadius: 6
      }
    ]
  };

  // Setup Bar Chart for check-ins by Prodi
  const barChartData = {
    labels: stats?.byProdi.map(p => p.prodi.length > 15 ? p.prodi.substring(0, 15) + '...' : p.prodi) || [],
    datasets: [
      {
        label: 'Mahasiswa per Prodi',
        data: stats?.byProdi.map(p => p.count) || [],
        backgroundColor: '#10b981', // accent-500 (emerald)
        borderRadius: 8
      }
    ]
  };

  // Setup Doughnut Chart for check-ins by Fakultas
  const doughnutChartData = {
    labels: stats?.byFakultas.map(f => f.fakultas) || [],
    datasets: [
      {
        data: stats?.byFakultas.map(f => f.count) || [],
        backgroundColor: [
          '#6366f1', // Indigo
          '#10b981', // Emerald
          '#3b82f6', // Blue
          '#f59e0b', // Amber
        ],
        borderWidth: 0
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Realtime attendance toast notifications */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-brand-600 dark:bg-brand-500 text-white rounded-2xl shadow-xl shadow-brand-500/30 p-4 border border-brand-400 flex items-start gap-3.5 animate-slide-up">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 mt-0.5 animate-bounce">
            <BellRing size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="font-extrabold text-sm text-white">Presensi Masuk (Realtime)</h5>
            <p className="text-xs font-bold mt-1 text-white truncate">{toast.message}</p>
            <p className="text-[10px] text-brand-100 font-medium mt-0.5 truncate">{toast.sub}</p>
          </div>
        </div>
      )}

      {/* Quick Action Banner */}
      <div className="bg-gradient-to-r from-[#1d3d75] to-[#76b5c5] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <h3 className="text-xl font-black mb-1">Mode Kiosk & Live Board</h3>
          <p className="text-xs text-[#fdfaf4] font-medium max-w-lg">
            Buka tampilan layar penuh berisi QR Code pendaftaran dan data live presensi. Sangat cocok untuk diproyeksikan ke layar besar atau monitor di meja registrasi.
          </p>
        </div>
        <Link 
          to="/admin/kiosk" 
          className="relative z-10 shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-white text-[#1d3d75] hover:bg-gray-100 font-bold rounded-xl shadow-md transition-all text-sm"
        >
          <span>Buka Mode Kiosk</span>
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Hadir */}
        <div className="bg-white dark:bg-dark-900 p-6 rounded-2xl border border-gray-150 dark:border-dark-800/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-dark-500 uppercase tracking-widest block">Total Hadir</span>
            <span className="text-3xl font-extrabold text-gray-800 dark:text-white mt-1 block">{stats?.totalHadir}</span>
            <span className="text-[10px] font-semibold text-brand-500 dark:text-brand-400 flex items-center gap-1 mt-1">
              <TrendingUp size={12} />
              <span>Semua Kategori</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/20 text-brand-500 flex items-center justify-center shadow-inner">
            <UserCheck size={22} />
          </div>
        </div>

        {/* Card 2: Total Peserta (Mahasiswa) */}
        <div className="bg-white dark:bg-dark-900 p-6 rounded-2xl border border-gray-150 dark:border-dark-800/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-dark-500 uppercase tracking-widest block">Mahasiswa / Peserta</span>
            <span className="text-3xl font-extrabold text-gray-800 dark:text-white mt-1 block">{stats?.totalPeserta}</span>
            <span className="text-[10px] font-semibold text-gray-500 dark:text-dark-400 mt-1 block">
              Prodi FASTIKOM
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 flex items-center justify-center shadow-inner">
            <User size={22} />
          </div>
        </div>

        {/* Card 3: Total Tamu */}
        <div className="bg-white dark:bg-dark-900 p-6 rounded-2xl border border-gray-150 dark:border-dark-800/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-dark-500 uppercase tracking-widest block">Tamu Undangan</span>
            <span className="text-3xl font-extrabold text-gray-800 dark:text-white mt-1 block">{stats?.totalTamu}</span>
            <span className="text-[10px] font-semibold text-gray-500 dark:text-dark-400 mt-1 block">
              Mitra & Instansi
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/20 text-green-500 flex items-center justify-center shadow-inner">
            <Users size={22} />
          </div>
        </div>

        {/* Card 4: Hadir Hari Ini */}
        <div className="bg-white dark:bg-dark-900 p-6 rounded-2xl border border-gray-150 dark:border-dark-800/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-dark-500 uppercase tracking-widest block">Presensi Hari Ini</span>
            <span className="text-3xl font-extrabold text-gray-800 dark:text-white mt-1 block">{stats?.hadirHariIni}</span>
            <span className="text-[10px] font-semibold text-accent-500 dark:text-accent-400 flex items-center gap-1 mt-1">
              <Activity size={12} className="animate-pulse" />
              <span>Realtime Tracker</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-accent-50 dark:bg-accent-950/20 text-accent-500 flex items-center justify-center shadow-inner">
            <Sparkles size={22} />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart (Kehadiran per Hari) */}
        <div className="bg-white dark:bg-dark-900 p-6 rounded-2xl border border-gray-150 dark:border-dark-800/80 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-800 pb-3">
            <h4 className="font-bold text-sm dark:text-white">Tren Kehadiran Harian</h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">Semua Tanggal</span>
          </div>
          <div className="h-64 relative">
            {stats && stats.byDate.length > 0 ? (
              <Line data={lineChartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400 dark:text-dark-500">Belum ada data kehadiran untuk diplot.</div>
            )}
          </div>
        </div>

        {/* Doughnut Chart (Fakultas distribution) */}
        <div className="bg-white dark:bg-dark-900 p-6 rounded-2xl border border-gray-150 dark:border-dark-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-800 pb-3">
            <h4 className="font-bold text-sm dark:text-white">Statistik Fakultas</h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">Mahasiswa</span>
          </div>
          <div className="h-48 relative flex items-center justify-center">
            {stats && stats.byFakultas.length > 0 ? (
              <Doughnut data={doughnutChartData} options={{ responsive: true, maintainAspectRatio: false }} />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400 dark:text-dark-500">Belum ada data fakultas.</div>
            )}
          </div>
          {/* Custom legend */}
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            {stats?.byFakultas.map((f, i) => (
              <div key={f.fakultas} className="flex items-center gap-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: doughnutChartData.datasets[0].backgroundColor[i] }}></span>
                <span className="text-gray-600 dark:text-dark-300 truncate">{f.fakultas}: {f.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart (Prodi distribution) */}
        <div className="bg-white dark:bg-dark-900 p-6 rounded-2xl border border-gray-150 dark:border-dark-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-800 pb-3">
            <h4 className="font-bold text-sm dark:text-white">Statistik Program Studi</h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">Mahasiswa</span>
          </div>
          <div className="h-60 relative">
            {stats && stats.byProdi.length > 0 ? (
              <Bar data={barChartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400 dark:text-dark-500">Belum ada data prodi.</div>
            )}
          </div>
        </div>

        {/* Recent Attendance list */}
        <div className="bg-white dark:bg-dark-900 p-6 rounded-2xl border border-gray-150 dark:border-dark-800/80 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-800 pb-3">
            <h4 className="font-bold text-sm dark:text-white">Presensi Terkini</h4>
            <Link
              to="/admin/attendance"
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 flex items-center gap-1.5 transition-colors"
            >
              <span>Semua Log</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium border-collapse">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100 dark:border-dark-800">
                  <th className="py-2.5">Nama</th>
                  <th className="py-2.5">Kategori</th>
                  <th className="py-2.5">NIM / Instansi</th>
                  <th className="py-2.5">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-800/60">
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 dark:text-dark-500">Belum ada yang mengisi presensi.</td>
                  </tr>
                ) : (
                  recent.map((rec) => {
                    const isParticipant = rec.type === 'PESERTA';
                    const name = isParticipant ? rec.participant?.name : rec.guest?.name;
                    const detail = isParticipant ? rec.participant?.nim : rec.guest?.institution;

                    return (
                      <tr key={rec.id} className="text-gray-700 dark:text-dark-300">
                        <td className="py-3.5 font-bold truncate max-w-[120px] dark:text-white">{name}</td>
                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isParticipant 
                              ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' 
                              : 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400'
                          }`}>
                            {rec.type}
                          </span>
                        </td>
                        <td className="py-3.5 truncate max-w-[140px]">{detail}</td>
                        <td className="py-3.5 font-semibold text-gray-500 dark:text-dark-400">
                          {new Date(rec.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
