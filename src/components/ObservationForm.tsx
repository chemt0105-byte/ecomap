import React, { useState, useRef } from 'react';
import { CategoryType, Coordinates, Observation } from '../types/observation';
import { CATEGORIES, DEFAULT_CLASSES, JUNGHWA_HIGH_SCHOOL } from '../config/mapConfig';
import { compressAndEncodeImage } from '../services/imageService';
import { getDeviceId } from '../services/authService';
import { X, Camera, Image as ImageIcon, AlertCircle, Lock, Upload } from 'lucide-react';

interface ObservationFormProps {
  initialCoordinates?: Coordinates | null;
  defaultClassId: string;
  onClose: () => void;
  onSubmit: (data: Omit<Observation, 'id' | 'createdAt'>) => Promise<void>;
}

export const ObservationForm: React.FC<ObservationFormProps> = ({
  initialCoordinates,
  defaultClassId,
  onClose,
  onSubmit,
}) => {
  // 1. 사진 (Photo, optional)
  const [imagePreview, setImagePreview] = useState<string>('');
  // 2. 분류 (Category)
  const [category, setCategory] = useState<CategoryType>('plant');
  // 3. 생물 이름 (Species Name)
  const [speciesName, setSpeciesName] = useState('');
  // 4. 관찰 학급 (Class)
  const [classId, setClassId] = useState(
    defaultClassId !== 'all' ? defaultClassId : '1-1'
  );
  // 5. 관찰자 (Observer)
  const [observerName, setObserverName] = useState('');
  // 6. 특징 (Characteristics / Notes)
  const [notes, setNotes] = useState('');
  // 삭제 간편 비밀번호 (기본값: 1234)
  const [deletePassword, setDeletePassword] = useState('1234');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Two separate inputs: one for direct camera, one for gallery/file picker
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Use clicked coordinates or default school center
  const coordinates: Coordinates = initialCoordinates || JUNGHWA_HIGH_SCHOOL.coordinates;

  // 사진 파일 처리 및 자동 압축
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await compressAndEncodeImage(file, 1200, 1200, 0.85);
      setImagePreview(compressedDataUrl);
      setErrorMessage('');
    } catch (err: any) {
      setErrorMessage(err.message || '사진 업로드 중 문제가 발생했습니다.');
    } finally {
      // Reset input value so same file can be re-selected if needed
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Note: imagePreview is now OPTIONAL! Users can submit observations with or without a photo.
    if (!speciesName.trim()) {
      setErrorMessage('생물 이름을 입력해 주세요.');
      return;
    }
    if (!observerName.trim()) {
      setErrorMessage('관찰자(학생 이름)를 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    // 자동 생성되는 날짜 및 기본 계절
    const now = new Date();
    const observedAt = now.toISOString().slice(0, 16).replace('T', ' ');
    const month = now.getMonth() + 1;
    const season: '봄' | '여름' | '가을' | '겨울' =
      month >= 3 && month <= 5
        ? '봄'
        : month >= 6 && month <= 8
        ? '여름'
        : month >= 9 && month <= 11
        ? '가을'
        : '겨울';

    const locationDescription = '중화고 교정 관찰 위치';

    try {
      await onSubmit({
        speciesName: speciesName.trim(),
        category,
        classId,
        observerName: observerName.trim(),
        imageUrl: imagePreview || '', // Optional
        notes: notes.trim(),
        observedAt,
        coordinates,
        locationDescription,
        season,
        authorId: getDeviceId(),
        deletePassword: deletePassword.trim() || '1234',
        likes: 0,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || '저장 중 오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-stone-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between shrink-0 bg-stone-50">
          <div>
            <h2 className="text-lg font-black text-stone-900 tracking-tight flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-600" />
              <span>새 관찰 기록 등록</span>
            </h2>
            <p className="text-xs text-stone-500 font-medium mt-0.5">
              발견한 생물의 정보를 입력해 주세요. (사진은 선택 사항입니다)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. 사진 (Photo, optional with Camera vs Gallery selection) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <span>관찰 사진</span>
                <span className="text-[11px] font-normal text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                  선택 사항
                </span>
              </label>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => setImagePreview('')}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  사진 삭제 (사진 없이 등록)
                </button>
              )}
            </div>

            {imagePreview ? (
              /* Image preview */
              <div className="relative rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 h-52 flex items-center justify-center group">
                <img
                  src={imagePreview}
                  alt="미리보기"
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => setImagePreview('')}
                  className="absolute top-2 right-2 p-1.5 bg-stone-900/70 hover:bg-stone-900 text-white rounded-lg transition-colors cursor-pointer"
                  title="사진 삭제"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Change photo options overlay */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-2.5 py-1.5 bg-stone-900/80 backdrop-blur-xs text-white rounded-xl text-xs font-semibold hover:bg-stone-900 transition-colors flex items-center gap-1 cursor-pointer"
                    title="카메라로 다시 촬영"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>촬영</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="px-2.5 py-1.5 bg-stone-900/80 backdrop-blur-xs text-white rounded-xl text-xs font-semibold hover:bg-stone-900 transition-colors flex items-center gap-1 cursor-pointer"
                    title="앨범/갤러리에서 다시 선택"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>갤러리</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Two distinct buttons: Direct Camera VS Gallery/File app */
              <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50/70 space-y-2.5">
                <p className="text-xs text-stone-600 text-center font-medium">
                  사진 등록 방식을 선택해 주세요 (사진 없이도 등록 가능)
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Option 1: Direct Camera */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-3.5 bg-white hover:bg-emerald-50/50 border border-stone-200 hover:border-emerald-400 rounded-xl transition-all group cursor-pointer shadow-xs active:scale-98"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-stone-800 group-hover:text-emerald-900">
                      직접 촬영하기
                    </span>
                    <span className="text-[10px] text-stone-400 mt-0.5">
                      카메라 앱 바로 실행
                    </span>
                  </button>

                  {/* Option 2: Gallery / Files */}
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-3.5 bg-white hover:bg-sky-50/50 border border-stone-200 hover:border-sky-400 rounded-xl transition-all group cursor-pointer shadow-xs active:scale-98"
                  >
                    <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-1.5 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-stone-800 group-hover:text-sky-900">
                      앨범에서 선택
                    </span>
                    <span className="text-[10px] text-stone-400 mt-0.5">
                      갤러리 / 저장된 사진
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Hidden Input 1: Direct Camera (capture="environment") */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Hidden Input 2: Gallery / Album (NO capture attribute) */}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* 2. 분류 (Category) */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              생물 분류 <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {Object.values(CATEGORIES).map(cat => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`py-2 px-1 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/30'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cat.pinBg }}
                    />
                    <span className="text-xs font-medium leading-tight">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. 생물 이름 (Species Name) */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              생물 이름 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={speciesName}
              onChange={e => setSpeciesName(e.target.value)}
              placeholder="예: 산수유, 까치, 호랑나비, 민들레"
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              required
            />
          </div>

          {/* 4. 관찰 학급 & 5. 관찰자 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                관찰 학급 <span className="text-rose-500">*</span>
              </label>
              <select
                value={classId}
                onChange={e => setClassId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 cursor-pointer"
              >
                {DEFAULT_CLASSES.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                관찰자 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={observerName}
                onChange={e => setObserverName(e.target.value)}
                placeholder="예: 김하늘 (또는 모둠명)"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* 6. 특징 (Notes) */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              특징 (생태적 특징 및 관찰 내용)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="발견한 장소의 환경이나 꽃의 색깔, 잎의 모양, 생물의 행동 등 관찰한 특징을 적어주세요."
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>

          {/* 간편 삭제 비밀번호 안내 (다른 기기에서 삭제 방지용) */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-stone-600">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-stone-800">삭제 비밀번호:</span>
                <span className="text-[11px] text-stone-500 block">다른 학생이 삭제하지 못하도록 보호합니다.</span>
              </div>
            </div>
            <input
              type="text"
              maxLength={6}
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              className="w-20 px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-center font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
              placeholder="1234"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-stone-100 flex items-center justify-end gap-2.5 shrink-0 bg-stone-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <span>저장 중...</span>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>등록하기</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
