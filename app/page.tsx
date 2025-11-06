"use client"

import { useState, useEffect } from "react"
import { Search, Filter, ArrowDown, ArrowUp, LayoutGrid, List, Archive } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProcurementCard } from "@/components/procurement-card"

interface ProcurementItem {
  id: number
  issuer: string | null
  number: string | null
  pdf_url: string | null
  summary: string | null
  publication_date: Date | null
  application_deadline: Date | string | null
  diario_id: number | null
  entity_id: string | null
  created_at: Date | null
  updated_at: Date | null
  aviso_modelo: string | null
  aviso_data_envio: Date | null
  processo_tipo: string | null
  processo_preco_base_existe: boolean | null
  processo_preco_base_valor: number | null
  has_lots: boolean | null
  processo_max_lotes_autorizado: number | null
  processo_max_lotes_concorrente: number | null
  object_internal_ref: string | null
  object_designation: string | null
  object_description: string | null
  object_main_contract_type: string | null
  object_contract_type: string | null
  object_main_cpv: string | null
  base_price: any
  object_options: string | null
  has_bid_base_price: boolean | null
  object_type_of_goods: string | null
  applicable_legislation: string | null
  asset_valuation: any
  object_options_description: string | null
  expired: boolean | null
  cpv_codes?: string[]
  criteria_type?: string
}

async function fetchDistricts() {
  try {
    const response = await fetch('/api/districts')
    if (!response.ok) {
      throw new Error('Failed to fetch districts')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching districts:', error)
    return []
  }
}

async function fetchProcurementData(
  search = '', 
  district = 'all', 
  page = 1, 
  limit = 50, 
  dateSortOrder = 'desc', 
  priceSortOrder = 'none', 
  includeExpired = false,
  includeNA = true,
  minPrice = '', 
  maxPrice = '',
  minDate = '',
  maxDate = '',
  cpv = 'all',
  entity = '',
  criteria = 'outros',
  contractType = 'all',
  showArchived = false
) {
  try {
    const params = new URLSearchParams({
      search,
      district,
      dateSortOrder,
      priceSortOrder,
      page: page.toString(),
      limit: limit.toString(),
      includeExpired: includeExpired.toString(),
      includeNA: includeNA.toString(),
      showArchived: showArchived.toString()
    })

    if (minPrice !== '') {
      params.append('minPrice', minPrice)
    }
    if (maxPrice !== '') {
      params.append('maxPrice', maxPrice)
    }
    if (minDate !== '') {
      params.append('minDate', minDate)
    }
    if (maxDate !== '') {
      params.append('maxDate', maxDate)
    }
    if (cpv !== 'all') {
      params.append('cpv', cpv)
    }
    if (entity !== '') {
      params.append('entity', entity)
    }
    if (criteria !== 'outros') {
      params.append('criteria', criteria)
    }
    if (contractType !== 'all') {
      params.append('contractType', contractType)
    }

    const response = await fetch(`/api/procurements?${params}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch data')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching procurement data:', error)
    return { data: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } }
  }
}

async function fetchTotalCount(search = '', district = 'all', showExpired = false, showNA = false, minPrice = '', maxPrice = '') {
  try {
    // Determine what includeExpired value to send based on checkboxes
    // We always fetch with includeExpired=true and rely on client-side filtering
    // But for count, we need to make a separate lightweight call
    const params = new URLSearchParams({
      search,
      district,
      sortBy: 'publication_date',
      sortOrder: 'desc',
      page: '1',
      limit: '1', // We only care about the total count
      includeExpired: 'true' // Always true to get all records for counting
    })

    if (minPrice !== '') {
      params.append('minPrice', minPrice)
    }
    if (maxPrice !== '') {
      params.append('maxPrice', maxPrice)
    }

    const response = await fetch(`/api/procurements?${params}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch count')
    }

    const result = await response.json()
    return result.pagination.total
  } catch (error) {
    console.error('Error fetching total count:', error)
    return 0
  }
}


function getItemStatus(item: ProcurementItem): string {
  if (!item.application_deadline) {
    return "N/A"
  }

  const now = new Date()
  let applicationDeadline: Date
  
  if (typeof item.application_deadline === 'string') {
    const ddmmyyyyPattern = /^(\d{2})-(\d{2})-(\d{4})\s(\d{2}):(\d{2})$/
    const match = item.application_deadline.match(ddmmyyyyPattern)
    
    if (match) {
      const [, day, month, year, hour, minute] = match
      applicationDeadline = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute))
    } else {
      // Try regular date parsing
      applicationDeadline = new Date(item.application_deadline)
    }
  } else {
    applicationDeadline = new Date(item.application_deadline)
  }

  if (isNaN(applicationDeadline.getTime())) {
    return "N/A"
  }

  const timeDiff = applicationDeadline.getTime() - now.getTime()
  const daysToDeadline = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))

  if (daysToDeadline < 0) {
    return "Expirado"
  } else if (daysToDeadline <= 5) {
    return "Prestes a expirar"
  } else {
    return "Aberto"
  }
}

export default function HomePage() {
  // Helper functions to convert between dd/mm/yyyy and yyyy-mm-dd
  const formatDateForDisplay = (isoDate: string): string => {
    if (!isoDate) return ''
    const [year, month, day] = isoDate.split('-')
    return `${day}/${month}/${year}`
  }

  const formatDateForAPI = (displayDate: string): string => {
    if (!displayDate) return ''
    const parts = displayDate.replace(/\//g, '-').split('-')
    if (parts.length !== 3) return ''
    const [day, month, year] = parts
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const [data, setData] = useState<ProcurementItem[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [districts, setDistricts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [activeSearchTerm, setActiveSearchTerm] = useState("")
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all")
  const [activeDistrict, setActiveDistrict] = useState<string>("all")
  const [sortOrder, setSortOrder] = useState<string>("date-desc")
  const [activeSortOrder, setActiveSortOrder] = useState<string>("date-desc")
  const [showExpired, setShowExpired] = useState<boolean>(false)
  const [activeShowExpired, setActiveShowExpired] = useState<boolean>(false)
  const [showNA, setShowNA] = useState<boolean>(true)
  const [activeShowNA, setActiveShowNA] = useState<boolean>(true)
  const [minPrice, setMinPrice] = useState<string>("")
  const [activeMinPrice, setActiveMinPrice] = useState<string>("")
  const [maxPrice, setMaxPrice] = useState<string>("")
  const [activeMaxPrice, setActiveMaxPrice] = useState<string>("")
  
  // Set default date range: today - 7 days to today
  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const [minDate, setMinDate] = useState<string>(sevenDaysAgo)
  const [activeMinDate, setActiveMinDate] = useState<string>(sevenDaysAgo)
  const [maxDate, setMaxDate] = useState<string>(today)
  const [activeMaxDate, setActiveMaxDate] = useState<string>(today)
  
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [hasMoreData, setHasMoreData] = useState<boolean>(true)
  const [updatingExpired, setUpdatingExpired] = useState<boolean>(false)
  const [cpvCodes, setCpvCodes] = useState<string[]>([])
  const [selectedCpv, setSelectedCpv] = useState<string>("72000000")
  const [activeCpv, setActiveCpv] = useState<string>("72000000")
  const [selectedEntity, setSelectedEntity] = useState<string>("")
  const [activeEntity, setActiveEntity] = useState<string>("")
  const [selectedCriteria, setSelectedCriteria] = useState<string>("outros")
  const [activeCriteria, setActiveCriteria] = useState<string>("outros")
  const [contractTypes, setContractTypes] = useState<string[]>([])
  const [selectedContractType, setSelectedContractType] = useState<string>("all")
  const [activeContractType, setActiveContractType] = useState<string>("all")
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showArchived, setShowArchived] = useState<boolean>(false)
  const [activeShowArchived, setActiveShowArchived] = useState<boolean>(false)

  // Client-side filtering is minimal - most filtering is handled by the API
  // We just return all data since filtering is done at database level
  const filteredData = data
  // All filters and sorting are handled by the database

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true)
      
      const apiIncludeExpired = activeShowExpired
      
      // Parse combined sort order
      const [sortType, sortDirection] = activeSortOrder.split('-')
      const dateSortOrder = sortType === 'date' ? sortDirection : 'desc'
      const priceSortOrder = sortType === 'price' ? sortDirection : 'none'
      
      // Load initial page of data (sorted and filtered by database)
      const response = await fetchProcurementData(
        activeSearchTerm, 
        activeDistrict, 
        1, 
        21, // Load 21 items initially (3x7 grid)
        dateSortOrder, 
        priceSortOrder, 
        apiIncludeExpired,
        activeShowNA,
        activeMinPrice, 
        activeMaxPrice,
        activeMinDate,
        activeMaxDate,
        activeCpv,
        activeEntity,
        activeCriteria,
        activeContractType,
        activeShowArchived
      )
      
      setData(response.data)
      setTotalCount(response.pagination.total)
      setCurrentPage(1)
      setHasMoreData(response.data.length === 21)
      setLoading(false)
    }
    
    loadInitialData()
  }, [activeSearchTerm, activeDistrict, activeSortOrder, activeShowExpired, activeShowNA, activeMinPrice, activeMaxPrice, activeMinDate, activeMaxDate, activeCpv, activeEntity, activeCriteria, activeContractType, activeShowArchived])

  // Fetch ALL available CPV codes (not filtered by current data)
  useEffect(() => {
    async function fetchAllCpvCodes() {
      try {
        const response = await fetch(`/api/cpvs`)
        const result = await response.json()
        
        if (result.cpvs) {
          setCpvCodes(result.cpvs)
        }
      } catch (error) {
        console.error('Error fetching CPV codes:', error)
      }
    }
    
    fetchAllCpvCodes()
  }, []) // Only run once on mount

  // Update Contract Types and Districts based on selected CPV (before Pesquisar is pressed)
  useEffect(() => {
    async function updateFiltersBasedOnCPV() {
      try {
        // Build query params
        const params = new URLSearchParams()
        
        if (selectedCpv && selectedCpv !== 'all') {
          params.append('cpv', selectedCpv)
        }
        
        // Fetch districts and contract types filtered by CPV
        const [districtsResponse, contractTypesResponse] = await Promise.all([
          fetch(`/api/districts?${params}`),
          fetch(`/api/contract-types?${params}`)
        ])
        
        const districts = await districtsResponse.json()
        const contractTypes = await contractTypesResponse.json()
        
        setDistricts(districts)
        setContractTypes(contractTypes)
        
        // Reset selected values if they're no longer available
        if (selectedDistrict !== 'all' && !districts.includes(selectedDistrict)) {
          setSelectedDistrict('all')
        }
        if (selectedContractType !== 'all' && !contractTypes.includes(selectedContractType)) {
          setSelectedContractType('all')
        }
      } catch (error) {
        console.error('Error updating filters based on CPV:', error)
      }
    }
    
    updateFiltersBasedOnCPV()
  }, [selectedCpv]) // Run whenever selectedCpv changes

  const loadMoreData = async () => {
    if (loadingMore || !hasMoreData) return
    
    setLoadingMore(true)
    
    const apiIncludeExpired = activeShowExpired
    const nextPage = currentPage + 1
    
    // Parse combined sort order
    const [sortType, sortDirection] = activeSortOrder.split('-')
    const dateSortOrder = sortType === 'date' ? sortDirection : 'desc'
    const priceSortOrder = sortType === 'price' ? sortDirection : 'none'
    
    const response = await fetchProcurementData(
      activeSearchTerm, 
      activeDistrict, 
      nextPage, 
      21,
      dateSortOrder, 
      priceSortOrder, 
      apiIncludeExpired,
      activeShowNA,
      activeMinPrice, 
      activeMaxPrice,
      activeMinDate,
      activeMaxDate,
      activeCpv,
      activeEntity,
      activeCriteria,
      activeContractType,
      activeShowArchived
    )
    
    if (response.data.length === 0) {
      setHasMoreData(false)
    } else {
      setData([...data, ...response.data])
      setCurrentPage(nextPage)
      setHasMoreData(response.data.length === 21)
    }
    
    setLoadingMore(false)
  }

  const handleSearch = () => {
    setActiveSearchTerm(searchInput)
    setActiveDistrict(selectedDistrict)
    setActiveSortOrder(sortOrder)
    setActiveShowExpired(showExpired)
    setActiveShowNA(showNA)
    setActiveMinPrice(minPrice)
    setActiveMaxPrice(maxPrice)
    setActiveMinDate(minDate)
    setActiveMaxDate(maxDate)
    setActiveCpv(selectedCpv)
    setActiveEntity(selectedEntity)
    setActiveCriteria(selectedCriteria)
    setActiveContractType(selectedContractType)
    setActiveShowArchived(showArchived)
  }

  const handleUpdateExpired = async () => {
    setUpdatingExpired(true)
    try {
      const response = await fetch('/api/update-expired', {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Reload the data to reflect the updated expired status
        window.location.reload()
      } else {
        alert(`Erro ao atualizar: ${result.error}`)
      }
    } catch (error) {
      console.error('Error updating expired status:', error)
      alert('Erro ao atualizar o estado de expiração')
    } finally {
      setUpdatingExpired(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando dados...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-300 to-slate-400 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Anúncios do DR
          </h1>
          <p className="text-lg text-slate-800">
            Explore anúncios de concursos públicos em Portugal
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-slate-300 p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {/*"Ver AnúnciosArquivado Button*/}
            <Button
              title="Filtrar por anúncios arquivados"
              onClick={() => setShowArchived(!showArchived)}
              className={`transition-all duration-200 ${
                showArchived 
                  ? 'bg-amber-300 hover:bg-amber-400 text-amber-950 border border-amber-500' 
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
              } shadow-sm`}
              size="sm"
            >
              <Archive className="h-4 w-4 mr-2" />
              Anúncios Arquivados
            </Button>
            {/* N/A Button */}
            <Button
              title="Filtrar por anúncios N/A"
              onClick={() => {
                setShowNA(!showNA)
                if (!showNA) setShowExpired(false)
              }}
              className={`transition-all duration-200 ${
                showNA
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground border border-primary'
                  : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30'
              } shadow-sm`}
              size="sm"
            >
              Anúncios N/A
            </Button>
            {/* Expirados Button */}
            <Button
              title="Filtrar por anúncios expirados"
              onClick={() => {
                setShowExpired(!showExpired)
                if (!showExpired) setShowNA(false)
              }}
              className={`transition-all duration-200 ${
                showExpired
                  ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground border border-destructive'
                  : 'bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30'
              } shadow-sm`}
              size="sm"
            >
              Anúncios Expirados
            </Button>
            
            <Button
              onClick={handleUpdateExpired}
              disabled={updatingExpired}
              variant="outline"
              size="sm"
              className="text-xs border-slate-300 hover:bg-slate-100"
            >
              {updatingExpired ? "A atualizar..." : "Atualizar Expirados"}
            </Button>
          </div>

          {/* Search box */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center w-full">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
                <Input
                  placeholder="Pesquisar por descrição..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10 bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                />
              </div>
            </div>
          </div>

          {/* CPV, Adjudication Criteria, and Contract Type Filters */}
          <div className="flex items-center gap-4">
            {/* Entity Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap text-slate-700">
                Entidade:
              </label>
              <Input
                type="text"
                placeholder="ex: Câmara Municipal"
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-[200px] h-9 bg-white border-slate-300"
              />
            </div>

            {/* CPV Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap text-slate-700">
                CPV:
              </label>
              <Input
                type="text"
                placeholder="ex: 72000000"
                value={selectedCpv === "all" ? "" : selectedCpv}
                onChange={(e) => {
                  const value = e.target.value.trim()
                  setSelectedCpv(value === "" ? "all" : value)
                }}
                onKeyPress={handleKeyPress}
                className="w-[200px] h-9 bg-white border-slate-300"
              />
            </div>

            {/* Contract Type Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap text-slate-700">
                Tipo de Contrato:
              </label>
              <Select value={selectedContractType} onValueChange={setSelectedContractType}>
                <SelectTrigger className="w-[200px] bg-white border-slate-300">
                  <SelectValue placeholder="Todos os Tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  {contractTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Adjudication Criteria and District Filters */}
          <div className="flex items-center gap-4">
            {/* Adjudication Criteria Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap text-slate-700">
                Critérios de Adjudicação:
              </label>
              <Select value={selectedCriteria} onValueChange={setSelectedCriteria}>
                <SelectTrigger className="w-[150px] bg-white border-slate-300">
                  <SelectValue placeholder="Critérios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outros">Todos</SelectItem>
                  <SelectItem value="precos">Preços</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* District Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap text-slate-700">
                Distrito:
              </label>
              <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                <SelectTrigger className="w-[180px] bg-white border-slate-300">
                  <SelectValue placeholder="Distrito" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Distritos</SelectItem>
                  {districts.map((district) => (
                    <SelectItem key={district} value={district}>
                      {district}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price Range and Date Range Filters */}
          <div className="flex items-center gap-4">
            {/* Price Range Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap text-slate-700">
                Preço:
              </label>
            <Input
              type="number"
              placeholder="Min (€)"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-32 h-9 bg-white border-slate-300"
            />
            <span className="text-sm text-slate-600">-</span>
            <Input
              type="number"
              placeholder="Max (€)"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-32 h-9 bg-white border-slate-300"
            />
            {(minPrice !== "" || maxPrice !== "") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMinPrice("")
                  setMaxPrice("")
                }}
                className="h-9 px-3 cursor-pointer border border-slate-300 hover:bg-slate-100"
              >
                Limpar
              </Button>
            )}
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap text-slate-700">
                Datas:
              </label>
              <Input
                type="date"
                value={minDate}
                onChange={(e) => {
                  setMinDate(e.target.value)
                }}
                className="w-40 h-9 bg-white border-slate-300"
              />
              <span className="text-sm text-slate-600">-</span>
              <Input
                type="date"
                value={maxDate}
                onChange={(e) => {
                  setMaxDate(e.target.value)
                }}
                className="w-40 h-9 bg-white border-slate-300"
              />
              {(minDate !== sevenDaysAgo || maxDate !== today) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMinDate(sevenDaysAgo)
                    setMaxDate(today)
                  }}
                  className="h-9 px-3 cursor-pointer border border-slate-300 hover:bg-slate-100"
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Sort Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={sortOrder} onValueChange={(value) => {
              setSortOrder(value)
            }}>
              <SelectTrigger className="bg-white border-slate-300">
                {sortOrder.includes('desc') ? (
                  <ArrowDown className="h-4 w-4 mr-2" />
                ) : (
                  <ArrowUp className="h-4 w-4 mr-2" />
                )}
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Data: Mais Recentes</SelectItem>
                <SelectItem value="date-asc">Data: Mais Antigos</SelectItem>
                <SelectItem value="price-desc">Preço: Descendente</SelectItem>
                <SelectItem value="price-asc">Preço: Ascendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Button - Full Width */}
          <Button 
            onClick={handleSearch} 
            className="w-full transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer bg-slate-700 hover:bg-slate-800 text-white"
          >
            Pesquisar
          </Button>

          <div className="flex justify-between items-center text-sm text-slate-600">
            <span>
              Mostrando {filteredData.length} anúncios (de {totalCount} disponíveis)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`h-8 w-8 p-0 ${viewMode === 'grid' ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-slate-100'}`}
                title="Vista em Grellha"
              >
                <LayoutGrid className={`h-4 w-4 ${viewMode === 'grid' ? 'text-white' : 'text-slate-600'}`} />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={`h-8 w-8 p-0 ${viewMode === 'list' ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-slate-100'}`}
                title="Vista em Lista"
              >
                <List className={`h-4 w-4 ${viewMode === 'list' ? 'text-white' : 'text-slate-600'}`} />
              </Button>
            </div>
          </div>
        </div>

        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'flex flex-col space-y-4'}>
          {filteredData.map((item: ProcurementItem) => (
            <ProcurementCard key={item.id} item={item} viewMode={viewMode} />
          ))}
        </div>

        {filteredData.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-slate-600">Nenhum anúncio encontrado com os filtros aplicados.</p>
          </div>
        )}

        {hasMoreData && !loading && filteredData.length > 0 && (
          <div className="flex justify-center mt-8">
            <Button 
              onClick={loadMoreData} 
              disabled={loadingMore}
              variant="outline"
              className="px-8 cursor-pointer border-slate-300 hover:bg-slate-100"
            >
              {loadingMore ? "Carregando..." : "Carregar Mais"}
            </Button>
          </div>
        )}

        {!hasMoreData && filteredData.length > 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-slate-600 text-sm">Todos os anúncios foram carregados.</p>
          </div>
        )}
      </div>
    </div>
  )
}