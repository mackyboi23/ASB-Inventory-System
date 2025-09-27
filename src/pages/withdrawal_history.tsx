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
}

export default function WithdrawalHistoryPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [selectedStaff, setSelectedStaff] = useState<number | "">("")
  const [history, setHistory] = useState<WithdrawalHistory[]>([])

  useEffect(() => {
    // Fetch staff list
    supabase.from("staff").select("*").then(({ data }) => {
      if (data) setStaff(data)
    })
  }, [])

  useEffect(() => {
    supabase
      .from("withdrawal_history")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          if (selectedStaff) {
            // Find staff name by selectedStaff id
            const staffObj = staff.find((s) => s.id === selectedStaff)
            setHistory(data.filter((row) => row.staff_name === staffObj?.name))
          } else {
            setHistory(data)
          }
        }
      })
  }, [selectedStaff, staff])

  // ✅ Download Excel function
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

      {/* Filter and Download Button */}
      <Box display="flex" gap={2} mb={3}>
        <TextField
          select
          label="Filter by Staff"
          value={selectedStaff}
          onChange={(e) =>
            setSelectedStaff(e.target.value === "" ? "" : Number(e.target.value))
          }
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All Staff</MenuItem>
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
            {history.map((row) => (
              <TableRow key={row.withdrawal_id}>
                <TableCell>
                  {new Date(row.created_at).toLocaleString()}
                </TableCell>
                <TableCell>{row.staff_name}</TableCell>
                <TableCell>{row.product_name}</TableCell>
                <TableCell>{row.quantity}</TableCell>
              </TableRow>
            ))}
            {history.length === 0 && (
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
