import { useEffect } from 'react';
import { useUserPreferencesStore } from '../stores/userPreferencesStore';
import { usePromotionStore } from '../stores/promotionStore';
import { PromotionCard } from '../components/PromotionCard';
import { 
  CreditCard, 
  Sparkles, 
  Settings, 
  Filter,
  ArrowRight,
  Loader2,
  Percent,
  Tag,
  Building2
} from 'lucide-react';

interface MyPromotionsPageProps {
  userId?: number;
  onNavigateToPreferences?: () => void;
  onNavigateToDashboard?: () => void;
}

export function MyPromotionsPage({ 
  userId = 1, 
  onNavigateToPreferences,
  onNavigateToDashboard 
}: MyPromotionsPageProps) {
  const {
    userCards,
    preferences,
    myPromotions,
    isLoading,
    error,
    setUserId,
    fetchMyPromotions,
    fetchUserCards,
    fetchUserPreferences,
  } = useUserPreferencesStore();

  const { banks } = usePromotionStore();

  useEffect(() => {
    setUserId(userId);
    fetchUserCards();
    fetchUserPreferences();
    fetchMyPromotions();
  }, [userId]);

  const hasConfiguredCards = userCards.length > 0;
  const hasPreferences = preferences && (
    (preferences.preferredCategories && preferences.preferredCategories.length > 0) ||
    (preferences.minDiscountPercentage > 0)
  );

  // Calculate stats
  const activePromotions = myPromotions.filter(p => p.status === 'active').length;
  const uniqueBanks = new Set(myPromotions.map(p => p.bankName)).size;
  const uniqueCategories = new Set(myPromotions.map(p => p.category)).size;
  const expiringSoon = myPromotions.filter(p => {
    const validUntil = new Date(p.validUntil);
    const daysUntil = (validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntil > 0 && daysUntil <= 7;
  }).length;

  // Get user's bank names
  const userBankNames = [...new Set(userCards.map(uc => uc.card?.bankName).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CreditCard className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mis Promociones</h1>
                <p className="text-sm text-gray-600 hidden sm:block">
                  Promociones personalizadas para tus tarjetas
                </p>
              </div>
            </div>

            <button
              onClick={onNavigateToPreferences}
              className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurar preferencias
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-white">
              <div className="flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-blue-200" />
                <span className="text-sm text-blue-100">Mis Promociones</span>
              </div>
              <p className="text-2xl font-bold mt-1">{activePromotions}</p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-white">
              <div className="flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-blue-200" />
                <span className="text-sm text-blue-100">Bancos</span>
              </div>
              <p className="text-2xl font-bold mt-1">{uniqueBanks}</p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-white">
              <div className="flex items-center">
                <Tag className="w-5 h-5 mr-2 text-blue-200" />
                <span className="text-sm text-blue-100">Categorías</span>
              </div>
              <p className="text-2xl font-bold mt-1">{uniqueCategories}</p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-white">
              <div className="flex items-center">
                <Percent className="w-5 h-5 mr-2 text-orange-300" />
                <span className="text-sm text-blue-100">Vencen pronto</span>
              </div>
              <p className={`text-2xl font-bold mt-1 ${expiringSoon > 0 ? 'text-orange-300' : ''}`}>
                {expiringSoon}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Configuration summary */}
        <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-4">
            {!hasConfiguredCards ? (
              <div className="flex items-center text-amber-600">
                <Filter className="w-5 h-5 mr-2" />
                <span className="text-sm">No has configurado tus tarjetas. 
                  <button 
                    onClick={onNavigateToPreferences}
                    className="underline font-medium">
                    Configurar ahora
                  </button>
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center text-green-600">
                  <CreditCard className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">{userCards.length} tarjetas configuradas</span>
                </div>
                <div className="flex items-center text-blue-600">
                  <Building2 className="w-5 h-5 mr-2" />
                  <span className="text-sm">{userBankNames.join(', ')}</span>
                </div>
              </>
            )}

            {hasPreferences && preferences?.minDiscountPercentage > 0 && (
              <div className="flex items-center text-purple-600">
                <Percent className="w-5 h-5 mr-2" />
                <span className="text-sm">Min: {preferences.minDiscountPercentage}% descuento</span>
              </div>
            )}

            {hasPreferences && preferences?.preferredCategories && preferences.preferredCategories.length > 0 && (
              <div className="flex items-center text-pink-600">
                <Tag className="w-5 h-5 mr-2" />
                <span className="text-sm">{preferences.preferredCategories.length} categorías</span>
              </div>
            )}
          </div>
        </div>

        {/* Promotions grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Cargando tus promociones...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-600 mb-2">Error al cargar promociones</div>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={() => fetchMyPromotions()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reintentar
            </button>
          </div>
        ) : myPromotions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay promociones para mostrar
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {!hasConfiguredCards 
                ? 'Configura tus tarjetas bancarias para ver promociones personalizadas.'
                : 'No hay promociones que coincidan con tus preferencias actuales.'}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={onNavigateToPreferences}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurar preferencias
              </button>
              
              <button
                onClick={onNavigateToDashboard}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center"
              >
                Ver todas las promociones
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myPromotions.map((promotion) => (
              <PromotionCard key={promotion.id} promotion={promotion} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-600">
            © 2024 Tarjeta Pro - Monitor de promociones bancarias
          </p>
        </div>
      </footer>
    </div>
  );
}
