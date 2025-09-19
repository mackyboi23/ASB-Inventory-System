import { useState } from "react";
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  Button,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "../assets/lib/supabaseClient"; // import Supabase client

const drawerWidth = 240;

const navItems = [
  { label: "Dashboard", path: "/home" },
  { label: "Inventory", path: "/inventory" },
  { label: "Withdrawal History", path: "/withdrawal_history" },
];




export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  // Drawer for mobile view
  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: "center" }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        Ash Beauty Studio Inventory
      </Typography>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.label} disablePadding>
            <ListItemButton
              component={NavLink}
              to={item.path}
              sx={{
                textAlign: "center",
                "&.active": {
                  bgcolor: "primary.main",
                  color: "white",
                  fontWeight: "bold",
                },
              }}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout} sx={{ textAlign: "center" }}>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {/* Top AppBar */}
      <AppBar component="nav" position="fixed" sx={{ bgcolor: "black", color: "white" }}>
        <Toolbar>
          {/* Mobile menu button */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Title */}
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, display: { xs: "none", sm: "block" } }}
          >
            Ash Beauty Studio Inventory
          </Typography>

          {/* Desktop nav links */}
          <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center" }}>
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                style={({ isActive }) => ({
                  margin: "0 1rem",
                  textDecoration: "none",
                  color: isActive ? "green" : "white",
                  fontWeight: isActive ? "bold" : "normal",
                })}
              >
                {item.label}
              </NavLink>
            ))}
            <Button
              variant="outlined"
              color="inherit"
              onClick={handleLogout}
              sx={{ ml: 2, borderColor: "white", color: "white" }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Side Drawer for mobile */}
      <Box component="nav">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Page content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
