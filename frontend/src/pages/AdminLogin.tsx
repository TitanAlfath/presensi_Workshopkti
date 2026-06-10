import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { ShieldCheck, Mail, Lock, AlertTriangle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'SUPER_ADMIN';
  };
}

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await apiClient.post<LoginResponse>('/auth/login', data);
      const { token, user } = res.data;
      
      // Save in context
      login(token, user);
      
      // Redirect to admin dashboard
      navigate('/admin');
    } catch (err: any) {
      console.error('Error logging in', err);
      if (err.response && err.response.data && err.response.data.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage('Terjadi kesalahan masuk. Pastikan email dan password benar.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto space-y-6 animate-slide-up">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-brand-500 transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Kembali ke Halaman Depan</span>
      </button>

      {/* Login Card */}
      <div className="bg-white dark:bg-dark-900 rounded-3xl shadow-xl border border-gray-150 dark:border-dark-800/80 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-brand-50 dark:bg-brand-900/20 text-brand-500 rounded-2xl flex items-center justify-center shadow-sm">
            <ShieldCheck size={26} className="stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">Portal Admin</h2>
          <p className="text-xs text-gray-500 dark:text-dark-400">Silakan masuk menggunakan akun administrator Anda</p>
        </div>

        {/* Error notice */}
        {errorMessage && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl flex gap-3 text-red-600 dark:text-red-400 text-xs leading-relaxed animate-fade-in">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <div>
              <h5 className="font-bold">Gagal Masuk</h5>
              <p className="mt-0.5 font-medium">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 dark:text-dark-400 uppercase tracking-wider">Alamat Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                <Mail size={16} />
              </span>
              <input
                type="email"
                placeholder="admin.utama@diesnat.ac.id"
                {...register('email', { required: 'Alamat email wajib diisi' })}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all dark:text-white"
              />
            </div>
            {errors.email && <span className="text-[10px] text-red-500 font-bold block">{errors.email.message}</span>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 dark:text-dark-400 uppercase tracking-wider">Kata Sandi</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                {...register('password', { required: 'Kata sandi wajib diisi' })}
                className="w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-dark-950 border border-gray-200 dark:border-dark-800 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span className="text-[10px] text-red-500 font-bold block">{errors.password.message}</span>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 dark:disabled:bg-dark-800 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 hover:shadow-brand-500/35 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Menghubungkan...</span>
              </>
            ) : (
              <span>Masuk Sekarang</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
