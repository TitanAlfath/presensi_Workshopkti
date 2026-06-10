import React, { useEffect, useState, useRef } from 'react';
import apiClient from '../api/client';
import {
  Search,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Info,
  Download,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  nim: string;
  prodi: string;
  fakultas: string;
  phone: string;
  email?: string;
  isAttended: boolean;
  checkInTime?: string;
}

const AdminParticipants: React.FC = () => {
  const [type, setType] = useState<'PESERTA' | 'TAMU'>('PESERTA');
  const [data, setData] = useState<Participant[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Selection & Deletion
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  // Modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const [activeEventId, setActiveEventId] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchParticipants = async (page = 1) => {
    setLoading(true);
    try {
      const eventRes = await apiClient.get('/event/active');
      let currentEventId = '';
      if (eventRes.data) {
        setActiveEventId(eventRes.data.id);
        currentEventId = eventRes.data.id;
      }

      if (!currentEventId) {
        setLoading(false);
        return; // Need active event to fetch attendance status
      }

      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '10',
        search,
        eventId: currentEventId,
        type
      });
      const res = await apiClient.get(`/participant/list?${queryParams.toString()}`);
      setData(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Error fetching participants', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants(1);
    setSelectedIds([]);
  }, [search, type]);

  const handleForceCheckIn = async (participantId: string) => {
    if (!activeEventId) return;
    if (!window.confirm('Hadirkan peserta ini secara manual?')) return;

    try {
      await apiClient.post('/participant/force-check-in', {
        participantId,
        eventId: activeEventId,
        type
      });
      alert('Berhasil diabsenkan!');
      fetchParticipants(pagination.page);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Gagal menghadirkan peserta.');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(data.map(d => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Yakin ingin menghapus ${selectedIds.length} data terpilih?`)) return;

    setDeleting(true);
    try {
      await apiClient.post('/participant/delete-multiple', { ids: selectedIds, type });
      setSelectedIds([]);
      fetchParticipants(1);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus data.');
    } finally {
      setDeleting(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm(`PERINGATAN: Yakin ingin mengosongkan SEMUA data ${type === 'PESERTA' ? 'peserta' : 'tamu'}? Aksi ini tidak dapat dibatalkan!`)) return;

    setDeleting(true);
    try {
      await apiClient.post('/participant/clear-all', { type });
      setSelectedIds([]);
      fetchParticipants(1);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengosongkan data.');
    } finally {
      setDeleting(false);
    }
  };

  // Submit Excel upload
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      alert('Silakan pilih file Excel terlebih dahulu.');
      return;
    }

    if (!activeEventId) {
      alert('Tidak ada event aktif.');
      return;
    }

    setImportLoading(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', files[0]);
    formData.append('eventId', activeEventId);
    formData.append('type', type);

    try {
      const res = await apiClient.post('/attendance/import/excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setImportResult({
        imported: res.data.totalImported,
        skipped: res.data.totalDuplicatesSkipped
      });

      fetchParticipants(1);
    } catch (err: any) {
      console.error('Excel import failed', err);
      alert(err.response?.data?.message || 'Gagal mengimport data Excel.');
    } finally {
      setImportLoading(false);
    }
  };

  const downloadTemplate = () => {
    let csvContent = "";
    let fileName = "";

    if (type === 'TAMU') {
      csvContent = "data:text/csv;charset=utf-8,No,Nama Lengkap,Instansi/Lembaga,Jabatan,Nomor HP\n1,Contoh Nama Tamu,Bupati Banyumas,Kepala Dinas,08987654321\n";
      fileName = "template_import_tamu.csv";
    } else {
      csvContent = "data:text/csv;charset=utf-8,No,Nama Lengkap,NIM,Program Studi,Fakultas,Nomor HP\n1,Contoh Nama,20220801099,Teknik Informatika,FASTIKOM,08123456789\n";
      fileName = "template_import_peserta.csv";
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = async () => {
    if (!activeEventId) return;
    setExportLoading(true);
    try {
      const response = await apiClient.get('/participant/export/excel', {
        responseType: 'blob',
        params: { eventId: activeEventId, type }
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Data_${type}_${Date.now()}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting Excel', err);
      alert('Gagal mengekspor data peserta.');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-dark-900 p-5 rounded-2xl border border-gray-150 dark:border-dark-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder={`Cari nama atau ${type === 'PESERTA' ? 'NIM' : 'Instansi'}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-sm focus:outline-none focus:border-brand-500 transition-all dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Action buttons when items are selected */}
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 rounded-xl text-xs font-bold transition-all mr-2"
            >
              {deleting ? (
                <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <X size={14} />
              )}
              Hapus Terpilih ({selectedIds.length})
            </button>
          )}

          {/* Category filter */}
          <select
            value={type}
            onChange={(e) => { setType(e.target.value as any); setSearch(''); }}
            className="px-3 py-2 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-xs font-semibold focus:outline-none dark:text-white cursor-pointer"
          >
            <option value="PESERTA">Mahasiswa</option>
            <option value="TAMU">Tamu Undangan</option>
          </select>

          {/* Clear All Data */}
          <button
            onClick={handleClearAll}
            disabled={deleting || data.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/10 transition-all cursor-pointer"
          >
            {deleting && selectedIds.length === 0 ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <X size={14} />
            )}
            <span>Kosongkan Semua</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={exportLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 transition-all cursor-pointer"
          >
            {exportLoading ? (
               <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
               <Download size={14} />
            )}
            <span>Export Peserta</span>
          </button>
          
          <button
            onClick={() => { setImportModalOpen(true); setImportResult(null); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold shadow-md shadow-green-500/10 transition-all cursor-pointer"
          >
            <Upload size={14} />
            <span>Import Peserta</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-900 rounded-2xl border border-gray-150 dark:border-dark-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-dark-950 text-gray-500 dark:text-dark-400 border-b border-gray-150 dark:border-dark-800">
                <th className="px-6 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={data.length > 0 && selectedIds.length === data.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-brand-600 bg-gray-100 border-gray-300 rounded focus:ring-brand-500 dark:focus:ring-brand-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">{type === 'PESERTA' ? 'NIM' : 'Instansi'}</th>
                <th className="px-6 py-4">{type === 'PESERTA' ? 'Prodi' : 'Jabatan'}</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-dark-500">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Memuat data peserta...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-dark-500">
                    Tidak ada data peserta. Silakan import dari Excel.
                  </td>
                </tr>
              ) : (
                data.map((participant) => (
                  <tr key={participant.id} className="text-gray-700 dark:text-dark-300 hover:bg-gray-50/50 dark:hover:bg-dark-800/30">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(participant.id)}
                        onChange={(e) => handleSelectOne(e, participant.id)}
                        className="w-4 h-4 text-brand-600 bg-gray-100 border-gray-300 rounded focus:ring-brand-500 dark:focus:ring-brand-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 font-bold dark:text-white">
                      {participant.name}
                      {participant.email && <div className="text-[10px] text-gray-400 font-normal">{participant.email}</div>}
                    </td>
                    <td className="px-6 py-4">{participant.nim}</td>
                    <td className="px-6 py-4">{participant.prodi}</td>
                    <td className="px-6 py-4">
                      {participant.isAttended ? (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg w-fit">
                          <CheckCircle2 size={12} />
                          Hadir
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-400 font-bold bg-gray-100 dark:bg-dark-800 px-2 py-1 rounded-lg w-fit">
                          <AlertCircle size={12} />
                          Belum Hadir
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {!participant.isAttended && (
                        <button
                          onClick={() => handleForceCheckIn(participant.id)}
                          className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/30 dark:hover:bg-brand-900/50 text-brand-600 dark:text-brand-400 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 justify-center mx-auto cursor-pointer"
                        >
                          <UserCheck size={12} />
                          Absen
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-dark-950 border-t border-gray-150 dark:border-dark-800 flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-400 uppercase">
            Total Data: {pagination.total} Peserta
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchParticipants(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="p-1.5 bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-800 rounded-lg text-gray-500 dark:text-dark-400 hover:bg-gray-100 disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-semibold dark:text-white">
              Halaman {pagination.page} dari {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => fetchParticipants(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="p-1.5 bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-800 rounded-lg text-gray-500 dark:text-dark-400 hover:bg-gray-100 disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dark-900 rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-dark-800 flex flex-col animate-scale-in">
            <div className="px-6 py-4 border-b border-gray-150 dark:border-dark-800 flex justify-between items-center bg-brand-500 text-white rounded-t-3xl">
              <h3 className="font-extrabold text-sm uppercase tracking-wider">Import Peserta</h3>
              <button onClick={() => setImportModalOpen(false)} className="text-white/80 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-left">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-150 dark:border-blue-800 text-blue-700 dark:text-blue-400 rounded-2xl flex gap-3 text-xs leading-relaxed">
                <Info size={20} className="shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold">Format File yang Diterima</h5>
                  <p className="mt-0.5">Template file Excel/CSV wajib memiliki header berikut pada baris pertama:</p>
                  {type === 'PESERTA' ? (
                    <ul className="list-disc pl-4 mt-1 font-semibold space-y-0.5">
                      <li>Kolom A: No</li>
                      <li>Kolom B: Nama Lengkap</li>
                      <li>Kolom C: NIM</li>
                      <li>Kolom D: Program Studi</li>
                      <li>Kolom E: Fakultas</li>
                      <li>Kolom F: Nomor HP</li>
                      <li>Kolom G: Email (Opsional)</li>
                    </ul>
                  ) : (
                    <ul className="list-disc pl-4 mt-1 font-semibold space-y-0.5">
                      <li>Kolom A: No</li>
                      <li>Kolom B: Nama Lengkap</li>
                      <li>Kolom C: Instansi / Lembaga</li>
                      <li>Kolom D: Jabatan</li>
                      <li>Kolom E: Nomor HP</li>
                    </ul>
                  )}
                  <button
                    onClick={downloadTemplate}
                    className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-extrabold bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded transition-colors cursor-pointer"
                  >
                    <Download size={10} />
                    <span>Download Template CSV</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleImportSubmit} className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 dark:border-dark-700 rounded-2xl p-5 text-center hover:border-brand-500 dark:hover:border-brand-500/80 transition-colors">
                  <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                  <span className="block text-xs font-semibold text-gray-500 dark:text-dark-400">Pilih file Excel atau CSV (.xlsx, .xls, .csv)</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx,.xls,.csv"
                    required
                    className="block w-full text-xs text-slate-500 mt-4 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                  />
                </div>

                {importResult && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-xs font-semibold text-center">
                    Import Selesai! Berhasil: {importResult.imported} data, Di-skip (duplikat): {importResult.skipped} data.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={importLoading}
                  className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {importLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Mengimpor Data...</span>
                    </>
                  ) : (
                    <span>Proses Import</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminParticipants;
