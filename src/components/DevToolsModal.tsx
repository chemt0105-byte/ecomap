import React, { useRef, useState } from 'react';
import { SAMPLE_OBSERVATIONS } from '../data/sampleObservations';
import {
  seedDevObservations,
  clearAllObservations,
  getObservations,
} from '../services/observationService';
import { saveLocalObservations, getLocalObservations } from '../services/dbStorage';
import {
  Database,
  X,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  CheckCircle,
  FileUp,
} from 'lucide-react';
import { Observation } from '../types/observation';

interface DevToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
  currentCount: number;
}

export const DevToolsModal: React.FC<DevToolsModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
  currentCount,
}) => {
  const [statusMessage, setStatusMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 예시 데이터 주입
  const handleSeed = async () => {
    setIsProcessing(true);
    setStatusMessage('중화고 예시 생태 관찰 데이터를 데이터베이스에 등록하는 중...');
    await seedDevObservations(SAMPLE_OBSERVATIONS);
    setStatusMessage('총 6개의 교정 관찰 예시 데이터가 등록되었습니다.');
    setIsProcessing(false);
    onDataChanged();
  };

  // 전체 데이터 초기화
  const handleClear = async () => {
    if (!window.confirm('등록된 모든 관찰 기록을 삭제하시겠습니까?')) {
      return;
    }
    setIsProcessing(true);
    await clearAllObservations();
    setStatusMessage('모든 관찰 기록이 초기화되었습니다.');
    setIsProcessing(false);
    onDataChanged();
  };

  // JSON 파일로 내보내기 (백업)
  const handleExport = async () => {
    try {
      const data = await getObservations();
      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(JSON.stringify(data || [], null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `중화고_생태지도_관찰데이터_${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setStatusMessage(`${data.length}개의 관찰 기록이 JSON 파일로 다운로드되었습니다.`);
    } catch {
      setStatusMessage('데이터 내보내기 실패');
    }
  };

  // JSON 파일 불러와서 병합하기 (가져오기)
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const text = await file.text();
      const imported: Observation[] = JSON.parse(text);

      if (!Array.isArray(imported)) {
        throw new Error('유효한 관찰 데이터 배열 형식이 아닙니다.');
      }

      const current = await getLocalObservations();
      const map = new Map<string, Observation>(current.map(item => [item.id, item]));

      let added = 0;
      for (const item of imported) {
        if (item && item.id && item.speciesName) {
          if (!map.has(item.id)) {
            map.set(item.id, item);
            added++;
          }
        }
      }

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      await saveLocalObservations(merged);

      // Try uploading to server too
      try {
        await fetch('/api/observations/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: merged }),
        });
      } catch {
        // ignore
      }

      setStatusMessage(`성공! 새 관찰 기록 ${added}개가 추가 병합되었습니다. (총 ${merged.length}개)`);
      onDataChanged();
    } catch (err: any) {
      setStatusMessage(`파일 불러오기 실패: ${err.message || 'JSON 형식을 확인해주세요.'}`);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                데이터 관리 및 백업/복원
              </h3>
              <p className="text-[11px] text-stone-500">
                학생 관찰 데이터 백업, 복원 및 예시 데이터 관리
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
            <span className="font-semibold text-stone-700">현재 등록된 관찰 기록:</span>
            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {currentCount}개 관찰 기록
            </span>
          </div>

          {statusMessage && (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl font-medium border border-emerald-200 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Backup / Restore section */}
          <div className="space-y-2 p-3 bg-stone-50/80 rounded-2xl border border-stone-200/80">
            <p className="font-bold text-stone-800 text-xs">데이터 백업 및 복원 (가져오기/내보내기)</p>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              학생들이 올린 데이터를 JSON 파일로 다운로드하여 백업하거나, 다른 기기에서 수집한 관찰 데이터를 한 번에 가져와 지도에 합칠 수 있습니다.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleExport}
                className="flex-1 py-2 bg-white hover:bg-stone-100 text-stone-700 font-semibold rounded-xl border border-stone-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>데이터 백업 (내보내기)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-xl border border-emerald-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <FileUp className="w-3.5 h-3.5 text-emerald-700" />
                <span>데이터 가져오기 (복원)</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>

          {/* Seed section */}
          <div className="space-y-2">
            <p className="font-bold text-stone-700">시연용 예시 데이터 주입</p>
            <p className="text-stone-500 text-[11px] leading-relaxed">
              중화고 본관 화단(산수유), 뒤편 수목원(박새, 치마버섯), 봉화산 진입로(청딱따구리),
              생태 텃밭(호랑나비) 등의 검증된 예시 데이터를 채워넣습니다.
            </p>
            <button
              onClick={handleSeed}
              disabled={isProcessing}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>중화고 생태 예시 데이터 주입 ({SAMPLE_OBSERVATIONS.length}개)</span>
            </button>
          </div>

          <div className="pt-2 border-t border-stone-100 flex items-center justify-end">
            <button
              onClick={handleClear}
              disabled={isProcessing}
              className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>전체 데이터 초기화</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-100 bg-stone-50 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
