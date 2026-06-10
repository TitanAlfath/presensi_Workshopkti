import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { CheckCircle2, Download, Home, Clock } from 'lucide-react';

const SuccessPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(15);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const attendance = location.state?.attendance;

  useEffect(() => {
    if (!attendance) {
      navigate('/');
      return;
    }

    // Trigger Confetti!
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });

    // Auto-redirect timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/check-in');
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attendance, navigate]);

  // Generate QR Code for Ticket
  useEffect(() => {
    if (!attendance) return;

    // Create QR containing the attendance ID
    const qrData = JSON.stringify({
      id: attendance.id,
      name: attendance.type === 'PESERTA' ? attendance.participant?.name : attendance.guest?.name,
      type: attendance.type,
      checkInTime: attendance.checkInTime
    });

    if (qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        qrData,
        {
          width: 140,
          margin: 1,
          color: {
            dark: '#1d3d75', // KTI Navy
            light: '#fdfaf4'  // KTI Cream background
          }
        },
        (error) => {
          if (error) console.error('Error generating ticket QR', error);
        }
      );
    }
  }, [attendance]);

  const handleDownloadTicket = () => {
    if (!attendance) return;

    // Create a high-res canvas to draw the ticket and download it as PNG
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isParticipant = attendance.type === 'PESERTA';
    const name = isParticipant ? attendance.participant?.name : attendance.guest?.name;
    const detailsLabel = isParticipant ? 'NIM / PROGRAM STUDI' : 'INSTANSI / JABATAN';
    const detailsVal = isParticipant 
      ? `${attendance.participant?.nim} - ${attendance.participant?.prodi}`
      : `${attendance.guest?.institution} - ${attendance.guest?.position}`;
    const dateStr = new Date(attendance.checkInTime).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'medium'
    });

    // Draw card background (Navy Blue)
    ctx.fillStyle = '#1d3d75'; 
    ctx.fillRect(0, 0, 600, 400);

    // Draw top banner (Crimson/Red-Orange)
    ctx.fillStyle = '#c23b2b'; 
    ctx.fillRect(0, 0, 600, 90);

    // Draw top banner gold stripe at the bottom of the banner
    ctx.fillStyle = '#e28743'; 
    ctx.fillRect(0, 85, 600, 5);

    // Header Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('TIKET PRESENSI DIGITAL', 40, 52);

    // Event title on right
    ctx.font = 'bold 11px Arial';
    ctx.fillStyle = '#fdfaf4';
    ctx.fillText('DIES NATALIS FASTIKOM 25', 415, 50);

    // Divider line (Crimson)
    ctx.strokeStyle = '#c23b2b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 290);
    ctx.lineTo(560, 290);
    ctx.stroke();

    // Body text - Labels & Values
    ctx.fillStyle = '#76b5c5'; // Light Blue label
    ctx.font = 'bold 11px Arial';
    ctx.fillText('NAMA LENGKAP', 40, 135);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(name || '', 40, 160);

    ctx.fillStyle = '#76b5c5';
    ctx.font = 'bold 11px Arial';
    ctx.fillText(detailsLabel, 40, 205);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(detailsVal || '', 40, 230);

    ctx.fillStyle = '#e28743'; // Gold label
    ctx.font = 'bold 11px Arial';
    ctx.fillText('WAKTU MASUK PRESENSI', 40, 325);

    ctx.fillStyle = '#10b981'; // emerald success
    ctx.font = 'bold 14px Arial';
    ctx.fillText(dateStr + ' WIB', 40, 350);

    // Draw QR Code onto the download canvas from the reference canvas
    if (qrCanvasRef.current) {
      ctx.fillStyle = '#fdfaf4'; // cream background for QR
      ctx.fillRect(410, 120, 150, 150);
      ctx.drawImage(qrCanvasRef.current, 415, 125, 140, 140);
    }

    // Add border (Gold)
    ctx.strokeStyle = '#e28743';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 590, 390);

    // Trigger download
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Tiket_Presensi_KTI_${(name || 'User').replace(/\s+/g, '_')}.png`;
    link.href = url;
    link.click();
  };

  if (!attendance) return null;

  const isParticipant = attendance.type === 'PESERTA';
  const name = isParticipant ? attendance.participant?.name : attendance.guest?.name;

  return (
    <div className="max-w-xl mx-auto space-y-6 text-center animate-scale-in">
      <div className="bg-white dark:bg-dark-900 rounded-3xl p-6 md:p-8 shadow-xl border border-gray-150 dark:border-dark-800 space-y-6">
        {/* Success Icon */}
        <div className="mx-auto w-16 h-16 bg-[#10b981]/15 text-[#10b981] rounded-full flex items-center justify-center shadow-inner">
          <CheckCircle2 size={40} className="stroke-[2.5]" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-[#1d3d75] dark:text-white leading-tight">Presensi Berhasil!</h2>
          <p className="text-xs font-black text-[#c23b2b] mt-1 uppercase tracking-widest">
            Selamat Datang di Workshop KTI
          </p>
        </div>

        {/* Personalized Welcome */}
        <div className="py-4 px-6 bg-[#fdfaf4] dark:bg-dark-950 rounded-2xl border border-gray-150 dark:border-dark-800/80">
          <span className="text-[9px] font-black text-gray-400 dark:text-dark-500 uppercase tracking-widest block">Halo</span>
          <h3 className="text-lg font-black text-[#1d3d75] dark:text-dark-200 mt-0.5 truncate">{name}</h3>
          <p className="text-xs text-gray-500 dark:text-dark-400 mt-1">Kehadiran Anda telah berhasil dicatat pada sistem presensi.</p>
        </div>

        {/* Ticket Mockup */}
        <div className="relative bg-[#1d3d75] text-white rounded-2xl p-6 border-2 border-[#e28743] text-left overflow-hidden shadow-lg select-none">
          {/* Ticket styling accents */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#c23b2b]/15 rounded-full blur-2xl -mr-10 -mt-10"></div>
          
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-4 flex-1">
              <div>
                <span className="text-[8px] font-black text-[#76b5c5] uppercase tracking-widest">Nama Lengkap</span>
                <p className="font-black text-base leading-tight mt-0.5 truncate text-white">{name}</p>
              </div>

              <div>
                <span className="text-[8px] font-black text-[#76b5c5] uppercase tracking-widest">
                  {isParticipant ? 'NIM / Program Studi' : 'Instansi / Jabatan'}
                </span>
                <p className="font-bold text-xs mt-0.5 leading-snug text-gray-100">
                  {isParticipant 
                    ? `${attendance.participant?.nim} — ${attendance.participant?.prodi}`
                    : `${attendance.guest?.institution} — ${attendance.guest?.position}`
                  }
                </p>
              </div>

              <div>
                <span className="text-[8px] font-black text-[#e28743] uppercase tracking-widest">Waktu Presensi</span>
                <p className="font-bold text-xs text-[#10b981] mt-0.5">
                  {new Date(attendance.checkInTime).toLocaleString('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })} WIB
                </p>
              </div>
            </div>

            {/* Ticket QR Canvas code */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className="p-2 bg-[#fdfaf4] border border-gray-100 rounded-xl inline-block shadow-inner">
                <canvas ref={qrCanvasRef} className="w-24 h-24 sm:w-28 sm:h-28"></canvas>
              </div>
              <span className="text-[8px] font-black text-[#76b5c5] tracking-wider">TIKET ID: {attendance.id.substring(0, 8).toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownloadTicket}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1d3d75] hover:bg-[#c23b2b] text-white rounded-xl font-black shadow-md hover:-translate-y-0.5 transition-all text-sm cursor-pointer"
          >
            <Download size={16} />
            <span>Unduh Tiket Kehadiran</span>
          </button>

          <button
            onClick={() => navigate('/check-in')}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-dark-800 text-gray-700 dark:text-dark-200 hover:bg-gray-200 dark:hover:bg-dark-750 rounded-xl font-semibold transition-all text-sm cursor-pointer"
          >
            <Home size={16} />
            <span>Form Presensi Baru</span>
          </button>
        </div>

        {/* Auto redirect notification */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-dark-500 font-medium pt-2 border-t border-gray-100 dark:border-dark-800/80">
          <Clock size={14} className="animate-pulse" />
          <span>Kembali ke form presensi dalam <strong className="text-gray-600 dark:text-dark-300 font-bold">{countdown} detik</strong></span>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;
