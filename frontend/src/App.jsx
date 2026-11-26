import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context';
import { PageLoader } from './ui';
import Layout from './Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Register from './pages/Register';
import Queue from './pages/Queue';
import Patients from './pages/Patients';
import PatientCard from './pages/PatientCard';
import Doctors from './pages/Doctors';
import DoctorDashboard from './pages/DoctorDashboard';
import Tv from './pages/Tv';

function Protected({ roles, children }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <PageLoader />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (roles && !roles.includes(user.role) && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, ready } = useAuth();
  return (
    <Routes>
      <Route path="/tv" element={<Tv />} />
      <Route path="/login" element={ready && user ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="register" element={<Protected roles={['registrar']}><Register /></Protected>} />
        <Route path="queue" element={<Queue />} />
        <Route path="patients" element={<Patients />} />
        <Route path="patients/:id" element={<PatientCard />} />
        <Route path="doctors" element={<Protected roles={['admin']}><Doctors /></Protected>} />
        <Route path="doctors/:id" element={<Protected roles={['admin']}><DoctorDashboard /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
