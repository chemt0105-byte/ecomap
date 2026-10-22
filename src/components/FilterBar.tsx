import React from 'react';
import { CATEGORIES } from '../config/mapConfig';
import { CategoryType, ObservationFilter } from '../types/observation';
import { Search, Filter, ArrowUpDown, X } from 'lucide-react';

interface FilterBarProps {
  filter: ObservationFilter;
  onChangeFilter: (updates: Partial<ObservationFilter>) => void;
  filteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filter,
  onChangeFilter,
  filteredCount,
}) => {
  const categoryKeys = Object.keys(CATEGORIES) as CategoryType[];

  return (
    <div className="bg-stone-50 border-b border-stone-200 px-4 sm:px-6 lg:px-8 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Categories scroll list */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => onChangeFilter({ selectedCategory: 'all' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filter.selectedCategory === 'all'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
            }`}
          >
            생물 전체
          </button>

          {categoryKeys.map(catKey => {
            const cat = CATEGORIES[catKey];
            const isSelected = filter.selectedCategory === catKey;

            return (
              <button
                key={catKey}
                onClick={() => onChangeFilter({ selectedCategory: catKey })}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cat.pinBg }}
                />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filter.searchQuery}
              onChange={e => onChangeFilter({ searchQuery: e.target.value })}
              placeholder="생물명, 관찰자, 위치 검색..."
              className="w-full pl-8 pr-7 py-1.5 bg-white border border-stone-200 rounded-lg text-xs placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
            />
            {filter.searchQuery && (
              <button
                onClick={() => onChangeFilter({ searchQuery: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="relative shrink-0">
            <select
              value={filter.sortBy}
              onChange={e =>
                onChangeFilter({ sortBy: e.target.value as 'latest' | 'oldest' | 'name' })
              }
              className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 cursor-pointer"
            >
              <option value="latest">최신 등록순</option>
              <option value="oldest">오래된순</option>
              <option value="name">가나다 이름순</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
