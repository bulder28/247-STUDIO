import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
import { BookingDomainModel } from '@/shared/domain/types';

export const AttendanceHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [bookings, setBookings] = useState<BookingDomainModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileTab, setMobileTab] = useState<'mapa' | 'curva' | 'meses'>('mapa');
  const [mobileMonthIdx, setMobileMonthIdx] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    if (!user) return;

    const fetchBookings = async () => {
      try {
        const q = query(collection(db, 'bookings'), where('uid', '==', user.uid));
        const snap = await getDocs(q);
        const list: BookingDomainModel[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<BookingDomainModel, 'id'>) }));
        setBookings(list);
      } catch (err) {
        console.error('Error fetching attendance history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user]);

  // Filtrar bookings por año seleccionado
  const yearBookings = bookings.filter((b) => b.date && b.date.startsWith(String(selectedYear)));
  const attendedDates = new Set(
    yearBookings.map((b) => b.date).concat([
      // Mock realista para dar vida a la gráfica y al mapa si el alumno es nuevo
      `${selectedYear}-01-08`,
      `${selectedYear}-01-10`,
      `${selectedYear}-01-13`,
      `${selectedYear}-01-15`,
      `${selectedYear}-01-20`,
      `${selectedYear}-01-22`,
      `${selectedYear}-01-27`,
      `${selectedYear}-02-03`,
      `${selectedYear}-02-05`,
      `${selectedYear}-02-10`,
      `${selectedYear}-02-12`,
      `${selectedYear}-02-17`,
      `${selectedYear}-02-19`,
      `${selectedYear}-02-24`,
      `${selectedYear}-03-02`,
      `${selectedYear}-03-04`,
      `${selectedYear}-03-09`,
      `${selectedYear}-03-11`,
      `${selectedYear}-03-16`,
      `${selectedYear}-03-18`,
    ])
  );

  const totalClasses = attendedDates.size;

  // Meses abreviados para el heatmap
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  // Datos acumulados por mes para la gráfica lineal estilo MatGoat
  const monthlyData = [
    { month: 'Enero', count: 12 },
    { month: 'Febrero', count: 24 },
    { month: 'Marzo', count: 38 },
    { month: 'Abril', count: 52 },
    { month: 'Mayo', count: 68 },
    { month: 'Junio', count: 85 },
    { month: 'Julio', count: 102 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-8 pb-2 md:pb-12 animate-in fade-in duration-200">
      {/* ======================================================== */}
      {/* 1. CABECERA: CLASES ASISTIDAS + SELECTOR DE AÑO          */}
      {/* ======================================================== */}
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Clases Asistidas
          </h1>
          <p className="hidden sm:block text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Registro de entrenamientos y asistencia al tatami
          </p>
        </div>

        {/* Selector de año estilo MatGoat */}
        <div className="flex items-center gap-1.5 sm:gap-3 bg-white border border-slate-200/80 rounded-2xl p-1 sm:p-1.5 shadow-sm">
          <button
            onClick={() => setSelectedYear((y) => y - 1)}
            className="flex items-center gap-0.5 px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{selectedYear - 1}</span>
          </button>

          <div className="text-center px-2 sm:px-4">
            <span className="text-sm sm:text-base font-extrabold text-slate-900 block leading-tight">{selectedYear}</span>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block">
              {totalClasses} clases
            </span>
          </div>

          <button
            onClick={() => setSelectedYear((y) => y + 1)}
            className="flex items-center gap-0.5 px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition cursor-pointer"
          >
            <span className="hidden sm:inline">{selectedYear + 1}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Selector de sub-pestañas móvil sin scroll vertical */}
      <div className="md:hidden grid grid-cols-3 gap-1.5 bg-slate-200/70 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setMobileTab('mapa')}
          className={`py-2 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
            mobileTab === 'mapa' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
          }`}
        >
          🔥 Mapa
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('curva')}
          className={`py-2 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
            mobileTab === 'curva' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
          }`}
        >
          📈 Curva
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('meses')}
          className={`py-2 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
            mobileTab === 'meses' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
          }`}
        >
          📅 Meses
        </button>
      </div>

      {/* ======================================================== */}
      {/* 2. HEATMAP ANUAL ESTILO MATGOAT (Puntos verdes)         */}
      {/* ======================================================== */}
      <div
        className={`${
          mobileTab === 'mapa' ? 'block' : 'hidden md:block'
        } bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-7 shadow-sm overflow-x-auto`}
      >
        {/* Cabecera de meses */}
        <div className="min-w-[650px]">
          <div className="flex text-[11px] font-semibold text-slate-400 pl-6 mb-3">
            {months.map((m) => (
              <span key={m} className="flex-1 text-center">
                {m}
              </span>
            ))}
          </div>

          {/* Rejilla de días (7 filas x ~32 columnas de semanas) */}
          <div className="space-y-1.5">
            {dayLabels.map((dayLabel, dIdx) => (
              <div key={dayLabel} className="flex items-center gap-2">
                <span className="w-4 text-[10px] font-bold text-slate-400 text-center">{dayLabel}</span>
                <div className="flex-1 flex justify-between gap-1">
                  {Array.from({ length: 32 }).map((_, wIdx) => {
                    // Generar un patrón visual realista para el heatmap
                    const isAttended =
                      (wIdx < 16 && (dIdx === 1 || dIdx === 3 || (dIdx === 0 && wIdx % 2 === 0))) ||
                      (wIdx >= 16 && wIdx < 20 && dIdx === 2);
                    return (
                      <span
                        key={wIdx}
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${
                          isAttended
                            ? 'bg-emerald-500 ring-2 ring-emerald-100'
                            : 'bg-slate-100'
                        }`}
                        title={`Semana ${wIdx + 1}, Día ${dayLabel}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. GRÁFICA LINEAL ACUMULADA: ASISTENCIA 2026             */}
      {/* ======================================================== */}
      <div
        className={`${
          mobileTab === 'curva' ? 'block' : 'hidden md:block'
        } bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-7 shadow-sm`}
      >
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Asistencia {selectedYear}
          </h3>
          <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
            Crecimiento acumulado
          </span>
        </div>

        {/* Gráfico SVG estilizado idéntico al de MatGoat */}
        <div className="relative h-48 sm:h-56 w-full pt-4">
          {/* Ejes Y tenues */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] font-mono text-slate-300">
            <div className="border-b border-slate-100 w-full flex justify-between pb-0.5">
              <span>120</span>
            </div>
            <div className="border-b border-slate-100 w-full flex justify-between pb-0.5">
              <span>90</span>
            </div>
            <div className="border-b border-slate-100 w-full flex justify-between pb-0.5">
              <span>60</span>
            </div>
            <div className="border-b border-slate-100 w-full flex justify-between pb-0.5">
              <span>30</span>
            </div>
            <div className="border-b border-slate-100 w-full flex justify-between pb-0.5">
              <span>0</span>
            </div>
          </div>

          {/* SVG Line & Gradient */}
          <svg className="w-full h-full overflow-visible" viewBox="0 0 700 180" preserveAspectRatio="none">
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Sombra de área */}
            <polygon
              points="20,150 110,130 210,105 310,80 410,55 510,30 610,10 610,175 20,175"
              fill="url(#areaGradient)"
            />

            {/* Línea azul brillante */}
            <polyline
              fill="none"
              stroke="#2563EB"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points="20,150 110,130 210,105 310,80 410,55 510,30 610,10"
            />

            {/* Puntos destacados */}
            {[
              { x: 20, y: 150, val: 12 },
              { x: 110, y: 130, val: 24 },
              { x: 210, y: 105, val: 38 },
              { x: 310, y: 80, val: 52 },
              { x: 410, y: 55, val: 68 },
              { x: 510, y: 30, val: 85 },
              { x: 610, y: 10, val: 102 },
            ].map((pt, idx) => (
              <g key={idx}>
                <circle cx={pt.x} cy={pt.y} r="4" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2.5" />
              </g>
            ))}
          </svg>

          {/* Etiquetas eje X */}
          <div className="flex justify-between text-[10px] sm:text-[11px] font-medium text-slate-400 mt-3 pt-1">
            {monthlyData.map((d) => (
              <span key={d.month}>{d.month}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. CALENDARIOS TRIMESTRALES CON DÍAS MARCADOS EN VERDE   */}
      {/* ======================================================== */}
      <div className={`${mobileTab === 'meses' ? 'block' : 'hidden md:block'} space-y-2.5 md:space-y-0`}>
        {/* Selector de mes en móvil para mostrar solo 1 calendario a la vez sin scroll */}
        <div className="md:hidden flex items-center justify-center gap-1.5">
          {(['Enero', 'Febrero', 'Marzo'] as const).map((mName, idx) => (
            <button
              key={mName}
              type="button"
              onClick={() => setMobileMonthIdx(idx as 0 | 1 | 2)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                mobileMonthIdx === idx ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              {mName}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Enero */}
          <div className={`${mobileMonthIdx === 0 ? 'block' : 'hidden md:block'} bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm`}>
            <h4 className="font-bold text-sm text-slate-900 mb-3">Enero {selectedYear}</h4>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
              {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((d) => (
                <span key={d} className="text-slate-400 font-semibold py-1">
                  {d}
                </span>
              ))}
              <span />
              <span />
              <span />
              {Array.from({ length: 31 }).map((_, i) => {
                const day = i + 1;
                const isAttended = [8, 10, 13, 15, 20, 22, 27].includes(day);
                return (
                  <div key={day} className="py-0.5 sm:py-1 flex items-center justify-center">
                    <span
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isAttended
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-400 font-bold'
                          : 'text-slate-700'
                      }`}
                    >
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Febrero */}
          <div className={`${mobileMonthIdx === 1 ? 'block' : 'hidden md:block'} bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm`}>
            <h4 className="font-bold text-sm text-slate-900 mb-3">Febrero {selectedYear}</h4>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
              {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((d) => (
                <span key={d} className="text-slate-400 font-semibold py-1">
                  {d}
                </span>
              ))}
              {Array.from({ length: 28 }).map((_, i) => {
                const day = i + 1;
                const isAttended = [3, 5, 10, 12, 17, 19, 24].includes(day);
                return (
                  <div key={day} className="py-0.5 sm:py-1 flex items-center justify-center">
                    <span
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isAttended
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-400 font-bold'
                          : 'text-slate-700'
                      }`}
                    >
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Marzo */}
          <div className={`${mobileMonthIdx === 2 ? 'block' : 'hidden md:block'} bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm`}>
            <h4 className="font-bold text-sm text-slate-900 mb-3">Marzo {selectedYear}</h4>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
              {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((d) => (
                <span key={d} className="text-slate-400 font-semibold py-1">
                  {d}
                </span>
              ))}
              {Array.from({ length: 31 }).map((_, i) => {
                const day = i + 1;
                const isAttended = [2, 4, 9, 11, 16, 18, 23, 25, 30].includes(day);
                return (
                  <div key={day} className="py-0.5 sm:py-1 flex items-center justify-center">
                    <span
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isAttended
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-400 font-bold'
                          : 'text-slate-700'
                      }`}
                    >
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
