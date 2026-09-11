import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider } from '@/features/auth/AuthContext';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { AppLayout } from '@/shared/layouts/AppLayout';

// Chaque page est chargée à la demande : le bundle initial ne contient que
// le shell (layout, auth, routeur) au lieu de l'application entière.
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const StatisticsPage = lazy(() => import('@/features/dashboard/StatisticsPage'));
const StudentsPage = lazy(() => import('@/features/students/StudentsPage'));
const ClassesPage = lazy(() => import('@/features/classes/ClassesPage'));
const TranchesPage = lazy(() => import('@/features/tranches/TranchesPage'));
const FeesPage = lazy(() => import('@/features/fees/FeesPage'));
const PaymentsPage = lazy(() => import('@/features/payments/PaymentsPage'));
const DebtorsPage = lazy(() => import('@/features/debtors/DebtorsPage'));
const TeachersPage = lazy(() => import('@/features/teachers/TeachersPage'));
const PayrollPage = lazy(() => import('@/features/payroll/PayrollPage'));
const UsersPage = lazy(() => import('@/features/users/UsersPage'));
const SecurityPage = lazy(() => import('@/features/security/SecurityPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const CommercialPage = lazy(() => import('@/features/commercial/CommercialPage'));
const OwnerDashboardPage = lazy(() => import('@/features/commercial/OwnerDashboardPage'));
const SchedulePage = lazy(() => import('@/features/teachers/SchedulePage'));
const AttendancePage = lazy(() => import('@/features/teachers/AttendancePage'));
const SubjectsPage = lazy(() => import('@/features/teachers/SubjectsPage'));

function RouteFallback() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/commercial" element={<CommercialPage />} />

            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/statistics" element={<StatisticsPage />} />
                <Route path="/owner" element={<OwnerDashboardPage />} />
                <Route path="/students" element={<StudentsPage />} />
                <Route path="/classes" element={<ClassesPage />} />
                <Route path="/tranches" element={<TranchesPage />} />
                <Route path="/fees" element={<FeesPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/debtors" element={<DebtorsPage />} />
                <Route path="/teachers" element={<TeachersPage />} />
                <Route path="/schedule" element={<SchedulePage />} />
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/subjects" element={<SubjectsPage />} />
                <Route path="/payroll" element={<PayrollPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/security" element={<SecurityPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
