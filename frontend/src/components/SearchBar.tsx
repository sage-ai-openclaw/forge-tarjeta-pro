import { Search, X } from 'lucide-react';
import { useState, useCallback } from 'react';
import { usePromotionStore } from '../stores/promotionStore';
import { clsx } from 'clsx';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const { searchPromotions, fetchPromotions, isLoading } = usePromotionStore();

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      await searchPromotions(query);
    } else {
      await fetchPromotions();
    }
  }, [query, searchPromotions, fetchPromotions]);

  const handleClear = useCallback(async () => {
    setQuery('');
    await fetchPromotions();
  }, [fetchPromotions]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-2xl">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className={clsx(
            'w-5 h-5',
            isLoading ? 'text-blue-500 animate-pulse' : 'text-gray-400'
          )} />
        </div>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Buscar promociones, comercios, categorías..."
          className="input pl-10 pr-10 py-3 text-base w-full"
          disabled={isLoading}
        />
        
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>
      
      <button
        type="submit"
        className="sr-only"
        disabled={isLoading}
      >
        Buscar
      </button>
    </form>
  );
}
