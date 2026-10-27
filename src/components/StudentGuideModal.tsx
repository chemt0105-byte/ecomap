import React from 'react';
import { X, MapPin, Camera, BookOpen, ShieldCheck, Users, Sparkles, CheckCircle } from 'lucide-react';

interface StudentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudentGuideModal: React.FC<StudentGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-stone-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between shrink-0 bg-emerald-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-stone-900 tracking-tight">
                생태지도 이용 안내
              </h3>
              <p className="text-[11px] text-emerald-800 font-medium">
                학생이 사용하기 위해 필요한 5가지 핵심 가이드
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
          {/* Step 1 */}
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200/80">
            <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black shrink-0 text-xs">
              1
            </div>
            <div>
              <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                <span>위성지도에서 위치 콕 찍기</span>
              </h4>
              <p className="text-stone-600 mt-0.5 leading-relaxed">
                위성 사진을 손가락이나 마우스로 드래그하고 확대하여, 식물이나 동물을 발견한 장소를 터치(클릭)하세요.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200/80">
            <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black shrink-0 text-xs">
              2
            </div>
            <div>
              <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                <span>핵심 정보 간편 등록</span>
              </h4>
              <p className="text-stone-600 mt-0.5 leading-relaxed">
                생물 이름, 분류, 우리 반, 관찰자 이름, 발견한 특징을 적어주세요.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200/80">
            <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black shrink-0 text-xs">
              3
            </div>
            <div>
              <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                <span>사진 촬영 or 앨범 선택 (선택 사항)</span>
              </h4>
              <p className="text-stone-600 mt-0.5 leading-relaxed">
                모바일에서 <strong>[직접 촬영하기]</strong>로 바로 찍거나, <strong>[앨범에서 선택]</strong>으로 이미 찍은 사진을 올릴 수 있습니다. (사진이 없어도 글만 먼저 등록 가능!)
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200/80">
            <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black shrink-0 text-xs">
              4
            </div>
            <div>
              <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                <span>친구들의 관찰 탐색하기</span>
              </h4>
              <p className="text-stone-600 mt-0.5 leading-relaxed">
                상단의 <strong>1반 ~ 7반 탭</strong>을 누르면 반별로 학생들이 꽂은 핀과 관찰 목록을 비교해 볼 수 있습니다.
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200/80">
            <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black shrink-0 text-xs">
              5
            </div>
            <div>
              <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>안전한 기록 보관 (타인 삭제 방지)</span>
              </h4>
              <p className="text-stone-600 mt-0.5 leading-relaxed">
                내가 쓴 기록은 내 스마트폰에서 바로 삭제할 수 있으며, 다른 학생이 내 기록을 지울 수 없도록 4자리 비밀번호로 보호됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-stone-100 flex items-center justify-end bg-stone-50 shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <CheckCircle className="w-4 h-4" />
            <span>확인했습니다 (탐사 시작)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
