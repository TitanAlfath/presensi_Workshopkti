import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';

const QRScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // 1. Fetch available cameras on mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          setSelectedCameraId(devices[0].id);
        } else {
          setErrorMsg('Kamera tidak ditemukan. Pastikan izin kamera telah diberikan.');
        }
      })
      .catch((err) => {
        console.error('Error getting cameras', err);
        setErrorMsg('Gagal mendapatkan izin akses kamera.');
      });

    return () => {
      // Clean up scanning on unmount
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  // 2. Automatically start scanning when selectedCameraId is ready
  useEffect(() => {
    if (selectedCameraId) {
      // Small timeout to ensure DOM container is rendered
      const t = setTimeout(() => {
        startScanning();
      }, 300);
      return () => clearTimeout(t);
    }
  }, [selectedCameraId]);

  const startScanning = async () => {
    if (!selectedCameraId) return;
    setErrorMsg(null);

    // If already scanning, stop first
    if (scannerRef.current && scannerRef.current.isScanning) {
      await stopScanning();
    }

    const html5Qrcode = new Html5Qrcode('qr-reader-container');
    scannerRef.current = html5Qrcode;

    try {
      setScanning(true);
      await html5Qrcode.start(
        selectedCameraId,
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size };
          }
        },
        async (decodedText) => {
          // Scanned successfully! Stop scanner and process data
          await html5Qrcode.stop();
          setScanning(false);
          processScannedData(decodedText);
        },
        (errorMessage) => {
          // Verbose logs: ignore scan frame errors
        }
      );
    } catch (err) {
      console.error('Failed to start scanning', err);
      setErrorMsg('Gagal memulai kamera. Pastikan izin kamera telah diaktifkan.');
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        setScanning(false);
      } catch (err) {
        console.error('Failed to stop scanning', err);
      }
    }
  };

  const processScannedData = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Check if scanned text is a URL pointing to the check-in form
    try {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const url = new URL(trimmed);
        if (url.pathname === '/check-in') {
          navigate(`${url.pathname}${url.search}`);
          return;
        }
      }
    } catch (e) {
      // Ignore URL parsing errors
    }

    // Check if numeric (NIM or Phone number)
    const isNumeric = /^\d+$/.test(trimmed);
    if (isNumeric) {
      if (trimmed.startsWith('08') || trimmed.startsWith('62')) {
        navigate(`/check-in?category=TAMU&phone=${encodeURIComponent(trimmed)}`);
      } else {
        navigate(`/check-in?category=PESERTA&nim=${encodeURIComponent(trimmed)}`);
      }
    } else {
      // Default: Assume participant NIM
      navigate(`/check-in?category=PESERTA&nim=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleCameraChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
  };

  const isInsideAdmin = window.location.pathname.startsWith('/admin');

  return (
    <div className={`max-w-xl mx-auto space-y-6 ${isInsideAdmin ? '' : 'pt-6 animate-slide-up'}`}>
      {/* Back button */}
      {!isInsideAdmin && (
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-black text-[#1d3d75] hover:text-[#c23b2b] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Kembali ke Halaman Depan</span>
        </button>
      )}

      {/* Main card */}
      <div className="bg-white dark:bg-dark-900 rounded-3xl shadow-xl border border-gray-150 dark:border-dark-800/80 p-6 md:p-8 space-y-6 text-center">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white">Pindai Barcode / KTM</h2>
          <p className="text-xs text-gray-400 mt-1">Dekatkan barcode atau QR Code Anda ke kamera untuk mengisi presensi secara instan.</p>
        </div>

        {/* Camera Selector */}
        {cameras.length > 1 && (
          <div className="max-w-xs mx-auto">
            <select
              value={selectedCameraId}
              onChange={handleCameraChange}
              className="w-full px-3 py-1.5 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-xs dark:text-white font-semibold focus:outline-none"
            >
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Kamera ${cameras.indexOf(cam) + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Error notification */}
        {errorMsg && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-2">
            <ShieldAlert size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Scan Window */}
        <div className="relative max-w-sm mx-auto bg-slate-900 aspect-square rounded-3xl overflow-hidden shadow-inner border border-slate-800">
          <div id="qr-reader-container" className="w-full h-full"></div>
          
          {!scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 space-y-2 bg-slate-950/90">
              <div className="w-16 h-16 bg-[#1d3d75]/20 text-[#76b5c5] rounded-full flex items-center justify-center mb-1 animate-pulse">
                <Camera size={32} className="stroke-[1.5]" />
              </div>
              <span className="text-xs font-black tracking-wider uppercase">Menghubungkan Kamera...</span>
              <p className="text-[10px] text-gray-400 max-w-[200px]">Sedang menginisialisasi modul scanner kamera</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-2">
          {!scanning ? (
            <button
              onClick={startScanning}
              disabled={!selectedCameraId}
              className="px-8 py-3 bg-[#1d3d75] hover:bg-[#c23b2b] disabled:bg-gray-300 dark:disabled:bg-dark-800 text-white rounded-2xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center gap-2 hover:-translate-y-0.5"
            >
              <Camera size={14} />
              <span>Nyalakan Kamera</span>
            </button>
          ) : (
            <button
              onClick={stopScanning}
              className="px-8 py-3 bg-[#c23b2b] hover:bg-red-600 text-white rounded-2xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center gap-2 hover:-translate-y-0.5"
            >
              <span>Hentikan Kamera</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScannerPage;
