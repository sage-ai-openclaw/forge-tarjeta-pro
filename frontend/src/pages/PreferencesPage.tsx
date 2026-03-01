import { useEffect, useState } from 'react';
import { useUserPreferencesStore } from '../stores/userPreferencesStore';
import { 
  Settings, 
  CreditCard, 
  Tag, 
  MapPin, 
  Percent, 
  Bell, 
  Save, 
  Check,
  Building2,
  Loader2
} from 'lucide-react';
import { clsx } from 'clsx';

interface PreferencesPageProps {
  userId?: number;
  onNavigateToDashboard?: () => void;
}

export function PreferencesPage({ userId = 1, onNavigateToDashboard }: PreferencesPageProps) {
  const {
    userCards,
    preferences,
    availableCards,
    availableCategories,
    isLoading,
    isSaving,
    error,
    setUserId,
    fetchUserPreferences,
    fetchUserCards,
    fetchAvailableCards,
    fetchAvailableCategories,
    toggleUserCard,
    setPreferredCategories,
    setMinDiscountPercentage,
    setNotificationSettings,
  } = useUserPreferencesStore();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minDiscount, setMinDiscount] = useState(0);
  const [notifyNew, setNotifyNew] = useState(true);
  const [notifyExpiring, setNotifyExpiring] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize on mount
  useEffect(() => {
    setUserId(userId);
    fetchAvailableCards();
    fetchAvailableCategories();
  }, [userId]);

  // Sync local state with store
  useEffect(() => {
    if (preferences) {
      setSelectedCategories(preferences.preferredCategories || []);
      setMinDiscount(preferences.minDiscountPercentage || 0);
      setNotifyNew(preferences.notifyNewPromotions);
      setNotifyExpiring(preferences.notifyExpiringSoon);
    }
  }, [preferences]);

  // Group cards by bank
  const cardsByBank = availableCards.reduce((acc, card) => {
    const bankName = card.bankName || 'Unknown Bank';
    if (!acc[bankName]) acc[bankName] = [];
    acc[bankName].push(card);
    return acc;
  }, {} as Record<string, typeof availableCards>);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSaveCategories = async () => {
    await setPreferredCategories(selectedCategories);
    showSaveSuccess();
  };

  const handleSaveDiscount = async () => {
    await setMinDiscountPercentage(minDiscount);
    showSaveSuccess();
  };

  const handleSaveNotifications = async () => {
    await setNotificationSettings({
      notifyNewPromotions: notifyNew,
      notifyExpiringSoon: notifyExpiring,
    });
    showSaveSuccess();
  };

  const showSaveSuccess = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleCardToggle = async (cardId: number, checked: boolean) => {
    await toggleUserCard(cardId, checked);
  };

  if (isLoading && !preferences) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando preferencias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            {onNavigateToDashboard && (
              <button
                onClick={onNavigateToDashboard}
                className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Volver"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <Settings className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Preferencias</h1>
              <p className="text-sm text-gray-600">
                Personaliza tus tarjetas y preferencias de promociones
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success message */}
        {saveSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <Check className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-800 font-medium">Preferencias guardadas exitosamente</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            Error: {error}
          </div>
        )}

        <div className="space-y-6">
          {/* My Cards Section */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center">
                <CreditCard className="w-6 h-6 text-blue-600 mr-3" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Mis Tarjetas</h2>
                  <p className="text-sm text-gray-600">
                    Selecciona las tarjetas que tienes para ver promociones personalizadas
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {Object.entries(cardsByBank).map(([bankName, cards]) => (
                <div key={bankName} className="mb-6 last:mb-0">
                  <div className="flex items-center mb-3">
                    <Building2 className="w-4 h-4 text-gray-500 mr-2" />
                    <h3 className="font-medium text-gray-900">{bankName}</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                    {cards.map((card) => {
                      const isSelected = userCards.some(uc => uc.cardId === card.id);
                      return (
                        <label
                          key={card.id}
                          className={clsx(
                            'flex items-center p-3 rounded-lg border cursor-pointer transition-colors',
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleCardToggle(card.id, e.target.checked)}
                            disabled={isSaving}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="ml-3 flex-1">
                            <span className="text-sm font-medium text-gray-900">{card.name}</span>
                            <span className={clsx(
                              'ml-2 text-xs px-2 py-0.5 rounded-full',
                              card.type === 'credit'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-green-100 text-green-700'
                            )}>
                              {card.type === 'credit' ? 'Crédito' : 'Débito'}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Categories Section */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Tag className="w-6 h-6 text-blue-600 mr-3" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Categorías Preferidas</h2>
                    <p className="text-sm text-gray-600">
                      Selecciona las categorías de promociones que te interesan
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSaveCategories}
                  disabled={isSaving}
                  className="btn-primary flex items-center"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-6">
              {availableCategories.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay categorías disponibles</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableCategories.map((category) => (
                    <label
                      key={category}
                      className={clsx(
                        'flex items-center p-3 rounded-lg border cursor-pointer transition-colors',
                        selectedCategories.includes(category)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => handleCategoryToggle(category)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-900">{category}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Minimum Discount Section */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Percent className="w-6 h-6 text-blue-600 mr-3" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Descuento Mínimo</h2>
                    <p className="text-sm text-gray-600">
                      Solo mostrar promociones con al menos este porcentaje de descuento
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSaveDiscount}
                  disabled={isSaving}
                  className="btn-primary flex items-center"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={minDiscount}
                  onChange={(e) => setMinDiscount(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-2xl font-bold text-blue-600 w-20 text-right">
                  {minDiscount}%
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {minDiscount === 0 
                  ? 'Mostrar todas las promociones' 
                  : `Solo promociones con ${minDiscount}% o más de descuento`}
              </p>
            </div>
          </section>

          {/* Notifications Section */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bell className="w-6 h-6 text-blue-600 mr-3" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Notificaciones</h2>
                    <p className="text-sm text-gray-600">
                      Configura qué notificaciones deseas recibir
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSaveNotifications}
                  disabled={isSaving}
                  className="btn-primary flex items-center"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notifyNew}
                    onChange={(e) => setNotifyNew(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-900">Nuevas promociones</span>
                    <p className="text-xs text-gray-500">Notificarme cuando hay nuevas promociones disponibles</p>
                  </div>
                </div>
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notifyExpiring}
                    onChange={(e) => setNotifyExpiring(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-900">Promociones por vencer</span>
                    <p className="text-xs text-gray-500">Notificarme cuando mis promociones favoritas estén por vencer</p>
                  </div>
                </div>
              </label>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
