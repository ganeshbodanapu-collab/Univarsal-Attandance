import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { Dashboard } from '../pages/dashboard/Dashboard';
import { Sites, SiteDetails } from '../pages/sites/Sites';
import { Sections, SectionDetails } from '../pages/sections/Sections';
import { Workers, WorkerDetails } from '../pages/workers/Workers';
import { AttendanceList } from '../pages/attendance/AttendanceList';
import { FaceAttendance } from '../pages/attendance/FaceAttendance';
import { FingerprintAttendance } from '../pages/attendance/FingerprintAttendance';
import { ManualAttendance } from '../pages/attendance/ManualAttendance';
import { Food } from '../pages/food/Food';
import { Advances } from '../pages/advances/Advances';
import { Payments } from '../pages/payments/Payments';
import { Referrers } from '../pages/referrers/Referrers';
import { Commission } from '../pages/commission/Commission';
import { Reports } from '../pages/reports/Reports';
import { Settings } from '../pages/settings/Settings';
import { OpeningEmployees } from '../pages/workers/OpeningEmployees';
import { MultipleSitesEmployees } from '../pages/workers/MultipleSitesEmployees';

import { useAttendanceContext } from '../context/AttendanceContext';
import { SiteLogin } from '../pages/auth/SiteLogin';

export const AppRoutes: React.FC = () => {
  const { currentUser } = useAttendanceContext();

  return (
    <Routes>
      {/* Site Selection & Login Gateway */}
      <Route
        path="/login"
        element={currentUser ? <Navigate to="/dashboard" replace /> : <SiteLogin />}
      />

      {/* Protected Routes inside MainLayout */}
      <Route
        element={
          currentUser ? <MainLayout /> : <Navigate to="/login" replace />
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sites" element={<Sites />} />
        <Route path="/sites/:siteId" element={<SiteDetails />} />
        <Route path="/sections" element={<Sections />} />
        <Route path="/sections/:sectionId" element={<SectionDetails />} />
        <Route path="/workers" element={<Workers />} />
        <Route path="/workers/:workerId" element={<WorkerDetails />} />
        <Route path="/opening-employees" element={<OpeningEmployees />} />
        <Route path="/multi-site-employees" element={<MultipleSitesEmployees />} />
        <Route path="/attendance" element={<AttendanceList />} />
        <Route path="/attendance/face" element={<FaceAttendance />} />
        <Route path="/attendance/fingerprint" element={<FingerprintAttendance />} />
        <Route path="/attendance/manual" element={<ManualAttendance />} />
        <Route path="/food" element={<Food />} />
        <Route path="/advances" element={<Advances />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/referrers" element={<Referrers />} />
        <Route path="/commission" element={<Commission />} />
        <Route path="/monthly-settlement" element={<Navigate to="/reports?report=workforce-weekly-summaries" replace />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/users" element={<Navigate to="/settings" replace />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Fallback redirect */}
      <Route
        path="*"
        element={<Navigate to={currentUser ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
};
export default AppRoutes;
