import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from '@/contexts/AuthContext'

interface InvestmentProduct {
  id: number
  fund_name: string
  fund_company: string
  short_description: string
  suitable_for: string
  returns_1_year: number
  returns_3_year: number
  returns_since_inception: number
  expense_ratio: number
  fund_nav: number
  assetclass_primary: string
  product_type: string
  assetclass_secondary: string
  fund_symbol: string
  fund_type: string
  assetclass_theme: string
}

interface ProductsResponse {
  data: InvestmentProduct[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export default function ViewInvestmentProducts() {
  const navigate = useNavigate()
  const { isAuthenticated, apiRequest } = useAuth()
  const [products, setProducts] = useState<InvestmentProduct[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = async (page: number) => {
    try {
      if (!isAuthenticated) {
        navigate('/login')
        return
      }

      const response = await apiRequest(`/api/admin/investment-products?page=${page}`)

      if (!response.ok) {
        throw new Error('Failed to fetch investment products')
      }

      const data: ProductsResponse = await response.json()
      setProducts(data.data)
      setTotalPages(data.total_pages)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts(currentPage)
  }, [currentPage, isAuthenticated])

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <Button variant="ghost" onClick={() => navigate(-1)}>← Back</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Investment Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Asset Class</TableHead>
                  <TableHead className="text-right">1Y Return</TableHead>
                  <TableHead className="text-right">3Y Return</TableHead>
                  <TableHead className="text-right">Expense Ratio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.fund_name}</TableCell>
                    <TableCell>{product.fund_company}</TableCell>
                    <TableCell>{product.fund_type}</TableCell>
                    <TableCell>{product.assetclass_primary}</TableCell>
                    <TableCell className="text-right">{product.returns_1_year}%</TableCell>
                    <TableCell className="text-right">{product.returns_3_year}%</TableCell>
                    <TableCell className="text-right">{product.expense_ratio}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 