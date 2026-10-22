import React from 'react';
import { SchoolClass, Observation } from '../types/observation';
import { Users, Layers } from 'lucide-react';

interface ClassTabsProps {
  classes: SchoolClass[];
  selectedClassId: string;
  onSelectClass: (classId: string) => void;
  observations: Observation[];
}

export const ClassTabs: React.FC<ClassTabsProps> = ({
  classes,
  selectedClassId,
  onSelectClass,
  observations,
}) => {
  // 실제 데이터베이스 관찰 기록을 바탕으로 학급별 개수 집계 (하드코딩 금지)
  const countByClass = React.useMemo(() => {
    const map: Record<string, number> = {};
    classes.forEach(c => {
      map[c.id] = 0;
    });
    observations.forEach(obs => {
      if (obs.classId && map[obs.classId] !== undefined) {
        map[obs.classId]++;
      }
    });
    return map;
  }, [classes, observations]);

  const totalCount = observations.length;

  return (
    <div className="bg-white border-b border-stone-200 py-2.5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1">
          {/* 전체 탭 */}
          <button
            onClick={() => onSelectClass('all')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              selectedClassId === 'all'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-bold'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>전체 학급</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                selectedClassId === 'all'
                  ? 'bg-emerald-700/60 text-white'
                  : 'bg-stone-200/80 text-stone-600'
              }`}
            >
              {totalCount}
            </span>
          </button>

          <div className="w-px h-6 bg-stone-200 shrink-0 mx-1" />

          {/* 각 반별 탭: [1반 · 12개 관찰] */}
          {classes.map(cls => {
            const isSelected = selectedClassId === cls.id;
            const count = countByClass[cls.id] || 0;

            return (
              <button
                key={cls.id}
                onClick={() => onSelectClass(cls.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-stone-900 text-white shadow-sm font-bold ring-2 ring-emerald-500/50'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200 hover:text-stone-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 opacity-70" />
                <span>{cls.shortLabel}</span>
                <span className="opacity-40">·</span>
                <span
                  className={`text-xs ${
                    isSelected ? 'text-emerald-300 font-bold' : count > 0 ? 'text-emerald-700 font-bold' : 'text-stone-400'
                  }`}
                >
                  {count}개 관찰
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
