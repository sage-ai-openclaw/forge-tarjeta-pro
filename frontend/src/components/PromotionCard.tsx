import { Calendar, MapPin, Percent, CreditCard, ExternalLink } from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Promotion } from '../types';
import { clsx } from 'clsx';

interface PromotionCardProps {
  promotion: Promotion;
}

export function PromotionCard({ promotion }: PromotionCardProps) {
  const validUntil = parseISO(promotion.validUntil);
  const isExpired = isPast(validUntil) && !isToday(validUntil);
  const isExpiringSoon = !isExpired && validUntil.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  const getBankColor = (bankName?: string) => {
    const colors: Record<string, string> = {
      'Itaú': 'bg-orange-500',
      'BASA': 'bg-blue-600',
      'Continental': 'bg-green-600',
      'Vision': 'bg-red-600',
      'Familiar': 'bg-yellow-500',
    };
    return colors[bankName || ''] || 'bg-gray-500';
  };

  return (
    <article className={clsx(
      'card group relative',
      isExpired && 'opacity-60'
    )}>
      {/* Bank indicator */}
      <div className={clsx(
        'absolute top-0 left-0 w-1 h-full',
        getBankColor(promotion.bankName)
      )} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={clsx(
                'text-xs font-semibold px-2 py-0.5 rounded',
                getBankColor(promotion.bankName),
                'text-white'
              )}>
                {promotion.bankName}
              </span>
              <span className="badge-blue">
                {promotion.cardName}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 leading-tight">
              {promotion.title}
            </h3>
          </div>
          
          {promotion.discountPercentage && (
            <div className="flex items-center justify-center w-14 h-14 bg-green-100 rounded-full ml-3 shrink-0">
              <span className="text-lg font-bold text-green-700">
                {promotion.discountPercentage}%
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        {promotion.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {promotion.description}
          </p>
        )}

        {/* Details */}
        <div className="space-y-2 text-sm">
          {promotion.merchantName && (
            <div className="flex items-center text-gray-700">
              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
              <span>{promotion.merchantName}</span>
              {promotion.merchantAddress && (
                <span className="text-gray-500 ml-1">- {promotion.merchantAddress}</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className={clsx(
              'flex items-center',
              isExpired ? 'text-red-600' : isExpiringSoon ? 'text-orange-600' : 'text-gray-600'
            )}>
              <Calendar className="w-4 h-4 mr-2" />
              <span>
                {isExpired 
                  ? 'Vencido' 
                  : `Vence ${format(validUntil, 'dd MMM yyyy', { locale: es })}`
                }
              </span>
            </div>

            {isExpiringSoon && !isExpired && (
              <span className="badge-orange">
                ¡Pronto!
              </span>
            )}
          </div>

          {promotion.discountAmount && (
            <div className="flex items-center text-gray-600">
              <CreditCard className="w-4 h-4 mr-2 text-gray-400" />
              <span>
                Gs. {promotion.discountAmount.toLocaleString('es-PY')} 
                {promotion.maxDiscountAmount && ` (máx. Gs. ${promotion.maxDiscountAmount.toLocaleString('es-PY')})`}
              </span>
            </div>
          )}

          {promotion.daysOfWeek && (
            <div className="flex items-center text-gray-600">
              <Percent className="w-4 h-4 mr-2 text-gray-400" />
              <span>Válido: {promotion.daysOfWeek}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="badge-purple">
            {promotion.category}
          </span>
          
          {promotion.sourceUrl && (
            <a
              href={promotion.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              Ver más
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
