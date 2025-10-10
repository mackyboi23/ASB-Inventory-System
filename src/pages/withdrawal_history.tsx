import { useEffect, useState } from "react"
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  MenuItem,
  Button,
} from "@mui/material"
import { supabase } from "../assets/lib/supabaseClient"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"

interface Staff {
  id: number
  name: string
}

interface WithdrawalHistory {
  withdrawal_id: number
  created_at: string
  staff_name: string
  product_name: string
  quantity: number
  staff_id?: number
}

export default function WithdrawalHistoryPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [selectedStaff, setSelectedStaff] = useState<number | "">("")
  const [history, setHistory] = useState<WithdrawalHistory[]>([])
  const [loading, setLoading] = useState(false)

  // ✅ Fetch staff list once
  useEffect(() => {
    const fetchStaff = async () => {
      const { data, error } = await supabase.from("staff").select("*")
      if (error) console.error("Error loading staff:", error)
      else setStaff(data || [])
    }
    fetchStaff()
  }, [])

  // ✅ Fetch history whenever selectedStaff changes
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true)
      let query = supabase
        .from("withdrawal_history")
        .select("*")
        .order("created_at", { ascending: false })

      // ✅ Filter by staff if selected
      if (selectedStaff) {
        query = query.eq("staff_id", selectedStaff)
      }

      const { data, error } = await query
      if (error) console.error("Error loading withdrawal history:", error)
      else setHistory(data || [])
      setLoading(false)
    }

    fetchHistory()
  }, [selectedStaff])

  // ✅ Download Excel
  const downloadExcel = () => {
    if (history.length === 0) {
      alert("No data to export")
      return
    }

    const worksheet = XLSX.utils.json_to_sheet(
      history.map((row) => ({
        Date: new Date(row.created_at).toLocaleString(),
        Staff: row.staff_name,
        Product: row.product_name,
        Quantity: row.quantity,
      }))
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Withdrawal History")

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    })

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })

    saveAs(blob, "withdrawal_history.xlsx")
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        📜 Withdrawal History
      </Typography>

      {/* Filter & Download */}
      <Box display="flex" gap={2} mb={3}>
        <TextField
          select
          label="Filter by Technician"
          value={selectedStaff}
          onChange={(e) =>
            setSelectedStaff(e.target.value === "" ? "" : Number(e.target.value))
          }
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All Technicians</MenuItem>
          {staff.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>

        <Button variant="contained" color="success" onClick={downloadExcel}>
          ⬇️ Download Excel
        </Button>
      </Box>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Staff</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Quantity</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : history.length > 0 ? (
              history.map((row) => (
                <TableRow key={row.withdrawal_id}>
                  <TableCell>
                    {new Date(row.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>{row.staff_name}</TableCell>
                  <TableCell>{row.product_name}</TableCell>
                  <TableCell>{row.quantity}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No withdrawals found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
