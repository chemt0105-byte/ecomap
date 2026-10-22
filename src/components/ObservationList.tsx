import React from 'react';
import { Observation } from '../types/observation';
import { ObservationCard } from './ObservationCard';
import { Leaf, Plus, Sparkles, FilterX } from 'lucide-react';

interface ObservationListProps {
  observations: Observation[];
  selectedObservationId: string | null;
  onSelectObservation: (obs: Observation) => void;
  onOpenAddModal: () => void;
  currentClassLabel: string;
  onResetFilters: () => void;
}

export const ObservationList: React.FC<ObservationListProps> = ({
  observations,
  selectedObservationId,
  onSelectObservation,
  onOpenAddModal,
  currentClassLabel,
  onResetFilters,
}) => {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-stone-50">
      {/* Header Summary */}
      <div className="px-4 py-3 bg-white border-b border-stone-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-stone-900 text-sm">
            {currentClassLabel} 관찰 기록
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            {observations.length}개
          </span>
        </div>

        <button
          onClick={onOpenAddModal}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>기록 추가</span>
        </button>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {observations.length > 0 ? (
          observations.map(obs => (
            <ObservationCard
              key={obs.id}
              observation={obs}
              isSelected={selectedObservationId === obs.id}
              onSelect={onSelectObservation}
            />
          ))
        ) : (
          /* Empty State */
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-dashed border-stone-200 my-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Leaf className="w-8 h-8 stroke-[1.8]" />
            </div>
            <h4 className="text-base font-bold text-stone-800 mb-1">
              아직 등록된 관찰 기록이 없습니다
            </h4>
            <p className="text-xs text-stone-500 max-w-xs mb-5">
              학교 교정에서 발견한 수목, 꽃, 새, 곤충의 사진을 찍고 위성지도에 첫 번째 핀을 꽂아보세요!
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAddModal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>새 관찰 기록 등록하기</span>
              </button>
              <button
                onClick={onResetFilters}
                className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-xs font-semibold transition-all"
              >
                필터 초기화
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
