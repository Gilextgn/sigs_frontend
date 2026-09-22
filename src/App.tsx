import { Suspense } from 'react';
import { lazyPage } from '@/shared/lib/lazyPage';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { RequireAuth, RequirePlatform, RequireSchool } from '@/features/auth/RequireAuth';
import { SuspendedScreen } from '@/features/auth/SuspendedScreen';
import { ForcePasswordChangeScreen } from '@/features/auth/ForcePasswordChangeScreen';
import { SessionLoader } from '@/features/auth/SessionLoader';
import { PlatformLayout } from '@/features/platform/PlatformLayout';
import { AppLayout } from '@/shared/layouts/AppLayout';
import { Loader } from '@/shared/components/Loader';

// Chaque page est chargée à la demande : le bundle initial ne contient que
// le shell (layout, auth, routeur) au lieu de l'application entière.
const PlatformPage = lazyPage(() => import('@/features/platform/PlatformPage'));
const PlatformAccountPage = lazyPage(() => import('@/features/platform/PlatformAccountPage'));
const LoginPage = lazyPage(() => import('@/features/auth/LoginPage'));
const DashboardPage = lazyPage(() => import('@/features/dashboard/DashboardPage'));
const StatisticsPage = lazyPage(() => import('@/features/dashboard/StatisticsPage'));
const StudentsPage = lazyPage(() => import('@/features/students/StudentsPage'));
const ClassesPage = lazyPage(() => import('@/features/classes/ClassesPage'));
const TranchesPage = lazyPage(() => import('@/features/tranches/TranchesPage'));
const FeesPage = lazyPage(() => import('@/features/fees/FeesPage'));
const PaymentsPage = lazyPage(() => import('@/features/payments/PaymentsPage'));
const DebtorsPage = lazyPage(() => import('@/features/debtors/DebtorsPage'));
const TeachersPage = lazyPage(() => import('@/features/teachers/TeachersPage'));
const PayrollPage = lazyPage(() => import('@/features/payroll/PayrollPage'));
const UsersPage = lazyPage(() => import('@/features/users/UsersPage'));
const SecurityPage = lazyPage(() => import('@/features/security/SecurityPage'));
const SettingsPage = lazyPage(() => import('@/features/settings/SettingsPage'));
const LandingPage = lazyPage(() => import('@/features/landing/LandingPage'));
const RentreePage = lazyPage(() => import('@/features/rentree/RentreePage'));
const YearClosingPage = lazyPage(() => import('@/features/settings/YearClosingPage'));
const SchedulePage = lazyPage(() => import('@/features/teachers/SchedulePage'));
const AttendancePage = lazyPage(() => import('@/features/teachers/AttendancePage'));
const SubjectsPage = lazyPage(() => import('@/features/teachers/SubjectsPage'));

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
  const { user, isLoading, hadSession, serverUnreachable, isPlatformOwner } = useAuth();

  // Personne n'était connecté sur ce navigateur : la vitrine s'affiche tout
  // de suite, sans attendre le serveur (la vérification continue en fond et
  // bascule sur l'application si une session existe malgré tout).
  if (!user && !hadSession) {
    return <LandingPage />;
  }

  if (isLoading || serverUnreachable) {
    return <SessionLoader />;
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
  const { suspension, user } = useAuth();

  // Une école suspendue n'a plus accès à rien, quelle que soit la page ouverte.
  if (suspension) {
    return <SuspendedScreen info={suspension} />;
  }

  // Mot de passe temporaire : il faut d'abord choisir le sien.
  if (user?.must_change_password) {
    return <ForcePasswordChangeScreen />;
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
              <Route path="/platform/account" element={<PlatformAccountPage />} />
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
