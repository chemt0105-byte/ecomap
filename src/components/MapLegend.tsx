import React from 'react';
import { CATEGORIES, SCHOOL_ZONES, JUNGHWA_HIGH_SCHOOL } from '../config/mapConfig';
import { CategoryType, Coordinates } from '../types/observation';
import { Compass, MapPin, Eye } from 'lucide-react';

interface MapLegendProps {
  onFlyToZone: (coords: Coordinates, zoom?: number) => void;
  isSatellite: boolean;
  onToggleMapType: () => void;
}

export const MapLegend: React.FC<MapLegendProps> = ({
  onFlyToZone,
  isSatellite,
  onToggleMapType,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2 pointer-events-auto">
      {/* Map Style Toggle Button */}
      <div className="flex items-center gap-1.5 bg-stone-900/85 backdrop-blur-md p-1 rounded-xl shadow-lg border border-white/20 text-white">
        <button
          onClick={onToggleMapType}
          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
            isSatellite
              ? 'bg-emerald-500 text-stone-950 shadow-xs'
              : 'text-stone-300 hover:text-white'
          }`}
        >
          위성 지도
        </button>
        <button
          onClick={onToggleMapType}
          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
            !isSatellite
              ? 'bg-emerald-500 text-stone-950 shadow-xs'
              : 'text-stone-300 hover:text-white'
          }`}
        >
          일반 지도
        </button>
      </div>

      {/* School Center Reset & Zones Dropdown/Card */}
      <div className="bg-stone-900/85 backdrop-blur-md text-white rounded-xl shadow-lg border border-white/20 p-2.5 max-w-xs text-xs">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-1.5 font-bold text-emerald-400">
            <Compass className="w-3.5 h-3.5" />
            <span>중화고 교정 탐색</span>
          </div>
          <button
            onClick={() => onFlyToZone(JUNGHWA_HIGH_SCHOOL.coordinates, JUNGHWA_HIGH_SCHOOL.defaultZoom)}
            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[11px] font-semibold transition-colors"
          >
            학교 중심으로
          </button>
        </div>

        {/* Zones quick buttons */}
        <div className="flex flex-wrap gap-1 mb-2">
          {SCHOOL_ZONES.slice(0, 4).map(zone => (
            <button
              key={zone.id}
              onClick={() => onFlyToZone(zone.coordinates, 19)}
              className="px-2 py-0.5 bg-white/10 hover:bg-white/20 text-stone-200 rounded text-[11px] transition-colors"
              title={zone.description}
            >
              {zone.name}
            </button>
          ))}
        </div>

        {/* Categories Legend */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-stone-400 hover:text-white text-[11px] flex items-center justify-between w-full border-t border-white/10 pt-1.5"
        >
          <span>생물 핀 범례</span>
          <span>{isExpanded ? '접기 ▲' : '펼치기 ▼'}</span>
        </button>

        {isExpanded && (
          <div className="grid grid-cols-2 gap-1.5 mt-2 pt-1 border-t border-white/10 text-[11px]">
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
        )}
      </div>
    </div>
  );
};
