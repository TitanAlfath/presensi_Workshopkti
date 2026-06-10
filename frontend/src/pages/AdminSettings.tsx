import React, { useEffect, useState, useRef } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Download, Upload, AlertTriangle, CheckCircle, Info, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  location: string;
  date: string;
  description: string;
  logo: string | null;
  banner: string | null;
}

const AdminSettings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'EDIT_ACTIVE' | 'CREATE_NEW' | 'DATABASE' | 'SECURITY'>('EDIT_ACTIVE');
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Backup & Restore states
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<{ success: boolean; text: string } | null>(null);
  const restoreFileInputRef = useRef<HTMLInputElement | null>(null);

  // Form refs/states
  const [editForm, setEditForm] = useState({
    name: '',
    location: '',
    date: '',
    description: ''
  });
  const [editLogo, setEditLogo] = useState<File | null>(null);
  const [editBanner, setEditBanner] = useState<File | null>(null);

  const [newForm, setNewForm] = useState({
    name: '',
    location: '',
    date: '',
    description: ''
  });
  const [newLogo, setNewLogo] = useState<File | null>(null);
  const [newBanner, setNewBanner] = useState<File | null>(null);

  // Security states
  const [securityForm, setSecurityForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityMsg, setSecurityMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  const fetchActiveEvent = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/event/active');
      if (res.data) {
        setActiveEvent(res.data);
        
        // Format ISO Date for input datetime-local format: YYYY-MM-DDThh:mm
        const dateObj = new Date(res.data.date);
        const tzOffset = dateObj.getTimezoneOffset() * 60000; // in ms
        const localISOTime = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16);

        setEditForm({
          name: res.data.name,
          location: res.data.location,
          date: localISOTime,
          description: res.data.description
        });
      }
    } catch (err) {
      console.error('Failed to load active event in settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveEvent();
  }, []);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent) return;
    setSubmitting(true);
    setMsg(null);

    const formData = new FormData();
    formData.append('name', editForm.name);
    formData.append('location', editForm.location);
    formData.append('date', editForm.date);
    formData.append('description', editForm.description);
    
    if (editLogo) formData.append('logo', editLogo);
    if (editBanner) formData.append('banner', editBanner);

    try {
      await apiClient.put(`/event/update/${activeEvent.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMsg({ success: true, text: 'Detail event aktif berhasil diperbarui!' });
      fetchActiveEvent();
    } catch (err: any) {
      console.error('Failed to update event details', err);
      setMsg({ success: false, text: err.response?.data?.message || 'Gagal memperbarui detail event.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);

    const formData = new FormData();
    formData.append('name', newForm.name);
    formData.append('location', newForm.location);
    formData.append('date', newForm.date);
    formData.append('description', newForm.description);
    
    if (newLogo) formData.append('logo', newLogo);
    if (newBanner) formData.append('banner', newBanner);

    try {
      await apiClient.post('/event/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setMsg({ success: true, text: 'Event baru berhasil dibuat dan diaktifkan!' });
      
      // Reset new form
      setNewForm({ name: '', location: '', date: '', description: '' });
      setNewLogo(null);
      setNewBanner(null);

      // Reload
      fetchActiveEvent();
    } catch (err: any) {
      console.error('Failed to create event', err);
      setMsg({ success: false, text: err.response?.data?.message || 'Gagal membuat event baru.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger Backup JSON download
  const handleBackup = async () => {
    try {
      const response = await apiClient.get('/settings/backup', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Backup_Database_Presensi_${Date.now()}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading backup', err);
      alert('Gagal mengekstrak backup database.');
    }
  };

  // Trigger Restore database
  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    const files = restoreFileInputRef.current?.files;
    if (!files || files.length === 0) {
      alert('Pilih file backup JSON terlebih dahulu.');
      return;
    }

    if (!window.confirm('PERINGATAN: Memulihkan database akan menghapus seluruh data presensi, peserta, tamu, dan event yang saat ini terdaftar. Apakah Anda yakin ingin melanjutkan?')) {
      return;
    }

    setRestoreLoading(true);
    setRestoreMsg(null);

    const formData = new FormData();
    formData.append('file', files[0]);

    try {
      const res = await apiClient.post('/settings/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setRestoreMsg({
        success: true,
        text: `Database berhasil dipulihkan! Rincian record terbuat: ${JSON.stringify(res.data.details.counts)}`
      });
      fetchActiveEvent();
    } catch (err: any) {
      console.error('Error restoring DB', err);
      setRestoreMsg({
        success: false,
        text: err.response?.data?.message || 'Gagal memulihkan database dari file backup.'
      });
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      setSecurityMsg({ success: false, text: 'Konfirmasi password baru tidak cocok!' });
      return;
    }
    if (securityForm.newPassword.length < 6) {
      setSecurityMsg({ success: false, text: 'Password baru minimal 6 karakter!' });
      return;
    }
    
    setSecurityLoading(true);
    setSecurityMsg(null);
    try {
      const res = await apiClient.post('/auth/change-password', {
        oldPassword: securityForm.oldPassword,
        newPassword: securityForm.newPassword
      });
      setSecurityMsg({ success: true, text: res.data.message || 'Password berhasil diubah.' });
      setSecurityForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      console.error('Error changing password', err);
      setSecurityMsg({ success: false, text: err.response?.data?.message || 'Gagal mengubah password.' });
    } finally {
      setSecurityLoading(false);
    }
  };

  if (loading && activeTab === 'EDIT_ACTIVE') {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Settings Navigation Tabs */}
      <div className="bg-white dark:bg-dark-900 p-1.5 rounded-2xl border border-gray-150 dark:border-dark-800 shadow-sm flex">
        <button
          onClick={() => { setActiveTab('EDIT_ACTIVE'); setMsg(null); }}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'EDIT_ACTIVE'
              ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/10'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-dark-300'
          }`}
        >
          Edit Event Aktif
        </button>

        <button
          onClick={() => { setActiveTab('CREATE_NEW'); setMsg(null); }}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'CREATE_NEW'
              ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/10'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-dark-300'
          }`}
        >
          Buat Event Baru
        </button>

        <button
          onClick={() => { setActiveTab('DATABASE'); setMsg(null); setRestoreMsg(null); }}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'DATABASE'
              ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/10'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-dark-300'
          }`}
        >
          Backup & Restore
        </button>

        <button
          onClick={() => { setActiveTab('SECURITY'); setMsg(null); setSecurityMsg(null); }}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'SECURITY'
              ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/10'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-dark-300'
          }`}
        >
          Keamanan Akun
        </button>
      </div>

      {/* Success/Error Alerts */}
      {msg && (
        <div className={`p-4 border rounded-2xl flex gap-3 text-xs font-semibold leading-relaxed animate-fade-in ${
          msg.success
            ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400'
            : 'bg-red-50 border-red-200 text-red-600 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400'
        }`}>
          {msg.success ? <CheckCircle size={18} className="shrink-0" /> : <AlertTriangle size={18} className="shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* TAB 1: Edit Event */}
      {activeTab === 'EDIT_ACTIVE' && (
        <div className="bg-white dark:bg-dark-900 rounded-3xl p-6 md:p-8 border border-gray-150 dark:border-dark-800 shadow-sm">
          {!activeEvent ? (
            <div className="text-center py-6">
              <p className="text-gray-400">Belum ada event aktif. Silakan buat event baru.</p>
            </div>
          ) : (
            <form onSubmit={handleEditSubmit} className="space-y-4 text-left">
              <h3 className="text-sm font-bold dark:text-white uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-dark-800 pb-3">
                Identitas Event Utama
              </h3>

              {/* Event Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama Event</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Dies Natalis FASTIKOM"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-xs dark:text-white"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Location */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lokasi</label>
                  <input
                    type="text"
                    required
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    placeholder="Aula Utama Lantai 3"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-xs dark:text-white"
                  />
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tanggal & Waktu Mulai</label>
                  <input
                    type="datetime-local"
                    required
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-xs dark:text-white"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deskripsi Acara</label>
                <textarea
                  rows={4}
                  required
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Tulis deskripsi acara..."
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-xs dark:text-white focus:outline-none"
                ></textarea>
              </div>

              <h3 className="text-sm font-bold dark:text-white uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-dark-800 pt-4 pb-3">
                Gambar & Branding Event
              </h3>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Logo file */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">File Logo Event (Kotak, PNG/JPG)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditLogo(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                  />
                </div>

                {/* Banner file */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">File Banner/Background Event (Landscape)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditBanner(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white font-bold rounded-xl text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer pt-3"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <span>Simpan Perubahan</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: Create New Event */}
      {activeTab === 'CREATE_NEW' && (
        <div className="bg-white dark:bg-dark-900 rounded-3xl p-6 md:p-8 border border-gray-150 dark:border-dark-800 shadow-sm">
          <form onSubmit={handleCreateSubmit} className="space-y-4 text-left">
            <h3 className="text-sm font-bold dark:text-white uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-dark-800 pb-3">
              Buat Kegiatan Baru
            </h3>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl flex gap-2 text-amber-700 dark:text-amber-400 text-xs font-semibold">
              <Info size={16} className="shrink-0 mt-0.5" />
              <span>Membuat event baru akan otomatis menjadikannya event aktif utama untuk sistem presensi mahasiswa/tamu.</span>
            </div>

            {/* Event Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama Event</label>
              <input
                type="text"
                required
                value={newForm.name}
                onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                placeholder="Dies Natalis FASTIKOM ke-16"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-xs dark:text-white"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lokasi</label>
                <input
                  type="text"
                  required
                  value={newForm.location}
                  onChange={(e) => setNewForm({ ...newForm, location: e.target.value })}
                  placeholder="Gedung Olahraga Kampus A"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-xs dark:text-white"
                />
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tanggal & Waktu Mulai</label>
                <input
                  type="datetime-local"
                  required
                  value={newForm.date}
                  onChange={(e) => setNewForm({ ...newForm, date: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-xs dark:text-white"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deskripsi Acara</label>
              <textarea
                rows={4}
                required
                value={newForm.description}
                onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                placeholder="Tulis ringkasan detail acara..."
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-xs dark:text-white focus:outline-none"
              ></textarea>
            </div>

            <h3 className="text-sm font-bold dark:text-white uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-dark-800 pt-4 pb-3">
              Media Acara
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Logo file */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">File Logo Event</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewLogo(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                />
              </div>

              {/* Banner file */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">File Banner Event</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewBanner(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer pt-3"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              <span>Buat & Aktifkan Event</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: Backup & Restore */}
      {activeTab === 'DATABASE' && (
        <div className="bg-white dark:bg-dark-900 rounded-3xl p-6 md:p-8 border border-gray-150 dark:border-dark-800 shadow-sm space-y-8">
          {/* Backup Panel */}
          <div className="space-y-4 text-left">
            <h3 className="text-sm font-bold dark:text-white uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-dark-800 pb-3">
              Backup Database
            </h3>
            <p className="text-xs text-gray-500 dark:text-dark-400 font-semibold leading-relaxed">
              Mengekstrak seluruh tabel database (User, Event, Presensi, Peserta, Tamu, Pengaturan) menjadi satu file JSON. Gunakan ini untuk pencadangan rutin atau migrasi sistem.
            </p>
            <button
              onClick={handleBackup}
              className="flex items-center gap-2 px-5 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/15 transition-all cursor-pointer hover:-translate-y-0.5"
            >
              <Download size={15} />
              <span>Unduh Backup Database (.json)</span>
            </button>
          </div>

          {/* Restore Panel */}
          <div className="space-y-4 border-t border-gray-100 dark:border-dark-800 pt-8 text-left">
            <h3 className="text-sm font-bold dark:text-white uppercase tracking-widest text-red-500 border-b border-gray-100 dark:border-dark-800 pb-3">
              Pulihkan Database (Restore)
            </h3>

            {!isSuperAdmin ? (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl flex gap-3 text-red-600 dark:text-red-400 text-xs font-semibold">
                <AlertTriangle size={20} className="shrink-0" />
                <div>
                  <h5 className="font-extrabold">Akses Terbatas</h5>
                  <p className="mt-0.5 font-medium">Modul pemulihan database hanya dapat diakses oleh pengguna dengan role Super Admin.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl flex gap-3 text-red-600 dark:text-red-400 text-xs font-semibold">
                  <AlertTriangle size={20} className="shrink-0" />
                  <div>
                    <h5 className="font-extrabold">Peringatan Kritis!</h5>
                    <p className="mt-0.5 font-medium">Memulihkan database dari file backup akan menghapus seluruh data sistem saat ini secara permanen. Pastikan Anda telah mendownload backup data saat ini sebelum melanjutkan.</p>
                  </div>
                </div>

                {restoreMsg && (
                  <div className={`p-4 border rounded-2xl flex gap-3 text-xs font-semibold leading-relaxed animate-fade-in ${
                    restoreMsg.success
                      ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400'
                      : 'bg-red-50 border-red-200 text-red-600 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400'
                  }`}>
                    {restoreMsg.success ? <CheckCircle size={18} className="shrink-0" /> : <AlertTriangle size={18} className="shrink-0" />}
                    <span>{restoreMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleRestore} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">File Backup JSON</label>
                    <input
                      type="file"
                      ref={restoreFileInputRef}
                      accept=".json"
                      required
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={restoreLoading}
                    className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/15 transition-all cursor-pointer hover:-translate-y-0.5"
                  >
                    {restoreLoading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Memulihkan Database...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={15} />
                        <span>Mulai Pemulihan Database</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Security (Ubah Password) */}
      {activeTab === 'SECURITY' && (
        <div className="bg-white dark:bg-dark-900 rounded-3xl p-6 md:p-8 border border-gray-150 dark:border-dark-800 shadow-sm space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-xl">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-bold dark:text-white">Keamanan Maksimal</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-dark-400 font-medium">
              Ubah password secara berkala. Pastikan password Anda kuat dan hanya diketahui oleh Anda sendiri.
            </p>
          </div>

          {securityMsg && (
            <div className={`p-4 border rounded-2xl flex gap-3 text-xs font-semibold leading-relaxed animate-fade-in ${
              securityMsg.success
                ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400'
                : 'bg-red-50 border-red-200 text-red-600 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400'
            }`}>
              {securityMsg.success ? <CheckCircle size={18} className="shrink-0" /> : <AlertTriangle size={18} className="shrink-0" />}
              <span>{securityMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSecuritySubmit} className="space-y-5 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Password Lama</label>
              <div className="relative">
                <input
                  type={showOldPwd ? "text" : "password"}
                  required
                  value={securityForm.oldPassword}
                  onChange={(e) => setSecurityForm({ ...securityForm, oldPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-sm focus:outline-none focus:border-brand-500 transition-all dark:text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPwd(!showOldPwd)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showOldPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Password Baru</label>
                <div className="relative">
                  <input
                    type={showNewPwd ? "text" : "password"}
                    required
                    value={securityForm.newPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-sm focus:outline-none focus:border-brand-500 transition-all dark:text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Konfirmasi Password Baru</label>
                <input
                  type={showNewPwd ? "text" : "password"}
                  required
                  value={securityForm.confirmPassword}
                  onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                  placeholder="Ulangi password baru"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-sm focus:outline-none focus:border-brand-500 transition-all dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={securityLoading}
              className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white font-bold rounded-xl text-xs shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {securityLoading && <Loader2 size={16} className="animate-spin" />}
              <span>Simpan Password Baru</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
