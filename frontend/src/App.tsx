import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Components & Layouts
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';

// Public Pages
import AttendanceForm from './pages/AttendanceForm';
import SuccessPage from './pages/SuccessPage';
import QRScannerPage from './pages/QRScannerPage';
import AdminLogin from './pages/AdminLogin';
import PublicAttendanceList from './pages/PublicAttendanceList';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminAttendance from './pages/AdminAttendance';
import AdminParticipants from './pages/AdminParticipants';
import AdminExport from './pages/AdminExport';
import AdminSettings from './pages/AdminSettings';
import AdminKiosk from './pages/AdminKiosk';

const queryClient = new QueryClient();

// Protected Route Wrapper for Admin Views
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-950">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  return (
    <Layout>
      <Routes>
        {/* Public Client Routes */}
        <Route path="/" element={<Navigate to="/check-in" replace />} />
        <Route path="/check-in" element={<AttendanceForm />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/scan" element={<QRScannerPage />} />
        <Route path="/attendees" element={<PublicAttendanceList />} />

        {/* Admin Login Route */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Protected Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/attendance"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminAttendance />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/participants"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminParticipants />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/scan"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <QRScannerPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/kiosk"
          element={
            <ProtectedRoute>
              <AdminKiosk />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/stats"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/export"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminExport />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminSettings />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
