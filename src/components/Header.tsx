import React from 'react';
import { Leaf, Plus, Database, RefreshCw, GraduationCap, ShieldCheck } from 'lucide-react';
import { isTeacherMode } from '../services/authService';

interface HeaderProps {
  totalCount: number;
  filteredCount: number;
  onOpenAddModal: () => void;
  onOpenDevModal: () => void;
  onOpenTeacherModal: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  totalCount,
  filteredCount,
  onOpenAddModal,
  onOpenDevModal,
  onOpenTeacherModal,
  onRefresh,
  isLoading,
}) => {
  const isTeacher = isTeacherMode();

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Logo & Titles */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Leaf className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                  중화고등학교 생태지도
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  전체 {totalCount}개 관찰 기록
                </span>
                {isTeacher && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                    <span>교사 관리자 모드</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-stone-500 font-medium">
                우리 학교의 생명을 발견하고, 기록하고, 함께 완성하는 생태지도
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between md:justify-end">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="데이터 새로고침"
              className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors border border-stone-200 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            {/* 교사 모드 버튼 */}
            <button
              onClick={onOpenTeacherModal}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                isTeacher
                  ? 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-purple-600" />
              <span>{isTeacher ? '교사 모드 중' : '교사 로그인'}</span>
            </button>

            <button
              onClick={onOpenDevModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-stone-600 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors cursor-pointer"
              title="테스트 데이터 관리"
            >
              <Database className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden sm:inline">테스트 데이터</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-emerald-600/25 transition-all hover:shadow-lg active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>관찰 기록 추가</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
