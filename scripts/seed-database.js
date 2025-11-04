import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const sampleProcurements = [
  {
    entity_designacao: "Câmara Municipal de Lisboa",
    entity_nipc: BigInt("502757120"),
    entity_endereco: "Praça do Município",
    entity_codigo_postal: "1100-038",
    entity_localidade: "Lisboa",
    entity_pais: "Portugal",
    entity_distrito: "Lisboa",
    entity_concelho: "Lisboa",
    entity_freguesia: "Santa Maria Maior",
    entity_telefone: BigInt("218172000"),
    entity_email: "geral@cm-lisboa.pt",
    entity_url: "https://www.lisboa.pt",
    entity_area_atividade: "Administração Pública Local",
    object_designation: "Fornecimento de Material de Escritório",
    object_description: "Aquisição de material de escritório para os serviços municipais",
    object_main_contract_type: "Aquisição de Bens Móveis",
    base_price: "50000.00",
    processo_tipo: "Concurso Público",
    application_platform: "VORTAL",
    publication_date: new Date().toISOString(),
    application_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    in_UE_journal: false
  },
  {
    entity_designacao: "Hospital de Santa Maria",
    entity_nipc: BigInt("600012345"),
    entity_endereco: "Avenida Professor Egas Moniz",
    entity_codigo_postal: "1649-035",
    entity_localidade: "Lisboa",
    entity_pais: "Portugal",
    entity_distrito: "Lisboa",
    entity_concelho: "Lisboa",
    entity_freguesia: "Alvalade",
    entity_telefone: BigInt("217805000"),
    entity_email: "geral@chln.min-saude.pt",
    entity_area_atividade: "Saúde",
    object_designation: "Aquisição de Equipamento Médico",
    object_description: "Fornecimento de equipamento médico para o bloco operatório",
    object_main_contract_type: "Aquisição de Bens Móveis",
    base_price: "150000.00",
    processo_tipo: "Concurso Público",
    application_platform: "ACINGOV",
    publication_date: new Date().toISOString(),
    application_deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days from now
    in_UE_journal: true
  },
  {
    entity_designacao: "Universidade de Coimbra",
    entity_nipc: BigInt("501461409"),
    entity_endereco: "Paço das Escolas",
    entity_codigo_postal: "3004-531",
    entity_localidade: "Coimbra",
    entity_pais: "Portugal",
    entity_distrito: "Coimbra",
    entity_concelho: "Coimbra",
    entity_freguesia: "Coimbra (Sé Nova, Santa Cruz, Almedina e São Bartolomeu)",
    entity_telefone: BigInt("239859900"),
    entity_email: "reitoria@uc.pt",
    entity_url: "https://www.uc.pt",
    entity_area_atividade: "Educação",
    object_designation: "Serviços de Limpeza",
    object_description: "Prestação de serviços de limpeza nas instalações universitárias",
    object_main_contract_type: "Aquisição de Serviços",
    base_price: "80000.00",
    processo_tipo: "Concurso Público",
    application_platform: "VORTAL",
    publication_date: new Date().toISOString(),
    application_deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days from now
    in_UE_journal: false
  }
]

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...')

    // Clear existing data
    await prisma.procurement.deleteMany()
    console.log('🗑️  Cleared existing procurement data')

    // Insert sample data
    for (const procurement of sampleProcurements) {
      await prisma.procurement.create({
        data: procurement
      })
    }

    console.log(`✅ Successfully seeded ${sampleProcurements.length} procurement records`)
    
    // Verify the data
    const count = await prisma.procurement.count()
    console.log(`📊 Total records in database: ${count}`)

  } catch (error) {
    console.error('❌ Error seeding database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedDatabase()