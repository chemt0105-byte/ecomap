import React from 'react';
import { Observation } from '../types/observation';
import { CATEGORIES, DEFAULT_CLASSES } from '../config/mapConfig';
import { User, Calendar } from 'lucide-react';

interface ObservationCardProps {
  observation: Observation;
  isSelected: boolean;
  onSelect: (obs: Observation) => void;
}

export const ObservationCard: React.FC<ObservationCardProps> = ({
  observation,
  isSelected,
  onSelect,
}) => {
  const category = CATEGORIES[observation.category] || CATEGORIES.other;
  const classItem = DEFAULT_CLASSES.find(c => c.id === observation.classId);
  const classLabel = classItem ? classItem.shortLabel : observation.classId;

  return (
    <div
      onClick={() => onSelect(observation)}
      className={`group relative bg-white rounded-2xl border transition-all cursor-pointer overflow-hidden ${
        isSelected
          ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/10'
          : 'border-stone-200 hover:border-emerald-300 hover:shadow-md'
      }`}
    >
      <div className="flex p-3 sm:p-3.5 gap-3.5">
        {/* Photo Thumbnail */}
        <div className="relative w-24 h-24 sm:w-26 sm:h-26 rounded-xl overflow-hidden bg-stone-100 shrink-0 flex items-center justify-center border border-stone-200/60">
          {observation.imageUrl ? (
            <img
              src={observation.imageUrl}
              alt={observation.speciesName}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onError={e => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=300&q=80';
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-stone-50 text-stone-400 p-2 text-center">
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs mb-1 shadow-2xs"
                style={{ backgroundColor: category.pinBg }}
              >
                ●
              </span>
              <span className="text-[10px] font-medium text-stone-400">사진 없음</span>
            </div>
          )}
          {/* Class Tag Overlay on Image */}
          <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-stone-900/85 backdrop-blur-xs text-white">
            {classLabel}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${category.badgeBg}`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: category.pinBg }}
                />
                {category.label}
              </span>
            </div>

            <h3 className="text-base font-bold text-stone-900 truncate group-hover:text-emerald-700 transition-colors">
              {observation.speciesName}
            </h3>

            {observation.notes ? (
              <p className="text-xs text-stone-600 line-clamp-2 mt-1 leading-snug">
                {observation.notes}
              </p>
            ) : (
              <p className="text-xs text-stone-400 italic mt-1">
                기록된 특징 없음
              </p>
            )}
          </div>

          {/* Footer Info */}
          <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1.5 border-t border-stone-100 mt-2">
            <span className="flex items-center gap-1 truncate font-medium text-stone-700">
              <User className="w-3 h-3 text-stone-400" />
              <span className="truncate">{observation.observerName}</span>
            </span>

            <span className="shrink-0 text-stone-400">
              {observation.observedAt.slice(0, 10)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
