import { useEffect } from 'react';
import { usePromotionStore } from '../stores/promotionStore';
import { PromotionCard } from '../components/PromotionCard';
import { FilterSidebar } from '../components/FilterSidebar';
import { SearchBar } from '../components/SearchBar';
import { CreditCard, Building2, Tag, Sparkles } from 'lucide-react';

export function Dashboard() {
  const { 
    promotions, 
    isLoading, 
    error, 
    fetchPromotions, 
    fetchBanks, 
    fetchCategories,
  } = usePromotionStore();

  useEffect(() => {
    fetchPromotions();
    fetchBanks();
    fetchCategories();
  }, [fetchPromotions, fetchBanks, fetchCategories]);

  // Calculate stats
  const activePromotions = promotions.filter(p => p.status === 'active').length;
  const uniqueBanks = new Set(promotions.map(p => p.bankName)).size;
  const uniqueCategories = new Set(promotions.map(p => p.category)).size;
  const expiringSoon = promotions.filter(p => {
    const validUntil = new Date(p.validUntil);
    const daysUntil = (validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntil > 0 && daysUntil <= 7;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CreditCard className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Tarjeta Pro</h1>
                <p className="text-sm text-gray-600 hidden sm:block">
                  Promociones bancarias en Paraguay
                </p>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-6">
              <a href="#" className="text-gray-700 hover:text-blue-600 font-medium">Dashboard</a>
              <a href="#" className="text-gray-500 hover:text-blue-600">Mis Tarjetas</a>
              <a href="#" className="text-gray-500 hover:text-blue-600">Preferencias</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-white">
              <div className="flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-blue-200" />
                <span className="text-sm text-blue-100">Activas</span>
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
                <CreditCard className="w-5 h-5 mr-2 text-orange-300" />
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
        <div className="mb-6">
          <SearchBar />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <FilterSidebar />
          </div>

          {/* Promotions grid */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando promociones...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-600 mb-2">Error al cargar promociones</div>
                <p className="text-gray-600">{error}</p>
                <button
                  onClick={() => fetchPromotions()}
                  className="mt-4 btn-primary"
                >
                  Reintentar
                </button>
              </div>
            ) : promotions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay promociones disponibles
                </h3>
                <p className="text-gray-600">
                  Intenta ajustar los filtros o busca más tarde.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {promotions.map((promotion) => (
                  <PromotionCard key={promotion.id} promotion={promotion} />
                ))}
              </div>
            )}
          </div>
        </div>
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
