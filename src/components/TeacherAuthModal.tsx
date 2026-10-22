import React, { useState } from 'react';
import {
  loginTeacher,
  logoutTeacher,
  isTeacherMode,
  updateTeacherMasterPassword,
} from '../services/authService';
import {
  GraduationCap,
  X,
  Lock,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

interface TeacherAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthChanged: () => void;
}

export const TeacherAuthModal: React.FC<TeacherAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthChanged,
}) => {
  const isTeacher = isTeacherMode();
  const [view, setView] = useState<'status' | 'login' | 'change_password'>(
    isTeacher ? 'status' : 'login'
  );

  // Login inputs
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Password change inputs
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeError, setChangeError] = useState('');
  const [changeSuccess, setChangeSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setView(isTeacherMode() ? 'status' : 'login');
      setLoginPassword('');
      setLoginError('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangeError('');
      setChangeSuccess('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPassword.trim()) {
      setLoginError('교사 인증 비밀번호를 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    const success = await loginTeacher(loginPassword);
    setIsSubmitting(false);

    if (success) {
      setLoginError('');
      setLoginPassword('');
      onAuthChanged();
      setView('status');
    } else {
      setLoginError('비밀번호가 일치하지 않습니다. (초기 기본 비밀번호: 1234)');
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError('');
    setChangeSuccess('');

    if (!currentPassword.trim()) {
      setChangeError('현재 비밀번호를 입력해 주세요.');
      return;
    }
    if (!newPassword.trim() || newPassword.trim().length < 4) {
      setChangeError('새 비밀번호는 4자리 이상으로 입력해 주세요.');
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setChangeError('새 비밀번호와 확인 입력이 일치하지 않습니다.');
      return;
    }

    setIsSubmitting(true);
    const res = await updateTeacherMasterPassword(currentPassword, newPassword);
    setIsSubmitting(false);

    if (res.success) {
      setChangeSuccess('교사 마스터 비밀번호가 성공적으로 변경되었습니다!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setView(isTeacherMode() ? 'status' : 'login');
        setChangeSuccess('');
      }, 1500);
    } else {
      setChangeError(res.error || '비밀번호 변경에 실패했습니다.');
    }
  };

  const handleLogout = () => {
    logoutTeacher();
    onAuthChanged();
    setView('login');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-stone-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                {view === 'change_password' ? '마스터 비밀번호 변경' : '교사 관리자 모드'}
              </h3>
              <p className="text-[11px] text-stone-500">중화고 생태지도 교사 관리</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 space-y-4 text-xs">
          {/* VIEW 1: Teacher Logged In (Status View) */}
          {view === 'status' && (
            <div className="space-y-3.5 py-1 text-center">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto shadow-xs">
                <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
                  교사 관리자 모드 활성 중
                </span>
                <p className="text-stone-500 text-[11px] mt-2 leading-relaxed">
                  학생들이 올린 모든 관찰 기록에 대한 관리 및 삭제 권한을 보유하고 있습니다.
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => setView('change_password')}
                  className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  <span>교사 마스터 비밀번호 변경</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  교사 모드 종료 (학생 모드로 전환)
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: Teacher Login View */}
          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <p className="text-stone-600 leading-relaxed text-[11px]">
                학생의 기록은 본인 기기 또는 교사만 삭제할 수 있습니다. 교사로 인증하시면 전체 게시물에 대한 삭제 및 관리 권한이 부여됩니다.
              </p>

              {loginError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-semibold flex items-center gap-1.5 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  교사 마스터 비밀번호
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="비밀번호 입력 (기본: 1234)"
                    className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500/30 focus:outline-none"
                    autoFocus
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px]">
                  <span className="text-stone-400">초기 기본: <code className="font-mono text-stone-600 font-bold">1234</code></span>
                  <button
                    type="button"
                    onClick={() => setView('change_password')}
                    className="text-emerald-700 hover:text-emerald-800 font-semibold hover:underline cursor-pointer"
                  >
                    비밀번호 변경하기
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  교사 인증하기
                </button>
              </div>
            </form>
          )}

          {/* VIEW 3: Change Password View */}
          {view === 'change_password' && (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                <button
                  type="button"
                  onClick={() => setView(isTeacher ? 'status' : 'login')}
                  className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-800 font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>뒤로 가기</span>
                </button>
                <span className="text-[10px] text-stone-400">교사 비밀번호 재설정</span>
              </div>

              {changeSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <span>{changeSuccess}</span>
                </div>
              )}

              {changeError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-semibold flex items-center gap-1.5 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{changeError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  현재 마스터 비밀번호 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="현재 비밀번호 (기본: 1234)"
                  className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  새 마스터 비밀번호 (4자리 이상) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="새로 사용할 비밀번호"
                  className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  새 마스터 비밀번호 확인 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="새 비밀번호 다시 입력"
                  className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setView(isTeacher ? 'status' : 'login')}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  비밀번호 변경 저장
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
