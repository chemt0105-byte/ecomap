import React, { useState, useEffect } from 'react';
import { ChangelogItem } from '../types/changelog';
import { getChangelog, saveChangelog } from '../services/changelogService';
import { isTeacherMode } from '../services/authService';
import {
  History,
  X,
  Plus,
  Edit2,
  Save,
  CheckCircle2,
  Calendar,
  Sparkles,
  GitCommit,
  Trash2,
} from 'lucide-react';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [changelogList, setChangelogList] = useState<ChangelogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<ChangelogItem[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isTeacher = isTeacherMode();

  const loadData = async () => {
    setIsLoading(true);
    const data = await getChangelog();
    setChangelogList(data);
    setEditItems(JSON.parse(JSON.stringify(data)));
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setIsEditing(false);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle saving edits (Teacher Mode)
  const handleSaveEdits = async () => {
    const success = await saveChangelog(editItems);
    if (success) {
      setChangelogList(editItems);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  // Add new changelog item
  const handleAddNewVersion = () => {
    const today = new Date().toISOString().slice(0, 10);
    const newItem: ChangelogItem = {
      id: 'v_' + Date.now(),
      version: 'v1.4.0',
      date: today,
      title: '새로운 업데이트',
      changes: ['새로운 기능 추가 및 개선'],
    };
    setEditItems([newItem, ...editItems]);
  };

  // Delete version item
  const handleDeleteItem = (id: string) => {
    setEditItems(editItems.filter(item => item.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-stone-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between shrink-0 bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
              <History className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-stone-900 tracking-tight">
                  버전별 업데이트 내역
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  {changelogList[0]?.version || 'v1.3.0'}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium">
                중화고등학교 생태지도 웹앱의 개선 및 기능 추가 이력
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Teacher Edit Controls */}
            {isTeacher && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors cursor-pointer border border-purple-200"
                title="관리자 모드에서 내역 편집"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>내역 편집</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>업데이트 내역이 성공적으로 저장되었습니다.</span>
            </div>
          )}

          {isEditing ? (
            /* Teacher Edit Mode */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <span className="font-bold text-purple-900 text-xs flex items-center gap-1">
                  <span>관리자 업데이트 내역 편집</span>
                </span>
                <button
                  type="button"
                  onClick={handleAddNewVersion}
                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>새 버전 추가</span>
                </button>
              </div>

              {editItems.map((item, idx) => (
                <div key={item.id} className="p-3.5 bg-stone-50 rounded-2xl border border-stone-300 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={item.version}
                        onChange={e => {
                          const updated = [...editItems];
                          updated[idx].version = e.target.value;
                          setEditItems(updated);
                        }}
                        className="w-20 px-2 py-1 bg-white border border-stone-300 rounded font-bold font-mono text-xs"
                        placeholder="v1.x.x"
                      />
                      <input
                        type="text"
                        value={item.date}
                        onChange={e => {
                          const updated = [...editItems];
                          updated[idx].date = e.target.value;
                          setEditItems(updated);
                        }}
                        className="w-28 px-2 py-1 bg-white border border-stone-300 rounded text-xs"
                        placeholder="YYYY-MM-DD"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={item.title}
                    onChange={e => {
                      const updated = [...editItems];
                      updated[idx].title = e.target.value;
                      setEditItems(updated);
                    }}
                    className="w-full px-2 py-1 bg-white border border-stone-300 rounded font-semibold text-xs"
                    placeholder="업데이트 요약 제목"
                  />

                  <div>
                    <label className="text-[11px] font-semibold text-stone-500 block mb-0.5">
                      업데이트 상세 항목 (줄바꿈으로 구분):
                    </label>
                    <textarea
                      rows={3}
                      value={item.changes.join('\n')}
                      onChange={e => {
                        const updated = [...editItems];
                        updated[idx].changes = e.target.value.split('\n').filter(Boolean);
                        setEditItems(updated);
                      }}
                      className="w-full px-2 py-1 bg-white border border-stone-300 rounded text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Normal View Mode: Timeline */
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
              {changelogList.map((item, idx) => (
                <div key={item.id} className="relative group">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                      idx === 0 ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-stone-400'
                    }`}
                  />

                  <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-2 group-hover:border-emerald-300 transition-colors">
                    {/* Version & Date */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-stone-900 font-mono">
                          {item.version}
                        </span>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                            최신 버전
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-stone-500">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        <span>{item.date}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="font-bold text-stone-800 text-xs">
                      {item.title}
                    </h4>

                    {/* Changes List */}
                    <ul className="space-y-1 pt-1 border-t border-stone-200/60">
                      {item.changes.map((change, cIdx) => (
                        <li key={cIdx} className="flex items-start gap-1.5 text-stone-600 leading-relaxed text-[11px]">
                          <span className="text-emerald-500 font-bold shrink-0">•</span>
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-stone-100 flex items-center justify-between bg-stone-50 shrink-0">
          {isEditing ? (
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => {
                  setEditItems(JSON.parse(JSON.stringify(changelogList)));
                  setIsEditing(false);
                }}
                className="px-3.5 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl font-semibold text-xs cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveEdits}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>변경사항 저장하기</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] text-stone-400">
                중화고등학교 생태지도 v1.3.0
              </span>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                닫기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
