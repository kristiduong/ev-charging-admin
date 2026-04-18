import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Chargers } from "./pages/Chargers";
import { Dashboard } from "./pages/Dashboard";
import { MaintenanceLogPage } from "./pages/MaintenanceLog";
import { Payments } from "./pages/Payments";
import { Sessions } from "./pages/Sessions";
import { Stations } from "./pages/Stations";
import { Users } from "./pages/Users";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="stations" element={<Stations />} />
        <Route path="chargers" element={<Chargers />} />
        <Route path="users" element={<Users />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="payments" element={<Payments />} />
        <Route path="maintenance" element={<MaintenanceLogPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
