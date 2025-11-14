import { useEffect, useState } from "react"
import { supabase } from "../assets/lib/supabaseClient"
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Checkbox,
  Snackbar,
  Alert,
  Menu,
  MenuItem,
  TablePagination,
} from "@mui/material"
import DeleteIcon from "@mui/icons-material/Delete"
import EditIcon from "@mui/icons-material/Edit"
import AddIcon from "@mui/icons-material/Add"
import FilterListIcon from "@mui/icons-material/FilterList"
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined"
import GetAppIcon from "@mui/icons-material/GetApp"

// --- Product type ---
interface Product {
  id: number
  name: string
  quantity: number
  status?: string
}

// --- Convert quantity -> status ---
const getStatusFromQuantity = (quantity: number): string => {
  if (quantity > 3) return "Available"
  if (quantity >= 1 && quantity <= 3) return "Low Stock"
  return "Unavailable"
}

// --- MUI Chip helper ---
const getStatusChip = (status: string) => {
  switch (status?.toLowerCase()) {
    case "available":
      return <Chip label="Available" color="success" variant="outlined" />
    case "low stock":
      return <Chip label="Low Stock" color="warning" variant="outlined" />
    case "unavailable":
      return <Chip label="Unavailable" color="error" variant="outlined" />
    default:
      return <Chip label="Unknown" variant="outlined" />
  }
}

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([])
  const [openAdd, setOpenAdd] = useState(false)
  const [addName, setAddName] = useState("")
  const [addQuantity, setAddQuantity] = useState<number>(0)

  // --- edit state ---
  const [openEdit, setOpenEdit] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")
  const [editingQuantity, setEditingQuantity] = useState<number>(0)

  // --- delete confirm state ---
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const [selected, setSelected] = useState<number[]>([])
  const [search, setSearch] = useState("")

  // --- snackbar state ---
  const [snackbar, setSnackbar] = useState<{ open: boolean; msg: string; type: "success" | "error" }>({
    open: false,
    msg: "",
    type: "success",
  })

  // --- filter state ---
  const [statusFilter, setStatusFilter] = useState<string>("All")
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const openMenu = Boolean(anchorEl)

  // --- pagination state ---
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25) // ✅ 25 products per page

  // --- Utility: sort alphabetically ---
  const sortProducts = (list: Product[]) => [...list].sort((a, b) => a.name.localeCompare(b.name))

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase.from("products").select("*")
      if (error) {
        console.error("Fetch error:", error)
        return
      }
      setProducts(sortProducts(data || [])) // always sorted
    }

    fetchProducts()
  }, []) // no missing deps warning


  // --- Add product ---
  const handleAdd = async () => {
    if (!addName.trim()) return setSnackbar({ open: true, msg: "⚠️ Product name is required", type: "error" })
    const normalizedName = addName.trim().toLowerCase()

    // 🔍 Duplicate check
    const { data: existing, error: checkError } = await supabase
      .from("products")
      .select("id")
      .ilike("name", normalizedName)
      .limit(1)

    if (checkError) {
      console.error("Check product error:", checkError)
      setSnackbar({ open: true, msg: "❌ Error checking duplicates", type: "error" })
      return
    }

    if (existing && existing.length > 0) {
      setSnackbar({ open: true, msg: "⚠️ This product already exists!", type: "error" })
      return
    }

    const qty = Number(addQuantity) || 0
    const computedStatus = getStatusFromQuantity(qty)

    const { data, error } = await supabase
      .from("products")
      .insert([{ name: addName.trim(), quantity: qty, status: computedStatus }])
      .select()

    if (error) {
      console.error("Add error:", error)
      setSnackbar({ open: true, msg: "❌ Failed to add product", type: "error" })
      return
    }

    if (data && data.length > 0) {
      setProducts((prev) => sortProducts([...prev, ...data]))
      setSnackbar({ open: true, msg: "✅ Product added successfully!", type: "success" })
    }

    setAddName("")
    setAddQuantity(0)
    setOpenAdd(false)
  }

  // --- Delete confirm flow ---
  const handleDeleteClick = (id: number) => {
    setDeleteId(id)
    setConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (deleteId === null) return
    const { error } = await supabase.from("products").delete().eq("id", deleteId)
    if (error) {
      console.error("Delete error:", error)
      setSnackbar({ open: true, msg: "❌ Error deleting product", type: "error" })
      return
    }
    setProducts((prev) => prev.filter((p) => p.id !== deleteId))
    setSnackbar({ open: true, msg: "🗑️ Product deleted", type: "success" })
    setConfirmOpen(false)
    setDeleteId(null)
  }

  // --- Bulk delete ---
  const handleDeleteSelected = async () => {
    if (selected.length === 0) return
    if (!confirm(`Delete ${selected.length} product(s)?`)) return
    const { error } = await supabase.from("products").delete().in("id", selected)
    if (error) {
      console.error("Bulk delete error:", error)
      setSnackbar({ open: true, msg: "❌ Failed bulk delete", type: "error" })
      return
    }
    setProducts((prev) => prev.filter((p) => !selected.includes(p.id)))
    setSelected([])
    setSnackbar({ open: true, msg: "🗑️ Selected products deleted", type: "success" })
  }

  const toggleSelect = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  // --- Edit flow ---
  const handleEditOpen = (product: Product) => {
    setEditingId(product.id)
    setEditingName(product.name)
    setEditingQuantity(product.quantity)
    setOpenEdit(true)
  }

  const handleUpdate = async () => {
    if (editingId === null) return
    if (!editingName.trim()) return setSnackbar({ open: true, msg: "⚠️ Product name is required", type: "error" })

    const qty = Number(editingQuantity) || 0
    const newStatus = getStatusFromQuantity(qty)

    const { data, error } = await supabase
      .from("products")
      .update({ name: editingName.trim(), quantity: qty, status: newStatus })
      .eq("id", editingId)
      .select()

    if (error) {
      console.error("Update error:", error)
      setSnackbar({ open: true, msg: "❌ Error updating product", type: "error" })
      return
    }

    if (data && data.length > 0) {
      const updated = data[0]
      setProducts((prev) => sortProducts(prev.map((p) => (p.id === editingId ? updated : p))))
      setSnackbar({ open: true, msg: "✅ Product updated", type: "success" })
    }

    setOpenEdit(false)
    setEditingId(null)
    setEditingName("")
    setEditingQuantity(0)
  }

  // --- Filter + Search ---
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "All" || getStatusFromQuantity(p.quantity) === statusFilter
    return matchesSearch && matchesStatus
  })

  // --- Pagination ---
  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage)
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }
  

  const paginatedProducts = filteredProducts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  // --- Export current inventory (CSV for Excel) ---
  const downloadCSV = (rows: Product[]) => {
    if (!rows || rows.length === 0) {
      setSnackbar({ open: true, msg: "⚠️ No products to export", type: "error" })
      return
    }

    const header = ["ID", "Name", "Quantity", "Status"]
    const escape = (val: string | number | null | undefined) => `"${String(val ?? "").replace(/"/g, '""')}"`

    const csvRows = [header.join(",")]
    rows.forEach((r) => {
      const status = r.status ?? getStatusFromQuantity(r.quantity)
      csvRows.push([r.id, r.name, r.quantity, status].map(escape).join(","))
    })

    // Add BOM so Excel opens UTF-8 CSV correctly
    const csvString = "\uFEFF" + csvRows.join("\r\n")
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `inventory_${new Date().toISOString().slice(0,19).replace(/[:T]/g, "-")}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setSnackbar({ open: true, msg: "✅ Inventory exported", type: "success" })
  }
  
  return (
    <Container>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Inventory2OutlinedIcon sx={{ fontSize: 40, color: "primary.main" }} />
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Inventory
        </Typography>
      </Box>

      {/* Controls */}
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <TextField
          label="Search product"
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {/* Info label above table */}
        <Box display="flex" justifyContent="flex-end" mb={1}>
          <Typography variant="body2" color="textSecondary">
            Showing {page * rowsPerPage + 1}–
            {Math.min((page + 1) * rowsPerPage, filteredProducts.length)} of {filteredProducts.length} products
          </Typography>
        </Box>

        <Button variant="outlined" startIcon={<GetAppIcon />} onClick={() => downloadCSV(filteredProducts)}>
          Download Excel
        </Button>

        <Button variant="outlined" startIcon={<FilterListIcon />} onClick={(e) => setAnchorEl(e.currentTarget)}>
          {statusFilter === "All" ? "Filter Status" : statusFilter}
        </Button>
        <Menu anchorEl={anchorEl} open={openMenu} onClose={() => setAnchorEl(null)}>
          <MenuItem onClick={() => setStatusFilter("All")}>All</MenuItem>
          <MenuItem onClick={() => setStatusFilter("Available")}>Available</MenuItem>
          <MenuItem onClick={() => setStatusFilter("Low Stock")}>Low Stock</MenuItem>
          <MenuItem onClick={() => setStatusFilter("Unavailable")}>Unavailable</MenuItem>
        </Menu>

        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenAdd(true)}>
          Add Product
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          disabled={selected.length === 0}
          onClick={handleDeleteSelected}
        >
          Delete Selected
        </Button>
      </Box>

      {/* Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Product</TableCell>
              <TableCell align="center">Quantity</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedProducts.map((p) => (
              <TableRow key={p.id}>
                <TableCell padding="checkbox">
                  <Checkbox checked={selected.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                </TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell align="center">{p.quantity}</TableCell>
                <TableCell align="center">{getStatusChip(getStatusFromQuantity(p.quantity))}</TableCell>
                <TableCell align="center">
                  <IconButton color="primary" onClick={() => handleEditOpen(p)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDeleteClick(p.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination controls */}
      <TablePagination
        component="div"
        count={filteredProducts.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />

      {/* Add, Edit, Delete dialogs and Snackbar remain unchanged... */}
      {/* (keep them as in the previous version) */}



      {/* Add Dialog */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Product</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField label="Product Name" fullWidth value={addName} onChange={(e) => setAddName(e.target.value)} />
            <TextField
              label="Quantity"
              type="number"
              fullWidth
              value={addQuantity}
              onChange={(e) => setAddQuantity(Number(e.target.value))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Product</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField label="Product Name" fullWidth value={editingName} onChange={(e) => setEditingName(e.target.value)} />
            <TextField
              label="Quantity"
              type="number"
              fullWidth
              value={editingQuantity}
              onChange={(e) => setEditingQuantity(Number(e.target.value))}
            />
            <Typography variant="body2" color="textSecondary">
              Status will be auto-calculated: {getStatusFromQuantity(editingQuantity)}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdate}>
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this product? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.type} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.msg}
        </Alert>
      </Snackbar>
    </Container>
  )
}
