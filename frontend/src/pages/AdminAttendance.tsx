import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useSocket } from '../context/SocketContext';
import {
  Search,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  AlertCircle
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  type: 'PESERTA' | 'TAMU';
  checkInTime: string;
  participant?: {
    name: string;
    nim: string;
    prodi: string;
    fakultas: string;
    phone: string;
    email?: string | null;
  } | null;
  guest?: {
    name: string;
    institution: string;
    position: string;
    phone: string;
  } | null;
}

const AdminAttendance: React.FC = () => {
  const { socket } = useSocket();
  const [data, setData] = useState<AttendanceRecord[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);

  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingMultiple, setDeletingMultiple] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  // Modals status
  const [manualModalOpen, setManualModalOpen] = useState(false);

  // Active event context
  const [activeEventId, setActiveEventId] = useState('');

  // Form states for manual registration
  const [manualForm, setManualForm] = useState({
    type: 'PESERTA' as 'PESERTA' | 'TAMU',
    name: '',
    nim: '',
    prodi: '',
    fakultas: '',
    phone: '',
    email: '',
    institution: '',
    position: ''
  });
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAttendance = async (page = 1) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '10',
        search,
        type,
        date
      });
      const res = await apiClient.get(`/attendance/list?${queryParams.toString()}`);
      setData(res.data.data);
      setPagination(res.data.pagination);

      // Fetch active event
      const eventRes = await apiClient.get('/event/active');
      if (eventRes.data) {
        setActiveEventId(eventRes.data.id);
      }
    } catch (err) {
      console.error('Error fetching attendance logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance(1);
    setSelectedIds([]); // Clear selection when filter changes
  }, [search, type, date]);

  // Listen to realtime socket check-ins to refresh the list
  useEffect(() => {
    if (!socket) return;
    const refreshLogs = () => {
      // Re-fetch current page silently to keep list updated
      fetchAttendance(pagination.page);
    };
    socket.on('newAttendance', refreshLogs);
    return () => {
      socket.off('newAttendance', refreshLogs);
    };
  }, [socket, pagination.page]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data presensi ini?')) return;
    try {
      await apiClient.delete(`/attendance/delete/${id}`);
      fetchAttendance(pagination.page);
    } catch (err) {
      console.error('Error deleting attendance log', err);
      alert('Gagal menghapus data presensi.');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(data.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} data terpilih?`)) return;
    
    setDeletingMultiple(true);
    try {
      await apiClient.post('/attendance/delete-multiple', { ids: selectedIds });
      setSelectedIds([]);
      fetchAttendance(pagination.page);
    } catch (err) {
      console.error('Error deleting multiple', err);
      alert('Gagal menghapus data terpilih.');
    } finally {
      setDeletingMultiple(false);
    }
  };

  const handleClearAll = async () => {
    if (!activeEventId) return;
    if (!window.confirm('PERINGATAN: Apakah Anda yakin ingin mengosongkan SEMUA data presensi pada event ini? Tindakan ini tidak dapat dibatalkan!')) return;
    
    setClearingAll(true);
    try {
      await apiClient.post('/attendance/clear-all', { eventId: activeEventId });
      setSelectedIds([]);
      fetchAttendance(1);
    } catch (err) {
      console.error('Error clearing all', err);
      alert('Gagal mengosongkan data presensi.');
    } finally {
      setClearingAll(false);
    }
  };

  // Submit manual check-in
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!activeEventId) {
      setFormError('Tidak ada event aktif. Silakan buat event terlebih dahulu.');
      return;
    }

    const payload = {
      eventId: activeEventId,
      type: manualForm.type,
      name: manualForm.name,
      phone: manualForm.phone,
      ...(manualForm.type === 'PESERTA'
        ? { nim: manualForm.nim, prodi: manualForm.prodi, fakultas: manualForm.fakultas, email: manualForm.email }
        : { institution: manualForm.institution, position: manualForm.position })
    };

    try {
      await apiClient.post('/attendance/check-in', payload);
      setManualModalOpen(false);
      // Reset form
      setManualForm({
        type: 'PESERTA',
        name: '',
        phone: '',
        email: '',
        nim: '',
        prodi: '',
        fakultas: 'FASTIKOM',
        institution: '',
        position: ''
      });
      fetchAttendance(1);
    } catch (err: any) {
      console.error('Manual register failed', err);
      if (err.response && err.response.data && err.response.data.message) {
        setFormError(err.response.data.message);
      } else {
        setFormError('Gagal mencatat presensi manual.');
      }
    }
  };


  return (
    <div className="space-y-6">
      {/* Search & Toolbar Actions */}
      <div className="bg-white dark:bg-dark-900 p-5 rounded-2xl border border-gray-150 dark:border-dark-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Cari nama, NIM, atau instansi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-sm focus:outline-none focus:border-brand-500 transition-all dark:text-white"
          />
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category filter */}
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-xs font-semibold focus:outline-none dark:text-white cursor-pointer"
          >
            <option value="">Semua Kategori</option>
            <option value="PESERTA">Peserta</option>
            <option value="TAMU">Tamu Undangan</option>
          </select>

          {/* Date filter */}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-xs font-semibold focus:outline-none dark:text-white cursor-pointer"
          />

          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deletingMultiple}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/10 transition-all cursor-pointer disabled:opacity-70"
            >
              <Trash2 size={14} />
              <span>Hapus Terpilih ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={handleClearAll}
            disabled={clearingAll}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-70"
          >
            <Trash2 size={14} />
            <span>Kosongkan Semua</span>
          </button>

          {/* Manual insert button */}
          <button
            onClick={() => setManualModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 transition-all cursor-pointer"
          >
            <UserPlus size={14} />
            <span>Input Manual</span>
          </button>
        </div>
      </div>

      {/* Main Grid Table */}
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
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">NIM / Instansi</th>
                <th className="px-6 py-4">Prodi / Jabatan</th>
                <th className="px-6 py-4">Fakultas</th>
                <th className="px-6 py-4">No HP</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Waktu Hadir</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-800/60">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-400 dark:text-dark-500">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Memuat data log presensi...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-400 dark:text-dark-500">
                    Tidak ditemukan data presensi yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                data.map((record) => {
                  const isParticipant = record.type === 'PESERTA';
                  const name = isParticipant ? record.participant?.name : record.guest?.name;
                  const nimOrInstansi = isParticipant ? record.participant?.nim : record.guest?.institution;
                  const prodiOrJabatan = isParticipant ? record.participant?.prodi : record.guest?.position;
                  const fakultas = isParticipant ? record.participant?.fakultas : '-';
                  const phone = isParticipant ? record.participant?.phone : record.guest?.phone;
                  const email = isParticipant ? record.participant?.email : '-';
                  const dateStr = new Date(record.checkInTime).toLocaleString('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  });

                  return (
                    <tr key={record.id} className="text-gray-700 dark:text-dark-300 hover:bg-gray-50/50 dark:hover:bg-dark-800/30">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(record.id)}
                          onChange={(e) => handleSelectOne(e, record.id)}
                          className="w-4 h-4 text-brand-600 bg-gray-100 border-gray-300 rounded focus:ring-brand-500 dark:focus:ring-brand-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 font-bold dark:text-white">{name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          isParticipant 
                            ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' 
                            : 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400'
                        }`}>
                          {record.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">{nimOrInstansi}</td>
                      <td className="px-6 py-4">{prodiOrJabatan}</td>
                      <td className="px-6 py-4">{fakultas}</td>
                      <td className="px-6 py-4">{phone}</td>
                      <td className="px-6 py-4">{email}</td>
                      <td className="px-6 py-4 font-semibold text-gray-500 dark:text-dark-400">{dateStr} WIB</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Hapus data"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-dark-950 border-t border-gray-150 dark:border-dark-800 flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-400 uppercase">
            Total Data: {pagination.total} Log
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAttendance(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="p-1.5 bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-800 rounded-lg text-gray-500 dark:text-dark-400 hover:bg-gray-100 disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-semibold dark:text-white">
              Halaman {pagination.page} dari {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => fetchAttendance(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="p-1.5 bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-800 rounded-lg text-gray-500 dark:text-dark-400 hover:bg-gray-100 disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: Manual Check-In Form */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dark-900 rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-dark-800 flex flex-col max-h-[90vh] animate-scale-in">
            <div className="px-6 py-4 border-b border-gray-150 dark:border-dark-800 flex justify-between items-center bg-brand-500 text-white rounded-t-3xl">
              <h3 className="font-extrabold text-sm uppercase tracking-wider">Pendaftaran Presensi Manual</h3>
              <button onClick={() => setManualModalOpen(false)} className="text-white/80 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-left">
              {formError && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Type selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kategori</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualForm({ ...manualForm, type: 'PESERTA' })}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      manualForm.type === 'PESERTA'
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'bg-gray-50 dark:bg-dark-950 text-gray-500 border-gray-200 dark:border-dark-800'
                    }`}
                  >
                    Mahasiswa (Peserta)
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualForm({ ...manualForm, type: 'TAMU' })}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      manualForm.type === 'TAMU'
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'bg-gray-50 dark:bg-dark-950 text-gray-500 border-gray-200 dark:border-dark-800'
                    }`}
                  >
                    Tamu Undangan
                  </button>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-xs dark:text-white"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nomor HP</label>
                <input
                  type="text"
                  required
                  value={manualForm.phone}
                  onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                  placeholder="Contoh: 08123456789"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-xs dark:text-white"
                />
              </div>

              {manualForm.type === 'PESERTA' ? (
                <>
                  {/* NIM */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">NIM</label>
                    <input
                      type="text"
                      required
                      value={manualForm.nim}
                      onChange={(e) => setManualForm({ ...manualForm, nim: e.target.value })}
                      placeholder="Masukkan NIM"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-xs dark:text-white"
                    />
                  </div>

                  {/* Prodi */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Program Studi</label>
                    <select
                      value={manualForm.prodi}
                      onChange={(e) => setManualForm({ ...manualForm, prodi: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-xs dark:text-white"
                    >
                      <option value="">Pilih Program Studi</option>
                      <option value="Teknik Informatika">Teknik Informatika</option>
                      <option value="Sistem Informasi">Sistem Informasi</option>
                      <option value="Teknologi Informasi">Teknologi Informasi</option>
                      <option value="Pendidikan Teknologi Informasi">Pendidikan Teknologi Informasi</option>
                    </select>
                  </div>

                  {/* Fakultas */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fakultas</label>
                    <input
                      type="text"
                      readOnly
                      value={manualForm.fakultas}
                      className="w-full px-4 py-2.5 bg-gray-100 dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl text-xs text-gray-500"
                    />
                  </div>
                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email (Opsional)</label>
                    <input
                      type="email"
                      value={manualForm.email}
                      onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                      placeholder="Contoh: email@students.com"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-xs dark:text-white"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Instansi */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Instansi / Lembaga</label>
                    <input
                      type="text"
                      required
                      value={manualForm.institution}
                      onChange={(e) => setManualForm({ ...manualForm, institution: e.target.value })}
                      placeholder="Masukkan nama instansi"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-xs dark:text-white"
                    />
                  </div>

                  {/* Jabatan */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jabatan</label>
                    <input
                      type="text"
                      required
                      value={manualForm.position}
                      onChange={(e) => setManualForm({ ...manualForm, position: e.target.value })}
                      placeholder="Masukkan jabatan"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-xs dark:text-white"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-xs shadow-md transition-all pt-3 cursor-pointer"
              >
                Simpan & Catat Kehadiran
              </button>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};

export default AdminAttendance;
