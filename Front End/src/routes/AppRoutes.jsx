import { Routes, Route, Navigate } from "react-router-dom";
import FR02 from "../pages/FR02";
import FR03 from "../pages/FR03";
import FR04 from "../pages/FR04";
import FR05 from "../pages/FR05";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/fr02" replace />} />
      <Route path="/fr03" element={<FR03 />} />
      <Route path="/fr04" element={<FR04 />} />
      <Route path="/fr05" element={<FR05 />} />
      <Route path="*" element={<Navigate to="/fr02" replace />} />
    </Routes>
  );
}
