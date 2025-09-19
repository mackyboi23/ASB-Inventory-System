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
} from "@mui/material"
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState<number>(1)

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
    const { data, error } = await supabase.from("withdrawal_history").select("*")
    if (!error && data) setHistory(data)
  }

  useEffect(() => {
    fetchStaff()
    fetchProducts()
    fetchHistory()

    // ✅ Real-time subscription for products
    const productChannel = supabase
      .channel("products-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          fetchProducts()
        }
      )
      .subscribe()


// ✅ Real-time subscription for withdrawals (optimized)
    const withdrawalChannel = supabase
      .channel("withdrawals-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "withdrawals" },
        async (payload) => {
          // Fetch the new row from the withdrawal_history view
          const { data, error } = await supabase
            .from("withdrawal_history")
            .select("*")
            .eq("withdrawal_id", payload.new.id)
            .single()

          if (!error && data) {
            setHistory((prev) => [data, ...prev]) // prepend new row
          }
        }
      )
      .subscribe()


    return () => {
      supabase.removeChannel(productChannel)
      supabase.removeChannel(withdrawalChannel)
    }
  }, [])

  // ✅ Handle withdrawal form submit
      const handleWithdraw = async () => {
        if (!selectedStaff || !selectedProduct || quantity < 1) return

        const { error } = await supabase.from("withdrawals").insert({
          staff_id: selectedStaff,
          product_id: selectedProduct.id,
          quantity,
        })

        if (error) {
          console.error("Error withdrawing product:", error.message)
          return
        }

        setOpen(false)
        setSelectedStaff(null)
        setSelectedProduct(null)
        setQuantity(1)

        // Reload all data
        await fetchProducts()
        await fetchHistory()
      }


  // ✅ Filter products that need restocking
  const lowStock = products.filter(
    (p) => p.status === "Low Stock" || p.status === "Unavailable"
  )

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        🏠 Home
      </Typography>

      {/* Withdraw Button */}
      <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
        Withdraw Item
      </Button>

      {/* Withdraw Modal */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <Box
          sx={{
            p: 4,
            bgcolor: "background.paper",
            borderRadius: 2,
            maxWidth: 400,
            mx: "auto",
            mt: 10,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Withdraw Item
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

          {/* Product Autocomplete */}
          <Autocomplete
            options={products}
            getOptionLabel={(p) => `${p.name} | ${p.status}`}
            value={selectedProduct}
            onChange={(_, value) => setSelectedProduct(value)}
            renderInput={(params) => (
              <TextField {...params} label="Select Product" margin="normal" />
            )}
          />

          {/* Quantity */}
          <TextField
            fullWidth
            type="number"
            label="Quantity"
            margin="normal"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />

          <Button
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
            onClick={handleWithdraw}
          >
            Confirm Withdraw
          </Button>
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
          <TableContainer
            component={Paper}
            sx={{
              maxWidth: 500,
              maxHeight: 320, // ~5 rows, adjust as needed
              overflowY: "auto",
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Item Name</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lowStock.slice(0, 10000).map((p) => (
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
                          textTransform: "capitalize",
                          minWidth: 90,
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
        <TableContainer
          component={Paper}
          sx={{
            maxWidth: 700,
            maxHeight: 320, // ~5 rows, adjust as needed
            overflowY: "auto",
          }}
        >
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
              {history.slice(0, 4).map((row) => (
                <TableRow key={row.withdrawal_id}>
                  <TableCell>
                    {new Date(row.created_at).toLocaleString()}
                  </TableCell>
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
