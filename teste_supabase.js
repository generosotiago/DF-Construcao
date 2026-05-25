import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Faz o dotenv para ler o db.connect.env
dotenv.config({ path: './db_connect.env' })

// Puxa as variáveis carregadas do arquivo
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

// Validação  no terminal para ver o arquivo foi lido
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erro: Não foi possível ler as variáveis de db_connect.env. Verifique o nome do arquivo ou os caminhos.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testarConexao() {
  console.log(`Tentando conectar ao banco usando o arquivo db_connect.env...`)
  console.log(`URL carregada: ${supabaseUrl}`)
  
  // Roda um touch na tabela especificada abaixo
  const { data, error } = await supabase.from('usuarios').select('*').limit(1)

  if (error) {
    console.error('❌ Erro de conexão com o banco:', error.message)
  } else {
    console.log('✅ Conexão e variáveis de ambiente validadas com sucesso! Dados recebidos:', data)
  }
}

testarConexao()