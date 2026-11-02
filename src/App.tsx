import React from 'react';
import { Observation, ObservationFilter, Coordinates } from './types/observation';
import { DEFAULT_CLASSES, JUNGHWA_HIGH_SCHOOL } from './config/mapConfig';
import {
  getObservations,
  addObservation,
  deleteObservation,
  subscribeToObservationsSync,
} from './services/observationService';

import { Header } from './components/Header';
import { ClassTabs } from './components/ClassTabs';
import { FilterBar } from './components/FilterBar';
import { EcologyMap } from './components/EcologyMap';
import { ObservationList } from './components/ObservationList';
import { ObservationDetail } from './components/ObservationDetail';
import { ObservationForm } from './components/ObservationForm';
import { DevToolsModal } from './components/DevToolsModal';
import { TeacherAuthModal } from './components/TeacherAuthModal';
import { StudentGuideModal } from './components/StudentGuideModal';
import { ChangelogModal } from './components/ChangelogModal';
import { Map, ListFilter, Plus, CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function App() {
  const [observations, setObservations] = React.useState<Observation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [toast, setToast] = React.useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Filter & Search State
  const [filter, setFilter] = React.useState<ObservationFilter>({
    selectedClassId: 'all',
    selectedCategory: 'all',
    searchQuery: '',
    sortBy: 'latest',
  });

  // Selected observation for highlight & detail modal
  const [selectedObservation, setSelectedObservation] = React.useState<Observation | null>(null);
  const [detailModalObservation, setDetailModalObservation] = React.useState<Observation | null>(null);
  const [targetFocusCoords, setTargetFocusCoords] = React.useState<Coordinates | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [clickedMapCoords, setClickedMapCoords] = React.useState<Coordinates | null>(null);
  const [isDevModalOpen, setIsDevModalOpen] = React.useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = React.useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = React.useState(false);
  const [isChangelogModalOpen, setIsChangelogModalOpen] = React.useState(false);

  // Mobile View Toggle: 'map' or 'list'
  const [mobileTab, setMobileTab] = React.useState<'map' | 'list'>('map');

  // Load observations from database
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getObservations();
      setObservations(data);
    } catch (e) {
      console.error('Failed to load observations', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
    // Subscribe to multi-tab / broadcast updates
    const unsubscribe = subscribeToObservationsSync(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [loadData]);

  // Filtered & Sorted Observations
  const filteredObservations = React.useMemo(() => {
    return observations
      .filter(obs => {
        if (!obs || !obs.id) return false;
        // Class Filter
        if (filter.selectedClassId !== 'all' && obs.classId !== filter.selectedClassId) {
          return false;
        }
        // Category Filter
        if (filter.selectedCategory !== 'all' && obs.category !== filter.selectedCategory) {
          return false;
        }
        // Search Query
        if (filter.searchQuery.trim()) {
          const q = filter.searchQuery.toLowerCase();
          const matchSpecies = (obs.speciesName || '').toLowerCase().includes(q);
          const matchSci = (obs.scientificName || '').toLowerCase().includes(q);
          const matchObserver = (obs.observerName || '').toLowerCase().includes(q);
          const matchLocation = (obs.locationDescription || '').toLowerCase().includes(q);
          const matchNotes = (obs.notes || '').toLowerCase().includes(q);
          if (!matchSpecies && !matchSci && !matchObserver && !matchLocation && !matchNotes) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (filter.sortBy === 'latest') {
          const tA = new Date(a.createdAt || a.observedAt || 0).getTime();
          const tB = new Date(b.createdAt || b.observedAt || 0).getTime();
          return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
        }
        if (filter.sortBy === 'oldest') {
          const tA = new Date(a.createdAt || a.observedAt || 0).getTime();
          const tB = new Date(b.createdAt || b.observedAt || 0).getTime();
          return (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
        }
        if (filter.sortBy === 'name') {
          return (a.speciesName || '').localeCompare(b.speciesName || '', 'ko-KR');
        }
        return 0;
      });
  }, [observations, filter]);

  // Current class label
  const currentClassLabel = React.useMemo(() => {
    if (filter.selectedClassId === 'all') return '전체 학급';
    const found = DEFAULT_CLASSES.find(c => c.id === filter.selectedClassId);
    return found ? found.label : filter.selectedClassId;
  }, [filter.selectedClassId]);

  // Map Click -> Trigger Add with coords
  const handleMapClickCoords = (coords: Coordinates) => {
    setClickedMapCoords(coords);
    setIsAddModalOpen(true);
  };

  // Select observation from Card or Pin
  const handleSelectObservation = (obs: Observation | null) => {
    setSelectedObservation(obs);
    if (obs) {
      setDetailModalObservation(obs);
      setTargetFocusCoords(obs.coordinates);
    }
  };

  // Locate on map from detail modal
  const handleLocateOnMap = (obs: Observation) => {
    setSelectedObservation(obs);
    setTargetFocusCoords(obs.coordinates);
    setMobileTab('map');
  };

  // Auto-dismiss toast after 4.5 seconds
  React.useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Add new observation
  const handleAddObservation = async (data: Omit<Observation, 'id' | 'createdAt'>) => {
    try {
      const saved = await addObservation(data);
      await loadData();
      setSelectedObservation(saved);
      setTargetFocusCoords(saved.coordinates);
      setToast({
        text: `"${saved.speciesName}" 관찰 기록이 안전하게 저장되었습니다! 지도의 핀과 목록에서 확인할 수 있습니다.`,
        type: 'success',
      });
    } catch (err: any) {
      setToast({
        text: err?.message || '저장 중 오류가 발생했습니다.',
        type: 'error',
      });
    }
  };

  // Delete observation
  const handleDeleteObservation = async (id: string) => {
    try {
      await deleteObservation(id);
      if (selectedObservation?.id === id) {
        setSelectedObservation(null);
      }
      await loadData();
      setToast({
        text: '관찰 기록이 삭제되었습니다.',
        type: 'info',
      });
    } catch (err: any) {
      setToast({
        text: '삭제 중 문제가 발생했습니다.',
        type: 'error',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-100 text-stone-900 font-sans">
      {/* Top Header */}
      <Header
        totalCount={observations.length}
        filteredCount={filteredObservations.length}
        onOpenAddModal={() => {
          setClickedMapCoords(null);
          setIsAddModalOpen(true);
        }}
        onOpenDevModal={() => setIsDevModalOpen(true)}
        onOpenTeacherModal={() => setIsTeacherModalOpen(true)}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
        onOpenChangelogModal={() => setIsChangelogModalOpen(true)}
        onRefresh={loadData}
        isLoading={isLoading}
      />

      {/* Class Tabs: [전체] [1반] [2반] ... */}
      <ClassTabs
        classes={DEFAULT_CLASSES}
        selectedClassId={filter.selectedClassId}
        onSelectClass={classId => setFilter(prev => ({ ...prev, selectedClassId: classId }))}
        observations={observations}
      />

      {/* Category & Search Filter Bar */}
      <FilterBar
        filter={filter}
        onChangeFilter={updates => setFilter(prev => ({ ...prev, ...updates }))}
        filteredCount={filteredObservations.length}
      />

      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex items-center justify-around bg-white border-b border-stone-200 p-1.5 shrink-0">
        <button
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mobileTab === 'map'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-50'
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          <span>위성 항공도 보기</span>
        </button>
        <button
          onClick={() => setMobileTab('list')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mobileTab === 'list'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-50'
          }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>관찰 목록 ({filteredObservations.length})</span>
        </button>
      </div>

      {/* Main Workspace: Side-by-Side on Desktop, Tabbed on Mobile */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 flex flex-col min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 flex-1 min-h-0">
          {/* Map Area (Desktop: 7 cols or 8 cols) */}
          <div
            className={`md:col-span-7 lg:col-span-8 flex flex-col h-[520px] md:h-[calc(100vh-250px)] min-h-[400px] md:min-h-[520px] ${
              mobileTab === 'map' ? 'block' : 'hidden md:flex'
            }`}
          >
            <EcologyMap
              observations={filteredObservations}
              selectedObservation={selectedObservation}
              onSelectObservation={handleSelectObservation}
              onMapClickCoordinates={handleMapClickCoords}
              targetCoords={targetFocusCoords}
            />
          </div>

          {/* Observation List Area (Desktop: 5 cols or 4 cols) */}
          <div
            className={`md:col-span-5 lg:col-span-4 flex flex-col h-[520px] md:h-[calc(100vh-250px)] min-h-[400px] md:min-h-[520px] rounded-2xl md:rounded-3xl overflow-hidden border border-stone-200/90 shadow-sm ${
              mobileTab === 'list' ? 'block' : 'hidden md:flex'
            }`}
          >
            <ObservationList
              observations={filteredObservations}
              selectedObservationId={selectedObservation?.id || null}
              onSelectObservation={handleSelectObservation}
              onOpenAddModal={() => {
                setClickedMapCoords(null);
                setIsAddModalOpen(true);
              }}
              currentClassLabel={currentClassLabel}
              onResetFilters={() =>
                setFilter({
                  selectedClassId: 'all',
                  selectedCategory: 'all',
                  searchQuery: '',
                  sortBy: 'latest',
                })
              }
            />
          </div>
        </div>
      </main>

      {/* Mobile Floating Action Button */}
      <div className="md:hidden fixed bottom-5 right-5 z-20">
        <button
          onClick={() => {
            setClickedMapCoords(null);
            setIsAddModalOpen(true);
          }}
          className="w-13 h-13 rounded-2xl bg-emerald-600 text-white shadow-xl flex items-center justify-center hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
          title="관찰 기록 추가"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Observation Detail Modal */}
      {detailModalObservation && (
        <ObservationDetail
          observation={detailModalObservation}
          onClose={() => setDetailModalObservation(null)}
          onDelete={handleDeleteObservation}
          onLocateOnMap={handleLocateOnMap}
        />
      )}

      {/* Observation Form Modal */}
      {isAddModalOpen && (
        <ObservationForm
          initialCoordinates={clickedMapCoords}
          defaultClassId={filter.selectedClassId}
          onClose={() => {
            setIsAddModalOpen(false);
            setClickedMapCoords(null);
          }}
          onSubmit={handleAddObservation}
        />
      )}

      {/* Dev / Teacher Test Tools Modal */}
      <DevToolsModal
        isOpen={isDevModalOpen}
        onClose={() => setIsDevModalOpen(false)}
        onDataChanged={loadData}
        currentCount={observations.length}
      />

      {/* Teacher Authentication Modal */}
      <TeacherAuthModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        onAuthChanged={loadData}
      />

      {/* Student Guide Help Modal */}
      <StudentGuideModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      {/* Version Changelog History Modal */}
      <ChangelogModal
        isOpen={isChangelogModalOpen}
        onClose={() => setIsChangelogModalOpen(false)}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <aside
          role="status"
          aria-live="polite"
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-auto px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-200 border transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700 shadow-emerald-950/20'
              : toast.type === 'error'
              ? 'bg-red-900 text-white border-red-700 shadow-red-950/20'
              : 'bg-stone-900 text-white border-stone-700 shadow-stone-950/20'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-stone-400 shrink-0" />
          )}
          <p className="text-xs sm:text-sm font-semibold flex-1 leading-tight">{toast.text}</p>
          <button
            onClick={() => setToast(null)}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </aside>
      )}
    </div>
  );
}
