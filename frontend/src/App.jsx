import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login          from "./pages/Login";
import Dashboard      from "./pages/Dashboard";
import HODDashboard   from "./pages/HODDashboard";
import DeanDashboard  from "./pages/DeanDashboard";
import Publications   from "./pages/Publications";
import PublicationDetails from "./pages/PublicationDetails";
import Projects       from "./pages/Projects";
import IPR            from "./pages/IPR";
import Achievements   from "./pages/Achievements";
import Profile from "./pages/Profile";
import Collaborations from "./pages/Collaborations";
import StudentResearch from "./pages/StudentResearch";
import ActivityLog from "./pages/ActivityLog";
import Analytics from "./pages/Analytics";
import Settings       from "./pages/Settings";
import Reports        from "./pages/Reports";
import FacultyList    from "./pages/FacultyList";
import Announcements  from "./pages/Announcements";
import DeanPersonal from "./pages/DeanPersonal";
import AdminPanel from "./pages/AdminPanel";
import FacultySearchViewer from "./pages/FacultySearchViewer";
function App() {

  return (
    <BrowserRouter>
      <Routes>

        {/* Auth */}
        <Route path="/"   element={<Login />} />

        {/* Faculty */}
        <Route path="/dashboard"      element={<Dashboard />} />
        <Route path="/publications"   element={<Publications />} />
        <Route path="/publications/:id" element={<PublicationDetails />} />
        <Route path="/projects"       element={<Projects />} />
        <Route path="/patents"        element={<IPR />} />
        <Route path="/achievements"   element={<Achievements />} />
        <Route path="/profile"      element={<Profile />} />
        <Route path="/analytics"      element={<Analytics />} />
        <Route path="/collaborations"      element={<Collaborations />} />
        <Route path="/students"      element={<StudentResearch />} />
        <Route path="/reports"        element={<Reports />} />
        <Route path="/activity"      element={<ActivityLog />} />
        <Route path="/settings"       element={<Settings />} />
        <Route path="/faculty"        element={<FacultyList />} />
        

        {/* HOD */}
        <Route path="/hod/dashboard"      element={<HODDashboard />} />
        <Route path="/hod/profile"  element={<Profile />} />
        <Route path="/hod/faculty"    element={<FacultyList />} />
        <Route path="/hod/analytics"  element={<Analytics />} />
        <Route path="/hod/collaborations"  element={<Collaborations />} />
        <Route path="/hod/students"  element={<StudentResearch />} />
        <Route path="/hod/reports"    element={<Reports />} />
        <Route path="/hod/activity"  element={<ActivityLog />} />
        <Route path="/hod/settings"   element={<Settings />} />

        {/* Dean */}
        <Route path="/dean/dashboard"      element={<DeanDashboard />} />
        <Route path="/dean/profile" element={<Profile />} />
        <Route path="/dean/analytics" element={<Analytics />} />
        <Route path="/dean/collaborations" element={<Collaborations />} />
        <Route path="/dean/students" element={<StudentResearch />} />
        <Route path="/dean/reports"   element={<Reports />} />
        <Route path="/dean/activity" element={<ActivityLog />} />
        <Route path="/dean/settings"   element={<Settings />} />
        <Route path="/dean/announcements" element={<Announcements />} />
        <Route path="/dean/myresearch" element={<DeanPersonal />} />
        {/* Admin */}
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/faculty-search" element={<FacultySearchViewer />} />
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" />} />

         
      </Routes>
    </BrowserRouter>
  );
}

export default App;