import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import apiClient from '../api/client';
import { useSocket } from '../context/SocketContext';
import { Users, QrCode, ArrowLeft, Download, Maximize, CheckCircle } from 'lucide-react';
import logoDiesnat from '../assets/LOGO DIESNAT25.png';

interface Attendance {
  id: string;
  type: 'PESERTA' | 'TAMU';
  checkInTime: string;
  participant?: {
    name: string;
    nim: string;
    prodi: string;
  };
  guest?: {
    name: string;
    institution: string;
  };
}

const AdminKiosk: React.FC = () => {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const { socket } = useSocket();

  useEffect(() => {
    // Generate QR Code pointing to public check-in
    const registrationUrl = `${window.location.origin}/check-in`;
    if (qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        registrationUrl,
        {
          width: 320,
          margin: 1,
          color: {
            dark: '#1d3d75',
            light: '#ffffff'
          }
        },
        (error) => {
          if (error) console.error('Error generating event QR Code', error);
        }
      );
      QRCode.toDataURL(registrationUrl, { width: 800, margin: 2 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }

    // Fetch initial latest 15 attendances
    const fetchLiveBoard = async () => {
      try {
        const res = await apiClient.get('/attendance/list?limit=15');
        setAttendances(res.data.data);
        setTotalCount(res.data.total);
      } catch (err) {
        console.error('Error fetching live board', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLiveBoard();
  }, []);

  // Listen to Socket for realtime updates
  useEffect(() => {
    if (!socket) return;
    const handleNewAttendance = (newRecord: Attendance) => {
      setAttendances((prev) => [newRecord, ...prev].slice(0, 15));
      setTotalCount((prev) => prev + 1);
    };
    socket.on('newAttendance', handleNewAttendance);
    return () => {
      socket.off('newAttendance', handleNewAttendance);
    };
  }, [socket]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  };

  const StripeBorder = () => (
    <div className="striped-bar shadow-sm">
      {Array.from({ length: 48 }).map((_, idx) => {
        const colors = ['bg-[#1d3d75]', 'bg-[#e28743]', 'bg-[#c23b2b]', 'bg-[#76b5c5]'];
        const colorClass = colors[idx % colors.length];
        return <div key={idx} className={colorClass} />;
      })}
    </div>
  );

  return (
    <div className="min-h-screen kti-bg flex flex-col relative overflow-hidden transition-colors duration-300">
      <StripeBorder />

      {/* Header Banner */}
      <header className="bg-white/80 dark:bg-dark-900/80 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-dark-800 py-3 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoDiesnat} alt="Logo" className="w-12 h-12 object-contain" />
          <div>
            <h1 className="font-extrabold text-xl tracking-tight text-[#1d3d75] dark:text-white leading-none">PRESIFIY KIOSK</h1>
            <span className="text-[10px] font-bold text-[#c23b2b] tracking-wider uppercase">DIES NATALIS 25</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin" className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#1d3d75] transition-colors bg-gray-50 hover:bg-gray-100 dark:bg-dark-800 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-700 shadow-sm">
            <ArrowLeft size={14} />
            <span>Tutup Kiosk</span>
          </Link>
          <button onClick={toggleFullScreen} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1d3d75] text-white font-bold rounded-xl shadow-md hover:bg-[#c23b2b] transition-all text-xs">
            <Maximize size={14} />
            <span>Layar Penuh</span>
          </button>
        </div>
      </header>

      <div className="flex-grow flex flex-col md:flex-row gap-6 p-6 max-w-7xl mx-auto w-full items-stretch">
        {/* Left Side: QR Code Generator */}
        <div className="w-full md:w-5/12 bg-white dark:bg-dark-900 rounded-3xl shadow-2xl border-2 border-[#1d3d75]/10 dark:border-dark-800 overflow-hidden flex flex-col relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#e28743]/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          
          {/* Banner header like attendance form */}
          <div className="bg-[#1d3d75] px-6 py-5 text-white border-b-4 border-[#e28743] text-center">
            <span className="text-[9px] font-black tracking-widest uppercase text-[#76b5c5]">SCAN UNTUK PRESENSI</span>
            <h2 className="text-lg font-black mt-1 leading-snug">Workshop Karya Tulis Ilmiah</h2>
            <p className="text-[10px] text-[#e28743] font-bold mt-0.5">“Problematika dan Solusi Cerdas KTI Mahasiswa”</p>
          </div>

          <div className="flex-grow p-8 flex flex-col items-center justify-center space-y-6">
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-[#c23b2b]/10 text-[#c23b2b] rounded-2xl mb-2 animate-bounce shadow-sm">
                <QrCode size={28} />
              </div>
              <h2 className="text-xl font-black text-[#1d3d75] dark:text-white uppercase tracking-tight">Kamera HP Peserta</h2>
              <p className="text-xs text-gray-500 dark:text-dark-400 max-w-[250px] mx-auto">Arahkan kamera HP ke QR Code ini untuk membuka formulir absensi.</p>
            </div>

          <div className="p-4 bg-white border-4 border-[#1d3d75]/20 rounded-3xl shadow-inner inline-block">
            <canvas ref={qrCanvasRef} className="w-64 h-64 mx-auto"></canvas>
          </div>

          {qrUrl && (
            <a href={qrUrl} download="QR_Kiosk_Presensi.png" className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-dark-850 dark:hover:bg-dark-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-dark-700 font-bold rounded-xl transition-all text-xs">
              <Download size={14} />
              <span>Unduh Gambar QR</span>
            </a>
          )}
          </div>
        </div>

        {/* Right Side: Live Attendance Board */}
        <div className="w-full md:w-7/12 bg-white/95 dark:bg-dark-900/95 backdrop-blur-sm rounded-3xl shadow-2xl border-2 border-white/50 dark:border-dark-800 p-6 flex flex-col relative overflow-hidden">
          {/* Subtle gradient blob */}
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#76b5c5]/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

          <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100 dark:border-dark-800 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#e28743]/10 text-[#e28743] rounded-xl flex items-center justify-center">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#1d3d75] dark:text-white">Live Data Presensi</h3>
                <p className="text-xs text-gray-500 dark:text-dark-400 font-medium flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Pembaruan Real-time
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="block text-2xl font-black text-[#c23b2b]">{totalCount}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Hadir</span>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {loading ? (
              <div className="text-center py-10 text-gray-400">Memuat data live...</div>
            ) : attendances.length === 0 ? (
              <div className="text-center py-16 text-gray-400 dark:text-dark-500 font-medium">Belum ada peserta yang hadir.</div>
            ) : (
              attendances.map((item, index) => {
                const isPeserta = item.type === 'PESERTA';
                const name = isPeserta ? item.participant?.name : item.guest?.name;
                const detail = isPeserta ? `${item.participant?.prodi} — ${item.participant?.nim}` : item.guest?.institution;
                const isNew = index === 0;

                return (
                  <div key={item.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${isNew ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50 animate-pulse-once' : 'bg-gray-50 dark:bg-dark-950 border-gray-100 dark:border-dark-800'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white shadow-inner ${isPeserta ? 'bg-[#1d3d75]' : 'bg-[#c23b2b]'}`}>
                      {name ? name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="flex-grow overflow-hidden">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{name}</h4>
                        {isNew && <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-green-100 text-green-700 uppercase tracking-wider flex items-center gap-1"><CheckCircle size={10} /> Baru</span>}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-dark-400 truncate mt-0.5">{detail}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${isPeserta ? 'bg-[#1d3d75]/10 text-[#1d3d75] dark:text-brand-400' : 'bg-[#c23b2b]/10 text-[#c23b2b]'}`}>
                        {item.type}
                      </span>
                      <p className="text-xs font-semibold text-gray-400 mt-1">
                        {new Date(item.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      
      {/* Bottom Stripe */}
      <StripeBorder />
    </div>
  );
};

export default AdminKiosk;
