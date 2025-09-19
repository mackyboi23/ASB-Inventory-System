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
} from "@mui/material"
import { supabase } from "../assets/lib/supabaseClient"

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
  const [selectedStaff, setSelectedStaff] = useState<number | "">( "")
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
            const staffObj = staff.find(s => s.id === selectedStaff)
            setHistory(
              data.filter(row => row.staff_name === staffObj?.name)
            )
          } else {
            setHistory(data)
          }
        }
      })
  }, [selectedStaff, staff])

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        📜 Withdrawal History
      </Typography>

      <TextField
        select
        label="Filter by Staff"
        value={selectedStaff}
        onChange={e => setSelectedStaff(e.target.value === "" ? "" : Number(e.target.value))}
        sx={{ mb: 3, minWidth: 200 }}
      >
        <MenuItem value="">All Staff</MenuItem>
        {staff.map(s => (
          <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
        ))}
      </TextField>

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
            {history.map(row => (
              <TableRow key={row.withdrawal_id}>
                <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
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