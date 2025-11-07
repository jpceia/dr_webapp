import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArchiveButton } from "@/components/archive-button"
import { NotesBox } from "@/components/notes-box"
import { 
  ArrowLeft, 
  FileText, 
  Building, 
  Calendar, 
  Clock, 
  Euro, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  User,
  FileCheck,
  AlertCircle,
  ExternalLink
} from "lucide-react"
import Link from "next/link"
import { formatPrice, formatDate } from "@/lib/format-utils"
import { BASE_URL } from "@/lib/constants"

async function getAnnouncement(id: string) {
  try {
    const response = await fetch(`${BASE_URL}/api/procurements/${id}`, {
      cache: 'no-store'
    })
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error('Error fetching announcement:', error)
    return null
  }
}

async function getAdjudicationFactors(id: string) {
  try {
    const response = await fetch(`${BASE_URL}/api/procurements/${id}/adjudication-factors`, {
      cache: 'no-store'
    })
    if (!response.ok) return []
    const data = await response.json()
    return data.factors || []
  } catch (error) {
    console.error('Error fetching adjudication factors:', error)
    return []
  }
}

// Group adjudication factors by factor name and other_factor_name combination
function groupAdjudicationFactors(factors: any[]) {
  const grouped = new Map<string, any>()
  
  factors.forEach((factor) => {
    // Create a unique key combining both factor_name and other_factor_name
    const key = `${factor.factor_name || ''}_${factor.other_factor_name || ''}`
    
    if (!grouped.has(key)) {
      // First occurrence of this factor
      grouped.set(key, {
        factorName: factor.factor_name,
        otherFactorName: factor.other_factor_name,
        factorPercentage: factor.factor_percentage,
        subfactors: []
      })
    }
    
    // Add subfactor if it exists
    if (factor.subfactor_name) {
      grouped.get(key)!.subfactors.push({
        name: factor.subfactor_name,
        percentage: factor.subfactor_percentage
      })
    }
  })
  
  return Array.from(grouped.values())
}

function InfoField({ label, value, icon: Icon }: { label: string; value: any; icon?: any }) {
  if (!value || value === 'N/A' || value === '') return null
  
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
      </div>
      <p className="text-sm text-foreground ml-6">{value}</p>
    </div>
  )
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  )
}

export default async function ProcurementDetailPage({ params }: { params: { id: string } }) {
  const [announcement, adjudicationFactors] = await Promise.all([
    getAnnouncement(params.id),
    getAdjudicationFactors(params.id)
  ])
  
  // Group adjudication factors by factor name
  const groupedFactors = adjudicationFactors.length > 0 
    ? groupAdjudicationFactors(adjudicationFactors)
    : []
  
  if (!announcement) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-300 to-slate-400">
      {/* Header */}
      <div className="bg-white border-b border-slate-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline" size="sm" className="border-slate-300">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {announcement.object_designation || 'Detalhes do Anúncio'}
                </h1>
                <p className="text-sm text-slate-600">
                  Processo nº {announcement.number || announcement.id}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Archive Button */}
        <ArchiveButton announcementId={announcement.id} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Object Description */}
            <SectionCard title="Descrição do Objeto" icon={FileText}>
              <div className="space-y-4">
                <InfoField 
                  label="Resumo" 
                  value={announcement.summary}
                />
                <InfoField 
                  label="Referência Interna" 
                  value={announcement.object_internal_ref}
                />
              </div>
            </SectionCard>

            {/* Contract Details */}
            <SectionCard title="Detalhes do Contrato" icon={FileCheck}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <InfoField 
                    label="Tipo de Contrato Principal" 
                    value={announcement.object_main_contract_type}
                  />
                  <InfoField 
                    label="Tipo de Contrato" 
                    value={announcement.object_contract_type}
                  />
                  <InfoField 
                    label="CPV Principal" 
                    value={announcement.object_main_cpv}
                  />
                  <InfoField 
                    label="Tipo de Bens" 
                    value={announcement.object_type_of_goods}
                  />
                </div>
                <div className="space-y-4">
                  <InfoField 
                    label="Preço Base" 
                    value={formatPrice(announcement.base_price)}
                    icon={Euro}
                  />
                  <InfoField 
                    label="Avaliação de Ativos" 
                    value={formatPrice(announcement.asset_valuation)}
                    icon={Euro}
                  />
                  <InfoField 
                    label="Tem Lotes" 
                    value={announcement.has_lots === 'true' ? 'Sim' : 'Não'}
                  />
                  <InfoField 
                    label="Máx. Lotes Autorizados" 
                    value={announcement.processo_max_lotes_autorizado}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Process Information */}
            <SectionCard title="Informações do Processo" icon={AlertCircle}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <InfoField 
                    label="Tipo de Processo" 
                    value={announcement.processo_tipo}
                  />
                  <InfoField 
                    label="Modelo de Aviso" 
                    value={announcement.aviso_modelo}
                  />
                  <InfoField 
                    label="Plataforma de Candidatura" 
                    value={announcement.application_platform}
                  />
                  <InfoField 
                    label="Legislação Aplicável" 
                    value={announcement.applicable_legislation}
                  />
                </div>
                <div className="space-y-4">
                  <InfoField 
                    label="Data de Publicação" 
                    value={formatDate(announcement.publication_date)}
                    icon={Calendar}
                  />
                  <InfoField 
                    label="Prazo de Candidatura" 
                    value={formatDate(announcement.application_deadline)}
                    icon={Clock}
                  />
                  <InfoField 
                    label="Data de Envio do Aviso" 
                    value={formatDate(announcement.aviso_data_envio)}
                    icon={Calendar}
                  />
                  <InfoField 
                    label="Publicado no Jornal UE" 
                    value={announcement.in_ue_journal ? 'Sim' : 'Não'}
                  />
                </div>
              </div>

              {/* Adjudication Criteria Table */}
              {groupedFactors && groupedFactors.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Critérios de Adjudicação</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-border">
                        <thead>
                          <tr className="bg-muted">
                            <th className="border border-border p-2 text-left">Fator</th>
                            <th className="border border-border p-2 text-left">Designação</th>
                            <th className="border border-border p-2 text-left">Ponderação</th>
                            <th className="border border-border p-2 text-left">Subfator</th>
                            <th className="border border-border p-2 text-left">Ponderação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedFactors.map((factor: any, factorIndex: number) => {
                            const hasSubfactors = factor.subfactors && factor.subfactors.length > 0
                            
                            if (!hasSubfactors) {
                              // Factor without subfactors - single row
                              return (
                                <tr key={factorIndex} className="hover:bg-muted/50">
                                  <td className="border border-border p-2">{factor.factorName || '-'}</td>
                                  <td className="border border-border p-2">{factor.otherFactorName || '-'}</td>
                                  <td className="border border-border p-2">
                                    {factor.factorPercentage != null ? `${factor.factorPercentage}%` : '-'}
                                  </td>
                                  <td className="border border-border p-2">-</td>
                                  <td className="border border-border p-2">-</td>
                                </tr>
                              )
                            }
                            
                            // Factor with subfactors - multiple rows with rowspan
                            return factor.subfactors.map((subfactor: any, subfactorIndex: number) => (
                              <tr key={`${factorIndex}-${subfactorIndex}`} className="hover:bg-muted/50">
                                {subfactorIndex === 0 && (
                                  <>
                                    <td 
                                      className="border border-border p-2" 
                                      rowSpan={factor.subfactors.length}
                                    >
                                      {factor.factorName || '-'}
                                    </td>
                                    <td 
                                      className="border border-border p-2" 
                                      rowSpan={factor.subfactors.length}
                                    >
                                      {factor.otherFactorName || '-'}
                                    </td>
                                    <td 
                                      className="border border-border p-2" 
                                      rowSpan={factor.subfactors.length}
                                    >
                                      {factor.factorPercentage != null ? `${factor.factorPercentage}%` : '-'}
                                    </td>
                                  </>
                                )}
                                <td className="border border-border p-2">{subfactor.name || '-'}</td>
                                <td className="border border-border p-2">
                                  {subfactor.percentage != null ? `${subfactor.percentage}%` : '-'}
                                </td>
                              </tr>
                            ))
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </SectionCard>

            {/* Links and Documents */}
            {(announcement.pdf_url || announcement.application_url || announcement.entries_url) && (
              <SectionCard title="Documentos e Links" icon={ExternalLink}>
                <div className="space-y-3">
                  {announcement.pdf_url && (
                    <div>
                      <Button variant="outline" asChild className="w-full justify-start">
                        <a href={announcement.pdf_url} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-4 w-4 mr-2" />
                          Ver Anúncio em PDF
                          <ExternalLink className="h-4 w-4 ml-auto" />
                        </a>
                      </Button>
                    </div>
                  )}
                  {announcement.entries_url && (
                    <div>
                      <Button variant="outline" asChild className="w-full justify-start">
                        <a href={announcement.entries_url} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-4 w-4 mr-2" />
                          Ver Peças do Procedimento
                          <ExternalLink className="h-4 w-4 ml-auto" />
                        </a>
                      </Button>
                    </div>
                  )}
                  {announcement.application_url && (
                    <div>
                      <Button asChild className="w-full justify-start">
                        <a href={announcement.application_url} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4 mr-2" />
                          Submeter Candidatura
                          <ExternalLink className="h-4 w-4 ml-auto" />
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Entity Information */}
            <SectionCard title="Entidade Adjudicante" icon={Building}>
              <div className="space-y-4">
                <InfoField 
                  label="Designação" 
                  value={announcement.entity_designacao || announcement.issuer}
                />
                <InfoField 
                  label="NIPC" 
                  value={announcement.entity_nipc}
                />
                <InfoField 
                  label="Área de Atividade" 
                  value={announcement.entity_area_atividade}
                />
                <InfoField 
                  label="Função da Organização" 
                  value={announcement.entity_funcao_organizacao}
                />
                <InfoField 
                  label="Subfunção da Organização" 
                  value={announcement.entity_subfuncao_organizacao}
                />
                <InfoField 
                  label="Norma Jurídica" 
                  value={announcement.entity_norma_juridica}
                />
                <InfoField 
                  label="Serviço de Contacto" 
                  value={announcement.entity_servico_contacto}
                />
                
                <Separator />
                
                <InfoField 
                  label="Endereço" 
                  value={[
                    announcement.entity_endereco,
                    announcement.entity_distrito,
                    announcement.entity_concelho,
                    announcement.entity_codigo_postal,
                    announcement.entity_pais
                  ].filter(Boolean).join(', ')}
                  icon={MapPin}
                />
                
                <Separator />
                
                <InfoField 
                  label="Telefone" 
                  value={announcement.entity_telefone}
                  icon={Phone}
                />
                <InfoField 
                  label="Fax" 
                  value={announcement.entity_fax}
                  icon={Phone}
                />
                <InfoField 
                  label="Email" 
                  value={announcement.entity_email}
                  icon={Mail}
                />
                <InfoField 
                  label="Website" 
                  value={announcement.entity_url}
                  icon={Globe}
                />
              </div>
            </SectionCard>
          </div>
        </div>

        {/* Notes Box - Moved to bottom */}
        <div className="mt-8">
          <NotesBox announcementId={announcement.id} />
        </div>
      </div>
    </div>
  )
}