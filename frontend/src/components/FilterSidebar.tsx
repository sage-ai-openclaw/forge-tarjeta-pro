import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { usePromotionStore } from '../stores/promotionStore';
import { clsx } from 'clsx';

export function FilterSidebar() {
  const { banks, categories, filters, setFilters, resetFilters } = usePromotionStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters = 
    filters.bankId || 
    filters.cardType || 
    filters.category ||
    filters.sortBy !== 'expiration' ||
    filters.sortOrder !== 'asc';

  const filterContent = (
    <>
      {/* Sort */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ordenar por
        </label>
        <select
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('-') as [typeof filters.sortBy, typeof filters.sortOrder];
            setFilters({ sortBy, sortOrder });
          }}
          className="select"
        >
          <option value="expiration-asc">Vencimiento (más cercano)</option>
          <option value="expiration-desc">Vencimiento (más lejano)</option>
          <option value="discount-desc">Mayor descuento</option>
          <option value="discount-asc">Menor descuento</option>
          <option value="created-desc">Más recientes</option>
          <option value="created-asc">Más antiguos</option>
        </select>
      </div>

      {/* Bank filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Banco
        </label>
        <select
          value={filters.bankId || ''}
          onChange={(e) => setFilters({ bankId: e.target.value ? Number(e.target.value) : undefined })}
          className="select"
        >
          <option value="">Todos los bancos</option>
          {banks.map((bank) => (
            <option key={bank.id} value={bank.id}>
              {bank.name}
            </option>
          ))}
        </select>
      </div>

      {/* Card Type filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de tarjeta
        </label>
        <div className="space-y-2">
          {[
            { value: '', label: 'Todos' },
            { value: 'credit', label: 'Crédito' },
            { value: 'debit', label: 'Débito' },
          ].map((type) => (
            <label key={type.value} className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="cardType"
                value={type.value}
                checked={filters.cardType === type.value || (!filters.cardType && type.value === '')}
                onChange={(e) => setFilters({ 
                  cardType: e.target.value || undefined 
                })}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Categoría
        </label>
        <select
          value={filters.category || ''}
          onChange={(e) => setFilters({ category: e.target.value || undefined })}
          className="select"
        >
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Reset button */}
      {hasActiveFilters && (
        <button
          onClick={resetFilters}
          className="w-full btn-secondary flex items-center justify-center"
        >
          <X className="w-4 h-4 mr-2" />
          Limpiar filtros
        </button>
      )}
    </>
  );

  return (
    <aside className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Mobile header */}
      <div 
        className="lg:hidden flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <Filter className="w-5 h-5 mr-2 text-gray-600" />
          <span className="font-medium">Filtros</span>
          {hasActiveFilters && (
            <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
              Activos
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {/* Desktop always visible, mobile conditionally */}
      <div className={clsx(
        'p-4 lg:block',
        isExpanded ? 'block' : 'hidden'
      )}>
        <div className="hidden lg:flex items-center mb-4">
          <Filter className="w-5 h-5 mr-2 text-gray-600" />
          <span className="font-medium">Filtros</span>
          {hasActiveFilters && (
            <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
              Activos
            </span>
          )}
        </div>

        {filterContent}
      </div>
    </aside>
  );
}
