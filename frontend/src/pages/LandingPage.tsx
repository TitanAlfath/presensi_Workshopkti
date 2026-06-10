import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { Calendar, MapPin, ArrowRight, Clock, QrCode, Download, Award, BookOpen, CheckCircle, ShieldAlert, Users, User } from 'lucide-react';
import QRCode from 'qrcode';

interface Event {
  id: string;
  name: string;
  location: string;
  date: string;
  description: string;
}

const LandingPage: React.FC = () => {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    const fetchActiveEvent = async () => {
      try {
        const res = await apiClient.get('/event/active');
        setEvent(res.data);
      } catch (err) {
        console.error('Error fetching active event', err);
      } finally {
        setLoading(false);
      }
    };
    fetchActiveEvent();
  }, []);

  // Countdown timer logic to June 11, 2026, 13:00 WIB
  useEffect(() => {
    const eventTime = new Date('2026-06-11T13:00:00').getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = eventTime - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Generate event QR code pointing to registration page
  useEffect(() => {
    if (!event) return;

    const registrationUrl = `${window.location.origin}/check-in`;
    
    if (qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        registrationUrl,
        {
          width: 260,
          margin: 1,
          color: {
            dark: '#1d3d75', // KTI Navy
            light: '#ffffff'
          }
        },
        (error) => {
          if (error) console.error('Error generating event QR Code', error);
        }
      );
      
      QRCode.toDataURL(registrationUrl, { width: 600, margin: 2 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [event]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 border-4 border-[#1d3d75] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[#1d3d75] font-bold">Memuat info event...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-16 px-4 bg-white dark:bg-dark-900 rounded-3xl shadow-xl border border-gray-150 max-w-xl mx-auto">
        <Calendar className="mx-auto text-gray-300 dark:text-dark-700 stroke-[1.5]" size={70} />
        <h2 className="text-2xl font-bold mt-6 text-[#1d3d75] dark:text-white">Belum Ada Event Aktif</h2>
        <p className="text-gray-500 dark:text-dark-400 mt-2 text-sm max-w-md mx-auto">
          Silakan hubungi administrator untuk membuat dan mengaktifkan event presensi baru di dashboard admin.
        </p>
        <Link
          to="/admin/login"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-[#1d3d75] hover:bg-[#c23b2b] text-white rounded-xl font-bold shadow-md transition-all text-sm"
        >
          Masuk ke Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-up relative">
      <style>{`
        @keyframes scan-laser {
          0% { top: 16px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: calc(100% - 20px); opacity: 0; }
        }
        .animate-scan-laser {
          animation: scan-laser 3s ease-in-out infinite;
        }
      `}</style>

      {/* Event Header Poster Info */}
      <div className="text-center space-y-4">
        {/* Dies Natalis Logo Header */}
        <div className="inline-flex flex-col items-center">
          <span className="text-xs font-black tracking-[0.2em] text-[#e28743] bg-[#e28743]/10 px-3 py-1 rounded-full uppercase">
            DIES NATALIS FASTIKOM 25
          </span>
        </div>

        {/* Main Event Title */}
        <div className="space-y-1">
          <h1 className="text-3xl md:text-5xl font-black text-[#1d3d75] leading-tight tracking-tight drop-shadow-[0_2px_2px_rgba(29,61,117,0.1)]">
            WORKSHOP KARYA TULIS ILMIAH
          </h1>
          <p className="text-base md:text-xl font-extrabold text-[#c23b2b] tracking-wide">
            “Problematika dan Solusi Cerdas KTI Mahasiswa”
          </p>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid md:grid-cols-12 gap-8 items-start">
        {/* Left Side: Event Details & Info */}
        <div className="md:col-span-7 space-y-6">
          {/* Info Card */}
          <div className="bg-white dark:bg-dark-900 rounded-3xl p-6 md:p-8 shadow-xl border border-gray-150 space-y-6">
            <h3 className="text-base font-black text-[#1d3d75] dark:text-white border-b-2 border-[#e28743] pb-2 uppercase tracking-wider flex items-center gap-2">
              <BookOpen size={18} className="text-[#c23b2b]" />
              <span>Informasi Pelaksanaan</span>
            </h3>

            <div className="grid gap-4">
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-[#1d3d75]/10 text-[#1d3d75] flex items-center justify-center flex-shrink-0">
                  <Calendar size={18} />
                </div>
                <div>
                  <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hari / Tanggal</h5>
                  <p className="text-sm font-bold text-gray-800 dark:text-white mt-0.5">
                    Kamis, 11 Juni 2026
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-[#e28743]/10 text-[#e28743] flex items-center justify-center flex-shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Waktu Kegiatan</h5>
                  <p className="text-sm font-bold text-gray-800 dark:text-white mt-0.5">
                    13:00 WIB — Selesai
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-[#c23b2b]/10 text-[#c23b2b] flex items-center justify-center flex-shrink-0">
                  <MapPin size={18} />
                </div>
                <div>
                  <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tempat Pelaksanaan</h5>
                  <p className="text-sm font-bold text-gray-800 dark:text-white mt-0.5">
                    Aula Al'ala Unsiq Kampus 1
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Speaker Info Card */}
          <div className="bg-white dark:bg-dark-900 rounded-3xl p-6 shadow-xl border border-gray-150 flex flex-col sm:flex-row items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-[#1d3d75]/10 text-[#1d3d75] flex items-center justify-center shrink-0 shadow-inner">
              <User size={26} className="stroke-[2]" />
            </div>
            <div className="text-center sm:text-left space-y-0.5">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-[#1d3d75]/10 text-[#1d3d75] tracking-wider uppercase">
                SPEAKER / PEMBICARA
              </span>
              <h4 className="text-base font-extrabold text-[#1d3d75] dark:text-white">
                Prof. Dr. Parmin, S.Pd., M.Pd.
              </h4>
              <p className="text-xs font-semibold text-gray-500 dark:text-dark-400">
                Profesor di Universitas Tidar (UNTIDAR)
              </p>
            </div>
          </div>

          {/* Benefits Card */}
          <div className="bg-white dark:bg-dark-900 rounded-3xl p-6 md:p-8 shadow-xl border border-gray-150 space-y-4">
            <h3 className="text-base font-black text-[#1d3d75] dark:text-white border-b-2 border-[#e28743] pb-2 uppercase tracking-wider flex items-center gap-2">
              <Award size={18} className="text-[#c23b2b]" />
              <span>Fasilitas & Manfaat</span>
            </h3>

            <ul className="grid sm:grid-cols-2 gap-3 text-xs font-bold text-gray-700 dark:text-dark-300">
              <li className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-[#10b981] flex-shrink-0" />
                <span>Materi yang Bermanfaat</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-[#10b981] flex-shrink-0" />
                <span>Pengembangan Keterampilan</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-[#10b981] flex-shrink-0" />
                <span>Networking Akademik</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-[#10b981] flex-shrink-0" />
                <span>Konsultasi terkait KTI</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-[#10b981] flex-shrink-0" />
                <span>E-sertifikat</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-[#10b981] flex-shrink-0" />
                <span>Free Entry Fee (Lunas BEM)</span>
              </li>
            </ul>
          </div>

          {/* Countdown */}
          <div className="bg-white dark:bg-dark-900 rounded-3xl p-6 shadow-xl border border-gray-150 text-center space-y-3 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-black text-[#1d3d75] dark:text-brand-400 uppercase tracking-widest">
              <Clock size={14} className="text-[#c23b2b] animate-pulse" />
              <span>Hitung Mundur Acara</span>
            </div>
            
            <div className="grid grid-cols-4 gap-2.5 max-w-sm mx-auto w-full">
              <div className="bg-gray-50 dark:bg-dark-850 p-2.5 rounded-2xl border border-gray-100">
                <span className="block text-xl font-black text-[#1d3d75] dark:text-white">{timeLeft.days}</span>
                <span className="text-[8px] font-bold text-gray-400 uppercase">Hari</span>
              </div>
              <div className="bg-gray-50 dark:bg-dark-850 p-2.5 rounded-2xl border border-gray-100">
                <span className="block text-xl font-black text-[#1d3d75] dark:text-white">{timeLeft.hours}</span>
                <span className="text-[8px] font-bold text-gray-400 uppercase">Jam</span>
              </div>
              <div className="bg-gray-50 dark:bg-dark-850 p-2.5 rounded-2xl border border-gray-100">
                <span className="block text-xl font-black text-[#1d3d75] dark:text-white">{timeLeft.minutes}</span>
                <span className="text-[8px] font-bold text-gray-400 uppercase">Menit</span>
              </div>
              <div className="bg-gray-50 dark:bg-dark-850 p-2.5 rounded-2xl border border-gray-100">
                <span className="block text-xl font-black text-[#1d3d75] dark:text-white">{timeLeft.seconds}</span>
                <span className="text-[8px] font-bold text-gray-400 uppercase">Detik</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Prominent QR Code Attendance Card */}
        <div className="md:col-span-5 bg-white dark:bg-dark-900 rounded-3xl p-6 md:p-8 shadow-2xl border-2 border-[#1d3d75]/15 text-center flex flex-col items-center justify-between gap-6 relative overflow-hidden group">
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#e28743]/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#1d3d75]/10 rounded-full blur-2xl -ml-10 -mb-10"></div>

          <div>
            <h4 className="font-black text-lg text-[#1d3d75] dark:text-white uppercase tracking-wider">QR Code Presensi Mandiri</h4>
            <p className="text-xs text-gray-400 mt-1">Scan menggunakan kamera HP Anda untuk mengisi formulir kehadiran</p>
          </div>

          {/* QR Container with Laser Scan Animation */}
          <div className="relative p-4 bg-white border-4 border-[#1d3d75]/25 rounded-3xl shadow-inner inline-block group-hover:border-[#e28743]/50 transition-colors duration-500">
            <canvas ref={qrCanvasRef} className="w-56 h-56 md:w-64 md:h-64"></canvas>
            
            {/* Laser scanning bar overlay */}
            <div className="absolute left-4 right-4 h-1 bg-gradient-to-r from-transparent via-[#c23b2b] to-transparent animate-scan-laser shadow-[0_0_12px_#c23b2b]"></div>
          </div>

          <div className="w-full space-y-4">
            {/* Live Indicator */}
            <div className="text-xs font-black text-[#c23b2b] uppercase tracking-widest flex items-center justify-center gap-1.5 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
              <span>Arahkan Kamera HP ke QR Code</span>
            </div>

            {/* Main buttons */}
            <div className="space-y-2.5">
              <Link
                to="/check-in"
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1d3d75] hover:bg-[#c23b2b] text-white rounded-2xl font-black shadow-lg shadow-[#1d3d75]/15 hover:shadow-[#c23b2b]/25 hover:-translate-y-0.5 transition-all text-xs"
              >
                <span>Buka Form Presensi</span>
                <ArrowRight size={14} />
              </Link>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/scan"
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-gray-50 hover:bg-gray-105 border border-gray-250 dark:bg-dark-850 dark:hover:bg-dark-800 dark:border-dark-700 text-[#1d3d75] dark:text-dark-200 rounded-xl font-black transition-all text-[11px] cursor-pointer"
                >
                  <QrCode size={13} className="text-[#c23b2b]" />
                  <span>Kamera Kiosk</span>
                </Link>

                <Link
                  to="/attendees"
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-gray-50 hover:bg-gray-105 border border-gray-250 dark:bg-dark-850 dark:hover:bg-dark-800 dark:border-dark-700 text-[#1d3d75] dark:text-dark-200 rounded-xl font-black transition-all text-[11px] cursor-pointer"
                >
                  <Users size={13} className="text-[#e28743] animate-pulse" />
                  <span>Papan Live</span>
                </Link>
              </div>
            </div>

            {/* Download Button */}
            {qrUrl && (
              <a
                href={qrUrl}
                download="QR_Presensi_Workshop_KTI.png"
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-dark-850 dark:hover:bg-dark-800 border border-gray-200 dark:border-dark-700 text-gray-500 dark:text-dark-400 text-[10px] font-bold rounded-xl transition-all"
              >
                <Download size={12} />
                <span>Unduh Gambar QR</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
