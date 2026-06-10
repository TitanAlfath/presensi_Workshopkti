import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import apiClient from '../api/client';
import { Users, User, ArrowLeft, ArrowRight, ShieldAlert, Check } from 'lucide-react';

interface Event {
  id: string;
  name: string;
}

interface FormData {
  name: string;
  phone: string;
  nim?: string;
  prodi?: string;
  fakultas?: string;
  email?: string;
}

const AttendanceForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<'PESERTA' | 'TAMU'>('PESERTA');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [lookupNim, setLookupNim] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FormData>();

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true);
        const eventRes = await apiClient.get('/event/active');
        if (eventRes.data) {
          setActiveEvent(eventRes.data);
        }

        // Handle URL parameters
        const cat = searchParams.get('category');
        const nim = searchParams.get('nim');
        const phone = searchParams.get('phone');

        let targetCategory: 'PESERTA' | 'TAMU' = 'PESERTA';
        if (cat === 'PESERTA' || cat === 'TAMU') {
          targetCategory = cat;
          setCategory(cat);
        } else if (nim) {
          targetCategory = 'PESERTA';
          setCategory('PESERTA');
        } else if (phone) {
          targetCategory = 'TAMU';
          setCategory('TAMU');
        }

        if (targetCategory === 'PESERTA' && nim) {
          reset({ nim, fakultas: 'FASTIKOM' });
        } else if (targetCategory === 'TAMU' && phone) {
          reset({ phone });
        }
      } catch (err) {
        console.error('Error in form loading', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [searchParams, reset]);

  const onSubmit = async (data: FormData) => {
    if (!activeEvent) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const payload: any = {
      eventId: activeEvent.id,
      type: category,
      name: data.name,
      phone: data.phone
    };

    if (category === 'PESERTA') {
      payload.nim = data.nim || lookupNim; // Use lookupNim if data.nim is not in form
      payload.email = data.email;
    } else {
      payload.institution = data.prodi;
      payload.position = data.nim ? `${data.fakultas} (${data.nim})` : data.fakultas;
    }

    try {
      const res = await apiClient.post('/attendance/check-in', payload);
      // On success, redirect to success page and pass attendance details
      navigate('/success', { state: { attendance: res.data.attendance } });
    } catch (err: any) {
      console.error('Error submitting attendance', err);
      if (err.response && err.response.data && err.response.data.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage('Terjadi kesalahan koneksi. Silakan coba beberapa saat lagi.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategoryChange = (cat: 'PESERTA' | 'TAMU') => {
    setCategory(cat);
    setErrorMessage(null);
    setStep(1);
    setLookupNim('');
    reset({ fakultas: 'FASTIKOM' }); // reset form states on tab change
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupNim.trim()) return;
    setIsLookingUp(true);
    setErrorMessage(null);
    try {
      const eventIdParam = activeEvent ? `&eventId=${activeEvent.id}` : '';
      const res = await apiClient.get(`/attendance/lookup?nim=${lookupNim}${eventIdParam}`);
      if (res.data && res.data.found && res.data.data) {
        if (res.data.alreadyCheckedIn) {
          setErrorMessage(`Peserta dengan NIM ${lookupNim} sudah melakukan presensi pada event ini!`);
          return;
        }
        const participant = res.data.data;
        // Autofill the form with existing data
        reset({
          name: participant.name,
          nim: participant.nim,
          prodi: participant.prodi,
          fakultas: participant.fakultas,
          phone: participant.phone || '',
          email: participant.email || ''
        });
        setStep(2);
      } else {
        setErrorMessage('Data peserta tidak ditemukan. Pastikan NIM Anda sudah didaftarkan.');
      }
    } catch (err: any) {
      console.error('Error looking up participant', err);
      setErrorMessage('Terjadi kesalahan saat mencari data. Coba lagi.');
    } finally {
      setIsLookingUp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 border-4 border-[#1d3d75] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[#1d3d75] font-bold">Memuat formulir...</p>
      </div>
    );
  }

  if (!activeEvent) {
    return (
      <div className="text-center py-12 bg-white dark:bg-dark-900 rounded-3xl border border-gray-150 p-8 shadow-xl max-w-md mx-auto">
        <ShieldAlert className="mx-auto text-[#c23b2b]" size={50} />
        <h3 className="text-xl font-bold mt-4 text-[#1d3d75] dark:text-white">Tidak Ada Event Aktif</h3>
        <p className="text-gray-500 dark:text-dark-400 mt-2 text-sm">Formulir presensi tidak dapat dibuka saat ini.</p>
        <button 
          onClick={() => navigate('/')} 
          className="mt-6 px-6 py-2.5 bg-[#1d3d75] hover:bg-[#c23b2b] text-white font-bold rounded-xl transition-all shadow-md text-sm"
        >
          Kembali ke Depan
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-slide-up mt-4">
      {/* Main card */}
      <div className="bg-white dark:bg-dark-900 rounded-3xl shadow-xl border border-gray-150 dark:border-dark-800/80 overflow-hidden">
        {/* Banner header */}
        <div className="bg-[#1d3d75] px-6 py-6 text-white border-b-4 border-[#e28743]">
          <span className="text-[10px] font-black tracking-widest uppercase text-[#76b5c5]">FORMULIR PRESENSI KEHADIRAN</span>
          <h2 className="text-xl font-black mt-1 leading-snug">Workshop Karya Tulis Ilmiah</h2>
          <p className="text-xs text-[#e28743] font-bold mt-0.5">“Problematika dan Solusi Cerdas KTI Mahasiswa”</p>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {/* Category Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-gray-50 dark:bg-dark-950 rounded-2xl border border-gray-150 dark:border-dark-800">
            <button
              onClick={() => handleCategoryChange('PESERTA')}
              className={`flex items-center justify-center gap-2 py-3 text-xs font-black rounded-xl transition-all ${
                category === 'PESERTA'
                  ? 'bg-white dark:bg-dark-800 text-[#1d3d75] dark:text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-dark-300'
              }`}
            >
              <User size={14} />
              <span>Mahasiswa / Dosen / Civitas</span>
            </button>

            <button
              onClick={() => handleCategoryChange('TAMU')}
              className={`flex items-center justify-center gap-2 py-3 text-xs font-black rounded-xl transition-all ${
                category === 'TAMU'
                  ? 'bg-white dark:bg-dark-800 text-[#1d3d75] dark:text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-dark-300'
              }`}
            >
              <Users size={14} />
              <span>Tamu Undangan</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl flex gap-3 text-red-600 dark:text-red-400 text-xs leading-relaxed animate-fade-in">
              <ShieldAlert size={18} className="flex-shrink-0" />
              <div>
                <h5 className="font-bold">Presensi Gagal</h5>
                <p className="mt-0.5 font-medium">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Form */}
          {/* Form */}
          {category === 'PESERTA' && step === 1 ? (
            <form onSubmit={handleLookup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 dark:text-dark-400 uppercase tracking-widest">NIM / NIDN (Nomor Induk)</label>
                <input
                  type="text"
                  value={lookupNim}
                  onChange={(e) => setLookupNim(e.target.value)}
                  placeholder="Masukkan NIM atau NIDN Anda"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-sm focus:outline-none focus:border-[#1d3d75] focus:ring-1 focus:ring-[#1d3d75] transition-all dark:text-white font-semibold"
                />
              </div>
              <button
                type="submit"
                disabled={isLookingUp || !lookupNim.trim()}
                className="w-full py-4 mt-4 bg-[#1d3d75] hover:bg-[#c23b2b] disabled:bg-gray-300 dark:disabled:bg-dark-800 text-white rounded-2xl font-black shadow-lg shadow-[#1d3d75]/10 hover:shadow-[#c23b2b]/20 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                {isLookingUp ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Mencari Data...</span>
                  </>
                ) : (
                  <>
                    <span>Cari Data</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-fade-in">
              {category === 'PESERTA' && !errorMessage && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl mb-4">
                  <p className="text-xs text-green-700 dark:text-green-400 font-bold">✅ Data ditemukan. Silakan lengkapi informasi berikut.</p>
                </div>
              )}
              {/* Common field: Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 dark:text-dark-400 uppercase tracking-widest">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="Masukkan nama lengkap sesuai identitas"
                  {...register('name', { required: 'Nama lengkap wajib diisi' })}
                  readOnly={category === 'PESERTA'}
                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-sm focus:outline-none focus:border-[#1d3d75] transition-all dark:text-white font-semibold ${category === 'PESERTA' ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
                {errors.name && <span className="text-[10px] text-red-500 font-bold block">{errors.name.message}</span>}
              </div>

              {/* NIM / NIDN / WhatsApp */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 dark:text-dark-400 uppercase tracking-widest">
                  {category === 'PESERTA' ? 'NIM / NIDN (Nomor Induk)' : 'NIM / NIDN / No. HP (Jika Eksternal)'}
                </label>
                <input
                  type="text"
                  placeholder={category === 'PESERTA' ? "Masukkan NIM atau NIDN Anda" : "Masukkan NIM/NIDN atau No. HP Anda"}
                  {...register('nim', {
                    required: 'Kolom ini wajib diisi',
                    pattern: { value: /^[a-zA-Z0-9.\-\s]+$/, message: 'Format NIM/NIDN/No. HP tidak valid' }
                  })}
                  readOnly={category === 'PESERTA'}
                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-sm focus:outline-none focus:border-[#1d3d75] transition-all dark:text-white font-semibold ${category === 'PESERTA' ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
                {errors.nim && <span className="text-[10px] text-red-500 font-bold block">{errors.nim.message}</span>}
              </div>

              {/* Program Studi / Instansi */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 dark:text-dark-400 uppercase tracking-widest">Program Studi / Instansi</label>
                <input
                  type="text"
                  placeholder="Contoh: Teknik Informatika, Rektorat, Humas"
                  {...register('prodi', { required: 'Program studi / instansi wajib diisi' })}
                  readOnly={category === 'PESERTA'}
                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-sm focus:outline-none focus:border-[#1d3d75] transition-all dark:text-white font-semibold ${category === 'PESERTA' ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
                {errors.prodi && <span className="text-[10px] text-red-500 font-bold block">{errors.prodi.message}</span>}
              </div>

              {/* Fakultas / Rektorat / Eksternal */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 dark:text-dark-400 uppercase tracking-widest">Fakultas / Rektorat / Eksternal</label>
                {category === 'PESERTA' ? (
                  <input
                    type="text"
                    {...register('fakultas')}
                    readOnly
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-sm focus:outline-none opacity-70 cursor-not-allowed dark:text-white font-semibold"
                  />
                ) : (
                  <select
                    {...register('fakultas', { required: 'Fakultas / Rektorat / Eksternal wajib dipilih' })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-sm focus:outline-none focus:border-[#1d3d75] transition-all dark:text-white cursor-pointer font-semibold"
                  >
                    <option value="">Pilih Fakultas / Rektorat / Eksternal</option>
                    <option value="FASTIKOM">FASTIKOM</option>
                    <option value="FITK">FITK</option>
                    <option value="FEB">FEB</option>
                    <option value="FIKES">FIKES</option>
                    <option value="FSH">FSH</option>
                    <option value="FBS">FBS</option>
                    <option value="FKSP">FKSP</option>
                    <option value="Rektorat">Rektorat</option>
                    <option value="Eksternal">Eksternal / Umum</option>
                  </select>
                )}
                {errors.fakultas && <span className="text-[10px] text-red-500 font-bold block">{errors.fakultas.message}</span>}
              </div>

              {/* Common field: Phone */}
              {category === 'TAMU' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 dark:text-dark-400 uppercase tracking-widest">Nomor HP / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="Contoh: 08123456789"
                    {...register('phone', {
                      required: 'Nomor HP wajib diisi',
                      pattern: { value: /^08[0-9]{8,11}$/, message: 'Nomor HP harus diawali 08 dan memiliki panjang 10-13 digit' }
                    })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-sm focus:outline-none focus:border-[#1d3d75] focus:ring-1 focus:ring-[#1d3d75] transition-all dark:text-white font-semibold"
                  />
                  {errors.phone && <span className="text-[10px] text-red-500 font-bold block">{errors.phone.message}</span>}
                </div>
              )}

              {/* Email specifically for PESERTA */}
              {category === 'PESERTA' && (
                <div className="space-y-1.5 pt-2">
                  <label className="text-[10px] font-black text-gray-500 dark:text-dark-400 uppercase tracking-widest">Alamat Email Aktif</label>
                  <input
                    type="email"
                    placeholder="Contoh: nama@gmail.com"
                    {...register('email', {
                      required: 'Email wajib diisi untuk pengiriman sertifikat',
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Format email tidak valid' }
                    })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-sm focus:outline-none focus:border-[#1d3d75] focus:ring-1 focus:ring-[#1d3d75] transition-all dark:text-white font-semibold"
                  />
                  {errors.email && <span className="text-[10px] text-red-500 font-bold block">{errors.email.message}</span>}
                  <p className="text-[10px] text-[#e28743] font-bold mt-1">
                    * Mohon memasukkan email yang benar guna panitia mengirimkan e-sertifikat.
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 mt-4 bg-[#1d3d75] hover:bg-[#c23b2b] disabled:bg-gray-300 dark:disabled:bg-dark-800 text-white rounded-2xl font-black shadow-lg shadow-[#1d3d75]/10 hover:shadow-[#c23b2b]/20 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Mencatat Kehadiran...</span>
                  </>
                ) : (
                  <>
                    <span>Hadir Sekarang</span>
                    <Check size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceForm;
