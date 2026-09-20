import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { RequireAuth, RequirePlatform, RequireSchool } from '@/features/auth/RequireAuth';
import { SuspendedScreen } from '@/features/auth/SuspendedScreen';
import { PlatformLayout } from '@/features/platform/PlatformLayout';
import { AppLayout } from '@/shared/layouts/AppLayout';
import { Loader } from '@/shared/components/Loader';

// Chaque page est chargée à la demande : le bundle initial ne contient que
// le shell (layout, auth, routeur) au lieu de l'application entière.
const PlatformPage = lazy(() => import('@/features/platform/PlatformPage'));
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
const LandingPage = lazy(() => import('@/features/landing/LandingPage'));
const RentreePage = lazy(() => import('@/features/rentree/RentreePage'));
const YearClosingPage = lazy(() => import('@/features/settings/YearClosingPage'));
const SchedulePage = lazy(() => import('@/features/teachers/SchedulePage'));
const AttendancePage = lazy(() => import('@/features/teachers/AttendancePage'));
const SubjectsPage = lazy(() => import('@/features/teachers/SubjectsPage'));

function RouteFallback() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <Loader />
    </div>
  );
}

// "/" est publique : visiteur non connecté -> vitrine (LandingPage), connecté -> Dashboard.
// Remplace l'ancien comportement où "/" redirigeait tout visiteur droit vers /login.
function HomeRoute() {
  const { user, isLoading, isPlatformOwner } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Loader />
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  if (isPlatformOwner) {
    return <Navigate to="/platform" replace />;
  }

  return (
    <AppLayout>
      <DashboardPage />
    </AppLayout>
  );
}

function AppRoutes() {
  const { suspension } = useAuth();

  // Une école suspendue n'a plus accès à rien, quelle que soit la page ouverte.
  if (suspension) {
    return <SuspendedScreen info={suspension} />;
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<RequirePlatform />}>
            <Route element={<PlatformLayout />}>
              <Route path="/platform" element={<PlatformPage />} />
            </Route>
          </Route>

          <Route element={<RequireSchool />}>
            <Route element={<AppLayout />}>
              <Route path="/statistics" element={<StatisticsPage />} />
              <Route path="/rentree" element={<RentreePage />} />
              <Route path="/year-closing" element={<YearClosingPage />} />
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
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
