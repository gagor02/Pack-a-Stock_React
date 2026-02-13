'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'
import {
  CreditCard, Check, Crown, Calendar, Users, MapPin,
  Star, Zap, Shield, X, Clock, Receipt,
} from 'lucide-react'
import { useSubscriptionPlans, useSubscriptionStatus, usePaymentHistory, useSubscribe } from '@/hooks/useSubscription'
import { SubscriptionPlan } from '@/services/subscription.service'

export default function SubscriptionPage() {
  const router = useRouter()
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [cardData, setCardData] = useState({
    card_number: '',
    card_holder: '',
    expiry: '',
    cvv: '',
  })

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) router.push('/login')
  }, [router])

  const { data: plans = [], isLoading: loadingPlans } = useSubscriptionPlans()
  const { data: subscriptionStatus, isLoading: loadingStatus } = useSubscriptionStatus()
  const { data: payments = [], isLoading: loadingPayments } = usePaymentHistory()
  const subscribeMutation = useSubscribe()

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan)
    setCardData({ card_number: '', card_holder: '', expiry: '', cvv: '' })
    setShowPaymentModal(true)
  }

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlan) return

    subscribeMutation.mutate(
      {
        plan_id: selectedPlan.id,
        ...cardData,
      },
      {
        onSuccess: () => {
          setShowPaymentModal(false)
          setSelectedPlan(null)
        },
      }
    )
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 16)
    return cleaned.replace(/(\d{4})/g, '$1 ').trim()
  }

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4)
    if (cleaned.length >= 3) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`
    return cleaned
  }

  const getPlanIcon = (name: string) => {
    switch (name) {
      case 'monthly': return Zap
      case 'quarterly': return Star
      case 'annual': return Crown
      default: return CreditCard
    }
  }

  const getPlanColor = (name: string) => {
    switch (name) {
      case 'monthly': return { border: 'border-l-blue-500', text: 'text-blue-400', bg: 'bg-blue-500/10' }
      case 'quarterly': return { border: 'border-l-purple-500', text: 'text-purple-400', bg: 'bg-purple-500/10' }
      case 'annual': return { border: 'border-l-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/10' }
      default: return { border: 'border-l-primary', text: 'text-primary', bg: 'bg-primary/10' }
    }
  }

  const isCurrentPlan = (planName: string) => subscriptionStatus?.subscription_plan === planName
  const isFreemium = subscriptionStatus?.subscription_plan === 'freemium'

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20">
              <CreditCard className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Suscripcion</h1>
              <p className="text-base text-muted-foreground mt-1">
                Gestiona tu plan y desbloquea todas las funcionalidades
              </p>
            </div>
          </div>
        </div>

        {/* Current Plan Status */}
        {!loadingStatus && subscriptionStatus && (
          <Card className="border-2 border-primary/30 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    {isFreemium ? (
                      <Shield className="h-6 w-6 text-primary" />
                    ) : (
                      <Crown className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      {isFreemium ? 'Plan Freemium' : `Plan ${subscriptionStatus.subscription_plan === 'monthly' ? 'Mensual' : subscriptionStatus.subscription_plan === 'quarterly' ? 'Trimestral' : 'Anual'}`}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {isFreemium
                        ? 'Funciones limitadas - Actualiza para desbloquear todo'
                        : `Vigente hasta ${formatDate(subscriptionStatus.subscription_end_date)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Usuarios: {subscriptionStatus.max_users === -1 ? 'Ilimitados' : subscriptionStatus.max_users}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Ubicaciones: {subscriptionStatus.max_locations === -1 ? 'Ilimitadas' : subscriptionStatus.max_locations}
                      </span>
                    </div>
                  </div>
                  <Badge variant={isFreemium ? 'secondary' : 'success'} className="text-sm px-3 py-1">
                    {isFreemium ? 'Gratuito' : 'Activo'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plans */}
        {loadingPlans ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-primary mb-4"></div>
            <p className="text-base text-muted-foreground">Cargando planes...</p>
          </div>
        ) : plans.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-16 text-center">
              <div className="p-4 bg-secondary/30 rounded-2xl w-fit mx-auto mb-6">
                <CreditCard className="h-14 w-14 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">No hay planes disponibles</h3>
              <p className="text-base text-muted-foreground">Los planes de suscripcion se configuraran proximamente.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const colors = getPlanColor(plan.name)
              const PlanIcon = getPlanIcon(plan.name)
              const isCurrent = isCurrentPlan(plan.name)
              const isPopular = plan.name === 'annual'

              return (
                <Card
                  key={plan.id}
                  className={`border-2 relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                    isCurrent ? 'border-primary ring-2 ring-primary/20' : isPopular ? 'border-amber-500/50' : 'border-border/50'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                      POPULAR
                    </div>
                  )}
                  <CardContent className="p-6 flex flex-col h-full">
                    {/* Plan Header */}
                    <div className="text-center mb-6">
                      <div className={`p-3 ${colors.bg} rounded-xl w-fit mx-auto mb-4`}>
                        <PlanIcon className={`h-8 w-8 ${colors.text}`} />
                      </div>
                      <h3 className="text-xl font-bold text-foreground">{plan.display_name}</h3>
                      <div className="mt-3">
                        <span className="text-4xl font-bold text-foreground">${plan.price}</span>
                        <span className="text-muted-foreground ml-1">USD</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {plan.duration_days} dias
                      </p>
                    </div>

                    {/* Features */}
                    <div className="space-y-3 flex-1 mb-6">
                      <div className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                        <span className="text-sm text-foreground">Usuarios ilimitados</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                        <span className="text-sm text-foreground">Ubicaciones ilimitadas</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                        <span className="text-sm text-foreground">Reportes completos</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                        <span className="text-sm text-foreground">Soporte prioritario</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                        <span className="text-sm text-foreground">Etiquetas QR ilimitadas</span>
                      </div>
                    </div>

                    {/* Action */}
                    <Button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={isCurrent}
                      variant={isCurrent ? 'secondary' : 'primary'}
                      size="lg"
                      className="w-full text-base"
                    >
                      {isCurrent ? 'Plan Actual' : 'Suscribirse'}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Payment History */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-3">
            <Receipt className="h-6 w-6 text-primary" />
            Historial de Pagos
          </h2>
          {loadingPayments ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : payments.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="p-10 text-center">
                <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-base text-muted-foreground">No hay pagos registrados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {payments.map((payment: any) => (
                <Card key={payment.id} className="border-l-4 border-l-green-500 hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="flex flex-col gap-4 p-5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2.5 rounded-xl bg-green-500/10">
                            <CreditCard className="h-5 w-5 text-green-400" />
                          </div>
                          <h3 className="text-base font-bold text-foreground">{payment.plan_name}</h3>
                          <div className="ml-auto flex items-center gap-2">
                            <span className="text-lg font-bold text-foreground">${payment.amount}</span>
                            <Badge variant="success" className="text-xs px-2 py-0.5">
                              {payment.status === 'completed' ? 'Completado' : payment.status === 'failed' ? 'Fallido' : payment.status === 'refunded' ? 'Reembolsado' : payment.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="flex items-center gap-2 p-2 bg-secondary/20 rounded-lg">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">****{payment.card_last_four}</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-secondary/20 rounded-lg">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground truncate">{payment.card_holder_name}</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-secondary/20 rounded-lg">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{formatDate(payment.paid_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md border-2 shadow-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  Datos de Pago
                </CardTitle>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="p-2 hover:bg-secondary/50 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Plan Summary */}
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Plan seleccionado</p>
                    <p className="text-lg font-bold text-foreground">{selectedPlan.display_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">${selectedPlan.price}</p>
                    <p className="text-xs text-muted-foreground">{selectedPlan.duration_days} dias</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handlePayment} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                    Numero de Tarjeta
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={cardData.card_number}
                      onChange={(e) => setCardData({ ...cardData, card_number: formatCardNumber(e.target.value) })}
                      placeholder="1234 5678 9012 3456"
                      required
                      maxLength={19}
                      className="w-full rounded-xl border-2 border-border bg-card px-5 py-3.5 pl-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                    Nombre del Titular
                  </label>
                  <input
                    type="text"
                    value={cardData.card_holder}
                    onChange={(e) => setCardData({ ...cardData, card_holder: e.target.value })}
                    placeholder="Juan Perez"
                    required
                    className="w-full rounded-xl border-2 border-border bg-card px-5 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                      Expiracion
                    </label>
                    <input
                      type="text"
                      value={cardData.expiry}
                      onChange={(e) => setCardData({ ...cardData, expiry: formatExpiry(e.target.value) })}
                      placeholder="MM/YY"
                      required
                      maxLength={5}
                      className="w-full rounded-xl border-2 border-border bg-card px-5 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                      CVV
                    </label>
                    <input
                      type="text"
                      value={cardData.cvv}
                      onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      placeholder="123"
                      required
                      maxLength={4}
                      className="w-full rounded-xl border-2 border-border bg-card px-5 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <Button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    variant="secondary"
                    size="lg"
                    className="text-base px-6"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={subscribeMutation.isPending}
                    size="lg"
                    className="flex-1 text-base"
                  >
                    {subscribeMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5 mr-2" />
                        Pagar ${selectedPlan.price} USD
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  )
}
