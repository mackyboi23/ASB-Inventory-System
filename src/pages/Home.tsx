import { useEffect, useState } from "react"
import {
  Box,
  Button,
  Typography,
  Modal,
  TextField,
  MenuItem,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from "@mui/material"

import Grid from "@mui/material/Grid";
import AddCircleIcon from "@mui/icons-material/AddCircle"
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle"
import { supabase } from "../assets/lib/supabaseClient"

interface Staff {
  id: number
  name: string
}

interface Product {
  id: number
  name: string
  quantity: number
  status: string
}

interface WithdrawalHistory {
  withdrawal_id: number
  created_at: string
  staff_name: string
  product_name: string
  product_status: string
  quantity: number
}

export default function Home() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [history, setHistory] = useState<WithdrawalHistory[]>([])

  const [open, setOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null)
  const [items, setItems] = useState<{ productId: number | ""; quantity: number }[]>([
    { productId: "", quantity: 1 },
  ])

  // ✅ Fetch staff, products, and history
  const fetchStaff = async () => {
    const { data, error } = await supabase.from("staff").select("*")
    if (!error && data) setStaff(data)
  }

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*")
    if (!error && data) setProducts(data)
  }

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from("withdrawal_history")
      .select("*")
      .order("created_at", { ascending: false })
    if (!error && data) setHistory(data)
  }

  useEffect(() => {
    fetchStaff()
    fetchProducts()
    fetchHistory()

    // ✅ Real-time subscription for products
    const productChannel = supabase
      .channel("products-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        fetchProducts()
      })
      .subscribe()

    // ✅ Real-time subscription for withdrawals
    const withdrawalChannel = supabase
      .channel("withdrawals-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "withdrawals" },
        async (payload) => {
          const { data, error } = await supabase
            .from("withdrawal_history")
            .select("*")
            .eq("withdrawal_id", payload.new.id)
          if (!error && data && data.length > 0) {
            setHistory((prev) => [...data, ...prev])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(productChannel)
      supabase.removeChannel(withdrawalChannel)
    }
  }, [])

  // ✅ Handle withdraw multiple items
  const handleWithdraw = async () => {
    if (!selectedStaff || items.some((i) => !i.productId || i.quantity <= 0)) {
      alert("Please fill all fields correctly")
      return
    }

    try {
      // Insert withdrawal record
      const { data: withdrawal, error: withdrawalError } = await supabase
        .from("withdrawals")
        .insert([{ staff_id: selectedStaff }])
        .select()
        .single()

      if (withdrawalError) throw withdrawalError

      const withdrawalId = withdrawal.id

      // Insert items
      const withdrawalItems = items.map((i) => ({
        withdrawal_id: withdrawalId,
        product_id: i.productId,
        quantity: i.quantity,
      }))

      const { error: itemsError } = await supabase
        .from("withdrawal_items")
        .insert(withdrawalItems)

      if (itemsError) throw itemsError

      // Update product stock
      for (const i of items) {
        await supabase.rpc("decrement_product_stock", {
          p_product_id: i.productId,
          p_quantity: i.quantity,
        })
      }

      setOpen(false)
      setSelectedStaff(null)
      setItems([{ productId: "", quantity: 1 }])
      await fetchProducts()
      await fetchHistory()
    } catch (err) {
      console.error("Withdrawal error:", err)
      alert("Error processing withdrawal")
    }
  }

  // ✅ Manage items in form
  const handleAddItem = () => {
    setItems([...items, { productId: "", quantity: 1 }])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleChange = (
    index: number,
    field: "productId" | "quantity",
    value: number | ""
  ) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  // ✅ Low stock filter
  const lowStock = products.filter((p) => p.quantity <= 3)

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        🏠 Home
      </Typography>

      {/* Withdraw Button */}
      <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
        ➖ Withdraw Item
      </Button>

      {/* Withdraw Modal */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <Box
          sx={{
            p: 4,
            bgcolor: "background.paper",
            borderRadius: 2,
            maxWidth: 600,
            mx: "auto",
            mt: 10,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Withdraw Items
          </Typography>

          {/* Staff Dropdown */}
          <TextField
            select
            fullWidth
            label="Select Staff"
            margin="normal"
            value={selectedStaff || ""}
            onChange={(e) => setSelectedStaff(Number(e.target.value))}
          >
            {staff.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>

          {/* Multiple Products */}
          {items.map((item, index) => (
            <Grid container spacing={2} alignItems="center" key={index} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Autocomplete
                  options={products}
                  getOptionLabel={(p) => `${p.name} | ${p.status}`}
                  value={products.find((p) => p.id === item.productId) || null}
                  onChange={(_, value) =>
                    handleChange(index, "productId", value ? value.id : "")
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Product" fullWidth />
                  )}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  type="number"
                  label="Quantity"
                  fullWidth
                  value={item.quantity}
                  onChange={(e) => handleChange(index, "quantity", Number(e.target.value))}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={2}>
                <IconButton
                  color="error"
                  onClick={() => handleRemoveItem(index)}
                  disabled={items.length === 1}
                >
                  <RemoveCircleIcon />
                </IconButton>
              </Grid>
            </Grid>
          ))}

          <Button startIcon={<AddCircleIcon />} onClick={handleAddItem}>
            Add Another Product
          </Button>

          <Box mt={2}>
            <Button variant="contained" color="primary" fullWidth onClick={handleWithdraw}>
              Confirm Withdraw
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Low Stock / Unavailable */}
      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          ⚠️ Products Needing Restock
        </Typography>
        {lowStock.length === 0 ? (
          <Typography>No products need restock 🎉</Typography>
        ) : (
          <TableContainer component={Paper} sx={{ maxWidth: 500, maxHeight: 320 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Item Name</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lowStock.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.quantity}</TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: "inline-block",
                          px: 2,
                          py: 0.5,
                          borderRadius: 999,
                          bgcolor: "#dbdbdbff",
                          fontWeight: "bold",
                          color:
                            p.status === "Available"
                              ? "green"
                              : p.status === "Low Stock"
                              ? "orange"
                              : "red",
                          textAlign: "center",
                        }}
                      >
                        {p.status}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Withdrawal History */}
      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          📜 Withdrawal History
        </Typography>
        <TableContainer component={Paper} sx={{ maxWidth: 700, maxHeight: 320 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Staff</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Quantity</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.slice(0, 10).map((row) => (
                <TableRow key={row.withdrawal_id + row.product_name}>
                  <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                  <TableCell>{row.staff_name}</TableCell>
                  <TableCell>{row.product_name}</TableCell>
                  <TableCell>{row.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  )
}
