import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Server, ShieldCheck } from 'lucide-react'
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider'
import { LoginScreen } from '@/features/auth/LoginScreen'
import { StoreProvider } from '@/lib/store/StoreProvider'
import { ConfirmProvider } from '@/components/ui/ConfirmProvider'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { AtividadesPage } from '@/pages/AtividadesPage'
import { FinanceiroPage } from '@/pages/FinanceiroPage'
import { ClientesPage } from '@/pages/ClientesPage'
import { LeadsPage } from '@/pages/LeadsPage'
import { ProjetosPage } from '@/pages/ProjetosPage'
import { ProjetoDetailPage } from '@/pages/ProjetoDetailPage'
import { ProjetosPessoaisPage } from '@/pages/ProjetosPessoaisPage'
import { CalendarioPage } from '@/pages/CalendarioPage'
import { NotasPage } from '@/pages/NotasPage'
import { EquipePage } from '@/pages/EquipePage'
import { ConfigPage } from '@/pages/ConfigPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { EntropyMark } from '@/components/brand/EntropyMark'

function Gate() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian">
        <EntropyMark className="h-8 w-8 animate-pulse" />
      </div>
    )
  }

  if (!user) return <LoginScreen />

  return (
    <StoreProvider>
      <ConfirmProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="atividades" element={<AtividadesPage />} />
            <Route path="financeiro" element={<FinanceiroPage />} />
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="projetos" element={<ProjetosPage />} />
            <Route path="projetos/:id" element={<ProjetoDetailPage />} />
            <Route path="projetos-pessoais" element={<ProjetosPessoaisPage />} />
            <Route path="calendario" element={<CalendarioPage />} />
            <Route path="notas" element={<NotasPage />} />
            <Route path="equipe" element={<EquipePage />} />
            <Route
              path="infraestrutura"
              element={
                <PlaceholderPage
                  icon={Server}
                  title="Infraestrutura"
                  description="Monitoramento de servidores, uptime e latência chega em breve."
                />
              }
            />
            <Route
              path="seguranca"
              element={
                <PlaceholderPage
                  icon={ShieldCheck}
                  title="Segurança"
                  description="Logs de firewall, tentativas de acesso e auditoria chegam em breve."
                />
              }
            />
            <Route path="config" element={<ConfigPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ConfirmProvider>
    </StoreProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
      <Toaster theme="dark" position="bottom-right" />
    </BrowserRouter>
  )
}
