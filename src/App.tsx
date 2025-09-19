import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./layouts/Layout";
import Inventory from "./pages/Inventory";
import WithdrawalHistoryPage from "./pages/withdrawal_history";
import Home from "./pages/Home";
import { CssBaseline, Typography, Box, Button } from "@mui/material";
import { Link } from "react-router-dom";
import ProtectedRoute from "./pages/components/ProtectedRoute";
import Login from "./pages/Login";

function NotFound() {
  return (
    <Box textAlign="center" mt={5}>
      <Typography variant="h3" color="error" gutterBottom>
        404
      </Typography>
      <Typography variant="h5" gutterBottom>
        Page Not Found
      </Typography>
      <Typography color="textSecondary" gutterBottom>
        The page you’re looking for doesn’t exist or has been moved.
      </Typography>
      <Button variant="contained" color="primary" component={Link} to="/login" sx={{ mt: 2 }}>
        Go Back Home
      </Button>
    </Box>
  );
}

export default function App() {
  return (
    <Router>
      <CssBaseline />
      <Routes>
        {/* Default route -> login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes inside Layout */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/home" element={<Home />} />   {/* 👈 use Home */}
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/withdrawal_history" element={<WithdrawalHistoryPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
