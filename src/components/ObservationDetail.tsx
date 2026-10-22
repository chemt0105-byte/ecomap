import React, { useState } from 'react';
import { Observation } from '../types/observation';
import { CATEGORIES, DEFAULT_CLASSES } from '../config/mapConfig';
import { isAuthor, isTeacherMode, checkDeletePermission } from '../services/authService';
import {
  X,
  User,
  Calendar,
  Leaf,
  Trash2,
  Navigation,
  Lock,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface ObservationDetailProps {
  observation: Observation | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onLocateOnMap: (obs: Observation) => void;
}

export const ObservationDetail: React.FC<ObservationDetailProps> = ({
  observation,
  onClose,
  onDelete,
  onLocateOnMap,
}) => {
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm_author' | 'require_pin'>('idle');
  const [inputPin, setInputPin] = useState('');
  const [pinError, setPinError] = useState('');

  if (!observation) return null;

  const category = CATEGORIES[observation.category] || CATEGORIES.other;
  const classItem = DEFAULT_CLASSES.find(c => c.id === observation.classId);
  const classLabel = classItem ? classItem.label : observation.classId;

  const isMyPost = isAuthor(observation);
  const isTeacher = isTeacherMode();

  // 삭제 버튼 클릭 시 권한에 따라 분기
  const handleInitiateDelete = () => {
    setPinError('');
    setInputPin('');
    if (isMyPost || isTeacher) {
      setDeleteStep('confirm_author');
    } else {
      setDeleteStep('require_pin');
    }
  };

  // 본인 또는 교사 확인 후 삭제
  const handleConfirmDirectDelete = () => {
    onDelete(observation.id);
    setDeleteStep('idle');
    onClose();
  };

  // 타인 기기에서 비밀번호 입력 후 삭제 검증
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = checkDeletePermission(observation, inputPin);
    if (result.allowed) {
      onDelete(observation.id);
      setDeleteStep('idle');
      onClose();
    } else {
      setPinError('비밀번호가 일치하지 않습니다. 다른 학생의 관찰 기록은 삭제할 수 없습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-stone-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between shrink-0 bg-stone-50/80">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${category.badgeBg}`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: category.pinBg }}
              />
              {category.label}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-900 text-white">
              {classLabel}
            </span>

            {/* 본인 작성글 표시 */}
            {isMyPost && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>내가 쓴 기록</span>
              </span>
            )}
            {isTeacher && !isMyPost && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                <span>교사 관리 권한</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onLocateOnMap(observation)}
              className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
              title="지도에서 위치 포커스"
            >
              <Navigation className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Main Photo */}
          <div className="relative rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 max-h-80 flex items-center justify-center">
            <img
              src={observation.imageUrl}
              alt={observation.speciesName}
              className="w-full h-full object-contain max-h-80"
            />
          </div>

          {/* Title */}
          <div>
            <h2 className="text-2xl font-black text-stone-900 tracking-tight">
              {observation.speciesName}
            </h2>
          </div>

          {/* Observer & Date Summary */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70 text-xs">
            <div>
              <span className="text-stone-400 block mb-0.5 font-medium">관찰자</span>
              <span className="font-bold text-stone-800 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-stone-500" />
                {observation.observerName}
              </span>
            </div>

            <div>
              <span className="text-stone-400 block mb-0.5 font-medium">관찰 일시</span>
              <span className="font-bold text-stone-800 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-500" />
                {observation.observedAt.slice(0, 16)}
              </span>
            </div>
          </div>

          {/* Characteristics / Notes */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
              <Leaf className="w-3.5 h-3.5 text-emerald-600" />
              <span>특징 및 관찰 내용</span>
            </h4>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 text-sm leading-relaxed text-stone-800 whitespace-pre-wrap min-h-20">
              {observation.notes || '기록된 관찰 내용이 없습니다.'}
            </div>
          </div>

          {/* PIN Required Prompt (다른 학생이 삭제 시도 시 표시) */}
          {deleteStep === 'require_pin' && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-amber-900">
                    다른 학생의 관찰 기록입니다
                  </p>
                  <p className="text-amber-700 mt-0.5">
                    게시물 삭제는 <strong>작성자 본인</strong> 또는 <strong>교사</strong>만 가능합니다.
                    작성 시 설정한 4자리 비밀번호 또는 교사 마스터 비밀번호를 입력해 주세요.
                  </p>
                </div>
              </div>

              {pinError && (
                <div className="p-2 bg-rose-100/90 text-rose-800 rounded-lg text-xs font-bold">
                  {pinError}
                </div>
              )}

              <form onSubmit={handlePinSubmit} className="flex items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    maxLength={8}
                    value={inputPin}
                    onChange={e => setInputPin(e.target.value)}
                    placeholder="비밀번호 입력"
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500/30 focus:outline-none"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  확인 후 삭제
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteStep('idle')}
                  className="px-3 py-1.5 bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-300 transition-colors cursor-pointer shrink-0"
                >
                  취소
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-stone-100 flex items-center justify-between shrink-0 bg-stone-50">
          {deleteStep === 'idle' ? (
            <button
              onClick={handleInitiateDelete}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>기록 삭제</span>
            </button>
          ) : deleteStep === 'confirm_author' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-700 font-bold">
                {isTeacher ? '교사 권한으로 삭제할까요?' : '내 기록을 정말 삭제할까요?'}
              </span>
              <button
                onClick={handleConfirmDirectDelete}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                삭제 확인
              </button>
              <button
                onClick={() => setDeleteStep('idle')}
                className="px-3 py-1.5 bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold hover:bg-stone-300 transition-colors cursor-pointer"
              >
                취소
              </button>
            </div>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onLocateOnMap(observation);
                onClose();
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>지도에서 위치 보기</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
