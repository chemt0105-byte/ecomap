import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Coordinates, Observation } from '../types/observation';
import {
  CATEGORIES,
  SCHOOL_ZONES,
  CAMPUS_SATELLITE_IMAGE,
  JUNGHWA_HIGH_SCHOOL,
  DEFAULT_CLASSES,
  latLngToXY,
  xyToLatLng,
} from '../config/mapConfig';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
  MapPin,
  Layers,
  Sparkles,
  Maximize2,
  HelpCircle,
  Eye,
} from 'lucide-react';

interface EcologyMapProps {
  observations: Observation[];
  selectedObservation: Observation | null;
  onSelectObservation: (obs: Observation | null) => void;
  onMapClickCoordinates: (coords: Coordinates) => void;
  targetCoords?: Coordinates | null;
}

export const EcologyMap: React.FC<EcologyMapProps> = ({
  observations,
  selectedObservation,
  onSelectObservation,
  onMapClickCoordinates,
  targetCoords,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Zoom & Pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);

  // Temporary pin placed by user click
  const [temporaryPin, setTemporaryPin] = useState<{ x: number; y: number } | null>(null);

  // Legend visibility
  const [showLegend, setShowLegend] = useState(false);
  const [showZoneMenu, setShowZoneMenu] = useState(false);

  // Focus on selected observation or targetCoords
  useEffect(() => {
    const focusTarget = selectedObservation?.coordinates || targetCoords;
    if (focusTarget) {
      let targetX = focusTarget.x;
      let targetY = focusTarget.y;

      if (targetX === undefined || targetY === undefined) {
        const converted = latLngToXY(focusTarget.lat, focusTarget.lng);
        targetX = converted.x;
        targetY = converted.y;
      }

      // Smooth zoom in to target
      setScale(2);
      // Pan to center the point (percentage converted to container offset)
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const offsetX = (50 - targetX) * (clientWidth / 100) * 1.5;
        const offsetY = (50 - targetY) * (clientHeight / 100) * 1.5;
        setPosition({ x: offsetX, y: offsetY });
      }
    }
  }, [selectedObservation, targetCoords]);

  // Zoom controls
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.4, 3.2));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.4, 0.9));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setTemporaryPin(null);
  };

  // Fly to specific school zone
  const handleFlyToZone = (coords: Coordinates) => {
    let targetX = coords.x;
    let targetY = coords.y;
    if (targetX === undefined || targetY === undefined) {
      const converted = latLngToXY(coords.lat, coords.lng);
      targetX = converted.x;
      targetY = converted.y;
    }

    setScale(2.2);
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      const offsetX = (50 - targetX) * (clientWidth / 100) * 1.8;
      const offsetY = (50 - targetY) * (clientHeight / 100) * 1.8;
      setPosition({ x: offsetX, y: offsetY });
    }
    setShowZoneMenu(false);
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with left click
    if (e.button !== 0) return;
    setIsDragging(true);
    setHasMoved(false);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setHasMoved(true);
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile pan & pinch
  const touchStartRef = useRef<{ x: number; y: number; dist?: number }>({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setHasMoved(false);
      touchStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    } else if (e.touches.length === 2) {
      // Pinch to zoom start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current.dist = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setHasMoved(true);
      setPosition({
        x: e.touches[0].clientX - touchStartRef.current.x,
        y: e.touches[0].clientY - touchStartRef.current.y,
      });
    } else if (e.touches.length === 2 && touchStartRef.current.dist) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartRef.current.dist;
      setScale(prev => Math.min(Math.max(prev * factor, 0.9), 3.2));
      touchStartRef.current.dist = dist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setScale(prev => Math.min(Math.max(prev + delta, 0.9), 3.2));
  };

  // Map Click handler (add pin at clicked position)
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hasMoved) {
      // It was a drag gesture, not a click
      return;
    }

    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = Math.max(1, Math.min(99, Number(((clickX / rect.width) * 100).toFixed(2))));
    const yPercent = Math.max(1, Math.min(99, Number(((clickY / rect.height) * 100).toFixed(2))));

    const geoCoords = xyToLatLng(xPercent, yPercent);
    const finalCoords: Coordinates = {
      lat: geoCoords.lat,
      lng: geoCoords.lng,
      x: xPercent,
      y: yPercent,
    };

    setTemporaryPin({ x: xPercent, y: yPercent });
    onMapClickCoordinates(finalCoords);
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className="relative w-full h-full min-h-[400px] md:min-h-[520px] rounded-2xl md:rounded-3xl overflow-hidden bg-stone-950 border border-stone-800 shadow-xl select-none"
    >
      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2 pointer-events-auto">
        <div className="bg-stone-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-white flex items-center gap-2 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold">중화고 교정 항공 위성지도</span>
        </div>

        {/* Zone Dropdown Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowZoneMenu(!showZoneMenu)}
            className="bg-stone-900/90 hover:bg-stone-800 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-stone-200 text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>주요 탐사 구역</span>
          </button>

          {showZoneMenu && (
            <div className="absolute left-0 top-full mt-1.5 w-56 bg-stone-900/95 backdrop-blur-md border border-white/15 rounded-2xl p-2 shadow-2xl z-40 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="text-[11px] font-bold text-stone-400 px-2 py-1 mb-1">
                구역으로 즉시 이동:
              </div>
              <div className="space-y-0.5">
                {SCHOOL_ZONES.map(zone => (
                  <button
                    key={zone.id}
                    onClick={() => handleFlyToZone(zone.coordinates)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-stone-200 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between"
                  >
                    <span className="font-medium truncate">{zone.name}</span>
                    <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Right Zoom Controls & Reset */}
      <div className="absolute top-3 right-3 z-30 flex flex-col items-center gap-1.5 pointer-events-auto">
        <div className="bg-stone-900/90 backdrop-blur-md rounded-xl border border-white/15 shadow-xl flex flex-col p-1 text-white">
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="확대 (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-full h-px bg-white/10 my-0.5" />
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="축소 (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleReset}
          className="bg-stone-900/90 hover:bg-stone-800 backdrop-blur-md p-2 rounded-xl border border-white/15 text-stone-300 hover:text-white shadow-xl transition-colors cursor-pointer"
          title="중심 및 비율 초기화"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowLegend(!showLegend)}
          className={`p-2 rounded-xl border backdrop-blur-md transition-colors cursor-pointer ${
            showLegend
              ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
              : 'bg-stone-900/90 text-stone-300 hover:text-white border-white/15 shadow-xl'
          }`}
          title="생물 핀 범례 보기"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* Category Legend Overlay */}
      {showLegend && (
        <div className="absolute top-16 right-3 z-30 bg-stone-900/95 backdrop-blur-md border border-white/15 rounded-2xl p-3 text-xs shadow-2xl text-white max-w-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>생물 분류별 핀 색상</span>
            </span>
            <button
              onClick={() => setShowLegend(false)}
              className="text-stone-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {Object.values(CATEGORIES).map(cat => (
              <div key={cat.id} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: cat.pinBg }}
                />
                <span className="text-stone-300 truncate">{cat.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Map Viewport */}
      <div
        className={`w-full h-full flex items-center justify-center ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.2, 0, 0, 1)',
            transformOrigin: 'center center',
          }}
          className="relative inline-block max-w-none will-change-transform"
        >
          {/* Base Satellite Image of Junghwa High School */}
          <div
            onClick={handleImageClick}
            className="relative cursor-crosshair rounded-xl overflow-hidden shadow-2xl border border-stone-800"
          >
            <img
              ref={imageRef}
              src={CAMPUS_SATELLITE_IMAGE}
              alt="중화고등학교 위성 항공 사진"
              draggable={false}
              className="w-auto h-[500px] sm:h-[620px] md:h-[720px] max-w-none object-contain pointer-events-none select-none block"
            />

            {/* Permanent Landmarks on Campus */}
            {/* Main Building Name Tag */}
            <div
              style={{ left: '55%', top: '48%' }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none"
            >
              <div className="px-2 py-0.5 rounded-md bg-stone-900/90 text-emerald-400 text-[10px] font-extrabold shadow-md border border-emerald-500/40 whitespace-nowrap flex items-center gap-1">
                <span>🏫 중화고 본관</span>
              </div>
            </div>

            {/* Sports Field Tag */}
            <div
              style={{ left: '37%', top: '68%' }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none opacity-85"
            >
              <span className="px-1.5 py-0.5 rounded bg-stone-900/80 text-white text-[9px] font-bold shadow-xs whitespace-nowrap">
                ⚽ 운동장
              </span>
            </div>

            {/* Gymnasium Tag */}
            <div
              style={{ left: '54%', top: '16%' }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none opacity-85"
            >
              <span className="px-1.5 py-0.5 rounded bg-stone-900/80 text-rose-300 text-[9px] font-bold shadow-xs whitespace-nowrap">
                체육관
              </span>
            </div>

            {/* Observation Markers Overlaid on the Satellite Image */}
            {observations.map(obs => {
              const isSelected = selectedObservation?.id === obs.id;
              const category = CATEGORIES[obs.category] || CATEGORIES.other;
              const classItem = DEFAULT_CLASSES.find(c => c.id === obs.classId);
              const classShort = classItem ? classItem.shortLabel : obs.classId;

              // Compute x, y coordinates percentage
              let pinX = obs.coordinates.x;
              let pinY = obs.coordinates.y;

              if (pinX === undefined || pinY === undefined) {
                const converted = latLngToXY(obs.coordinates.lat, obs.coordinates.lng);
                pinX = converted.x;
                pinY = converted.y;
              }

              return (
                <div
                  key={obs.id}
                  onClick={e => {
                    e.stopPropagation();
                    onSelectObservation(obs);
                  }}
                  style={{
                    left: `${pinX}%`,
                    top: `${pinY}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-full cursor-pointer transition-all duration-200 group ${
                    isSelected ? 'z-40 scale-125' : 'z-20 hover:scale-115'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    {/* Tooltip Badge */}
                    <div
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-lg whitespace-nowrap mb-1 flex items-center gap-1.5 border transition-all ${
                        isSelected
                          ? 'bg-stone-950 text-white border-emerald-400 ring-2 ring-emerald-400/60'
                          : 'bg-stone-900/90 text-stone-100 border-white/20 group-hover:bg-stone-900'
                      }`}
                    >
                      <span>{obs.speciesName}</span>
                      <span className="text-emerald-400 font-extrabold text-[9px] bg-emerald-950/80 px-1 rounded">
                        {classShort}
                      </span>
                    </div>

                    {/* Pin Marker Pinhead & Needle */}
                    <div className="relative">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-white shadow-xl transition-all border-2 ${
                          isSelected
                            ? 'border-white ring-4 ring-emerald-400/80 animate-pulse'
                            : 'border-white group-hover:ring-2 group-hover:ring-white/80'
                        }`}
                        style={{ backgroundColor: category.pinBg }}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
                      </div>
                      {/* Pin bottom spike */}
                      <div
                        className="w-1.5 h-2 mx-auto -mt-0.5 rounded-b-full shadow-sm"
                        style={{ backgroundColor: category.pinBg }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Temporary Pin placed on click */}
            {temporaryPin && (
              <div
                style={{
                  left: `${temporaryPin.x}%`,
                  top: `${temporaryPin.y}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-full z-50 pointer-events-none animate-bounce"
              >
                <div className="flex flex-col items-center">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-600 text-white shadow-lg mb-1 whitespace-nowrap border border-white">
                    새 관찰 핀 등록 위치
                  </span>
                  <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <div className="w-1.5 h-2 bg-emerald-500 mx-auto -mt-0.5 rounded-b-full" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Hint Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-30 pointer-events-none flex items-center justify-between">
        <div className="bg-stone-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 text-white text-[11px] font-medium shadow-xl flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>지도의 원하는 곳을 클릭하면 해당 위치에 새로운 생태 관찰 핀이 등록됩니다.</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-stone-900/85 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/15 text-stone-300 text-[11px]">
          <span>마우스 드래그: 이동</span>
          <span>•</span>
          <span>스크롤/버튼: 확대/축소</span>
        </div>
      </div>
    </div>
  );
};
