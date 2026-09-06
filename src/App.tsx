import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthContext';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { AppLayout } from '@/shared/layouts/AppLayout';

import LoginPage from '@/features/auth/LoginPage';
import DashboardPage from '@/features/dashboard/DashboardPage';
import StatisticsPage from '@/features/dashboard/StatisticsPage';
import StudentsPage from '@/features/students/StudentsPage';
import ClassesPage from '@/features/classes/ClassesPage';
import TranchesPage from '@/features/tranches/TranchesPage';
import FeesPage from '@/features/fees/FeesPage';
import PaymentsPage from '@/features/payments/PaymentsPage';
import DebtorsPage from '@/features/debtors/DebtorsPage';
import TeachersPage from '@/features/teachers/TeachersPage';
import PayrollPage from '@/features/payroll/PayrollPage';
import UsersPage from '@/features/users/UsersPage';
import SecurityPage from '@/features/security/SecurityPage';
import SettingsPage from '@/features/settings/SettingsPage';
import CommercialPage from '@/features/commercial/CommercialPage';
import OwnerDashboardPage from '@/features/commercial/OwnerDashboardPage';
import SchedulePage from '@/features/teachers/SchedulePage';
import AttendancePage from '@/features/teachers/AttendancePage';
import SubjectsPage from '@/features/teachers/SubjectsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </AuthProvider>
  );
}
