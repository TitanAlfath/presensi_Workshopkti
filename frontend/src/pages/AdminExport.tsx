import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Download, FileSpreadsheet, FileText, Info, Loader2 } from 'lucide-react';

const AdminExport: React.FC = () => {
  const [activeEventName, setActiveEventName] = useState('Event Aktif');
  const [type, setType] = useState('');
  const [date, setDate] = useState('');
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    const fetchActiveEvent = async () => {
      try {
        const res = await apiClient.get('/event/active');
        if (res.data) {
          setActiveEventName(res.data.name);
        }
      } catch (err) {
        console.error('Error fetching event in export', err);
      }
    };
    fetchActiveEvent();
  }, []);

  const handleExportExcel = async () => {
    setLoadingExcel(true);
    try {
      const response = await apiClient.get('/attendance/export/excel', {
        responseType: 'blob',
        params: { type, date }
      });

      // Get filename from response header if available, or generate default
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Rekap_Presensi_${activeEventName.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting Excel', err);
      alert('Gagal mendownload file Excel.');
    } finally {
      setLoadingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setLoadingPdf(true);
    try {
      const response = await apiClient.get('/attendance/export/pdf', {
        responseType: 'blob',
        params: { type, date }
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Laporan_Presensi_${activeEventName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting PDF', err);
      alert('Gagal mendownload file PDF.');
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Description Card */}
      <div className="bg-white dark:bg-dark-900 rounded-3xl p-6 shadow-sm border border-gray-150 dark:border-dark-800 flex gap-3 text-gray-500 dark:text-dark-400">
        <Info size={24} className="text-brand-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-extrabold text-sm text-gray-900 dark:text-white uppercase tracking-wider">Pusat Ekspor Dokumen</h4>
          <p className="text-xs leading-relaxed font-semibold">
            Gunakan modul ini untuk menghasilkan laporan presensi secara resmi. Anda dapat menyaring data berdasarkan Kategori Kehadiran dan Tanggal Presensi sebelum mengekspor.
          </p>
        </div>
      </div>

      {/* Filter and Download Card */}
      <div className="bg-white dark:bg-dark-900 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-150 dark:border-dark-800 space-y-6">
        <h3 className="text-sm font-bold dark:text-white uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-dark-800 pb-3">
          Opsi Ekspor Laporan
        </h3>

        <div className="grid sm:grid-cols-2 gap-5">
          {/* Category Filter */}
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kategori Kehadiran</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-xs dark:text-white focus:outline-none focus:border-brand-500 cursor-pointer"
            >
              <option value="">Semua Kategori</option>
              <option value="PESERTA">Mahasiswa / Peserta</option>
              <option value="TAMU">Tamu Undangan</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tanggal Presensi</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-xs dark:text-white focus:outline-none focus:border-brand-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Buttons Row */}
        <div className="grid sm:grid-cols-2 gap-4 pt-6 border-t border-gray-100 dark:border-dark-800">
          {/* Excel Export Button */}
          <button
            onClick={handleExportExcel}
            disabled={loadingExcel || loadingPdf}
            className="flex items-center justify-center gap-2 py-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-2xl font-bold shadow-md shadow-green-500/15 transition-all text-xs cursor-pointer hover:-translate-y-0.5"
          >
            {loadingExcel ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Memproses Excel...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet size={16} />
                <span>Ekspor Rekap Excel (.xlsx)</span>
              </>
            )}
          </button>

          {/* PDF Export Button */}
          <button
            onClick={handleExportPdf}
            disabled={loadingExcel || loadingPdf}
            className="flex items-center justify-center gap-2 py-4 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white rounded-2xl font-bold shadow-md shadow-brand-500/15 transition-all text-xs cursor-pointer hover:-translate-y-0.5"
          >
            {loadingPdf ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Memproses PDF...</span>
              </>
            ) : (
              <>
                <FileText size={16} />
                <span>Ekspor Laporan PDF (.pdf)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminExport;
