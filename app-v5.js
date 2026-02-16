import React, { useState, useMemo, useEffect, useRef } from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
import { 
  Calendar, Users, Briefcase, CheckCircle, AlertTriangle, LogOut, ChevronLeft, ChevronRight, 
  Plus, BarChart2, Maximize, LayoutGrid, Trash2, Pencil, Info, PieChart, Check, Settings, 
  UserPlus, X, ClipboardList, Lock, Key, ArrowLeft, ChevronDown, ChevronUp, UserCheck, 
  TrendingUp, AlertCircle, Upload, FileText, AlertOctagon, Download, Clock, XCircle, 
  Square, CheckSquare, Search, Save, Send
} from 'https://esm.sh/lucide-react@0.330.0';

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, writeBatch } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

// --- CONFIGURATION ---
const firebaseConfig = window.__firebase_config; 
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';

// --- CONSTANTS ---
const RUSSIAN_HOLIDAYS = ['01-01', '01-02', '01-03', '01-04', '01-05', '01-06', '01-07', '01-08', '02-23', '03-08', '05-01', '05-09', '06-12', '11-04'];
const MONTHS_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const FULL_MONTHS = ['ЯНВАРЬ', 'ФЕВРАЛЬ', 'МАРТ', 'АПРЕЛЬ', 'МАЙ', 'ИЮНЬ', 'ИЮЛЬ', 'АВГУСТ', 'СЕНТЯБРЬ', 'ОКТЯБРЬ', 'НОЯБРЬ', 'ДЕКАБРЬ'];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const INITIAL_DEPARTMENTS_DATA = [
    { name: 'IT Отдел' }, { name: 'Продажи' }, { name: 'Бухгалтерия' }, { name: 'HR' }
];

const INITIAL_USERS_DATA = [
  { id: 999, name: 'HR Администратор', department: 'HR', avatar: 'AD', role: 'admin', yearlyAllowance: 0, carryOverDays: 0, hireDate: '2020-01-01', password: 'admin' },
  { id: 50, name: 'Ольга Начальникова', department: 'Продажи', avatar: 'ON', role: 'manager', yearlyAllowance: 28, carryOverDays: 10, hireDate: '2021-03-15', password: '123' },
  { id: 1, name: 'Алексей Петров', department: 'IT Отдел', avatar: 'AP', role: 'employee', yearlyAllowance: 28, carryOverDays: 5, hireDate: '2023-05-10', password: '123' },
  { id: 2, name: 'Мария Сидорова', department: 'IT Отдел', avatar: 'MS', role: 'employee', yearlyAllowance: 28, carryOverDays: 0, hireDate: '2024-02-15', password: '123' },
];

const INITIAL_VACATIONS_DATA = [];

// --- HELPERS ---
const isHoliday = (d) => RUSSIAN_HOLIDAYS.includes(`${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6 || isHoliday(d);
const countBillableDays = (s, e) => {
  if (!s || !e) return 0;
  let c = 0, cur = new Date(s), end = new Date(e);
  while (cur <= end) { if (!isHoliday(cur)) c++; cur.setDate(cur.getDate() + 1); }
  return c;
};
const checkOverlap = (s1, e1, s2, e2) => s1 <= e2 && s2 <= e1;
const isFuture = (d) => new Date(d) > new Date(2025, 11, 31);
const isSameDay = (d1, d2) => d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

// --- COMPONENTS ---

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Удалить", isDanger = true }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
          {isDanger && <AlertTriangle className="w-5 h-5 text-red-500" />}
          {title}
        </h3>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors">Отмена</button>
          <button onClick={onConfirm} className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

const Header = ({ user, onLogout }) => {
  if (!user) return null;
  let roleIcon = <Calendar className="text-white w-6 h-6" />;
  let headerBg = 'bg-blue-600';
  let badgeBg = 'bg-blue-100 text-blue-700';

  if (user.role === 'admin') {
    roleIcon = <Settings className="text-white w-6 h-6" />;
    headerBg = 'bg-indigo-600';
    badgeBg = 'bg-indigo-100 text-indigo-700';
  } else if (user.role === 'manager') {
    roleIcon = <Briefcase className="text-white w-6 h-6" />;
    headerBg = 'bg-emerald-600';
    badgeBg = 'bg-emerald-100 text-emerald-700';
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={`${headerBg} p-2 rounded-lg transition-colors`}>{roleIcon}</div>
        <h1 className="text-xl font-bold text-gray-800">{user.role === 'admin' ? 'HR Панель' : 'Отпускной Трекер'}</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${badgeBg}`}>{user.avatar}</div>
          <div className="flex flex-col"><span className="text-sm font-semibold text-gray-700">{user.name}</span><span className="text-xs text-gray-500">{user.department}</span></div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50" title="Выйти">
          <span className="text-sm font-medium">Выйти</span>
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const BalanceCard = ({ user, vacations }) => {
    const totalAllowance = Number(user.yearlyAllowance) + Number(user.carryOverDays);
    const usedDays = vacations.filter(v => v.userId === user.id && v.status === 'approved').reduce((acc, v) => acc + countBillableDays(v.startDate, v.endDate), 0);
    const pendingDays = vacations.filter(v => v.userId === user.id && v.status === 'pending').reduce((acc, v) => acc + countBillableDays(v.startDate, v.endDate), 0);
    const draftDays = vacations.filter(v => v.userId === user.id && v.status === 'draft').reduce((acc, v) => acc + countBillableDays(v.startDate, v.endDate), 0);
    const remainingDays = totalAllowance - usedDays;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                <PieChart className="w-4 h-4 text-gray-500" /> Мой Баланс ({new Date().getFullYear() + 1})
            </h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg text-center"><div className="text-xs text-blue-600 font-medium mb-1">Всего</div><div className="text-xl font-bold text-blue-800">{totalAllowance}</div></div>
                <div className="bg-green-50 p-3 rounded-lg text-center"><div className="text-xs text-green-600 font-medium mb-1">Одобрено</div><div className="text-xl font-bold text-green-800">{usedDays}</div></div>
                <div className={`p-3 rounded-lg text-center ${remainingDays < 0 ? 'bg-red-50' : 'bg-gray-100'}`}><div className={`text-xs font-medium mb-1 ${remainingDays < 0 ? 'text-red-600' : 'text-gray-600'}`}>Остаток</div><div className={`text-xl font-bold ${remainingDays < 0 ? 'text-red-800' : 'text-gray-800'}`}>{remainingDays}</div></div>
            </div>
            {pendingDays > 0 && <div className="mb-2 bg-orange-50 border border-orange-100 rounded-lg p-2 flex items-center justify-center gap-2 text-xs text-orange-700"><Clock className="w-3 h-3" /> На согласовании: <b>{pendingDays}</b> дн.</div>}
            {draftDays > 0 && <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-2 flex items-center justify-center gap-2 text-xs text-gray-600"><FileText className="w-3 h-3" /> В черновиках: <b>{draftDays}</b> дн.</div>}
        </div>
    );
};

const PersonalYearCalendar = ({ year, user, vacations, users, onSelectRange, selection, balance, onPrevYear, onNextYear }) => {
    const [tooltip, setTooltip] = useState(null);

    const renderMonth = (monthIndex) => {
        const date = new Date(year, monthIndex, 1);
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        const startDay = (date.getDay() + 6) % 7; 
        const days = [];
        
        const teamIds = users.filter(u => u.department === user.department && u.id !== user.id).map(u => u.id);

        for (let i = 0; i < startDay; i++) days.push(<div key={`e-${i}`} className="w-8 h-8"></div>);
        for (let d = 1; d <= daysInMonth; d++) {
            const current = new Date(year, monthIndex, d);
            const isWe = isWeekend(current);
            const vac = vacations.find(v => v.userId === user.id && current >= new Date(v.startDate).setHours(0,0,0,0) && current <= new Date(v.endDate).setHours(0,0,0,0) && v.status !== 'rejected');
            const teamVacs = vacations.filter(v => teamIds.includes(v.userId) && current >= new Date(v.startDate).setHours(0,0,0,0) && current <= new Date(v.endDate).setHours(0,0,0,0) && v.status !== 'rejected');
            
            let bgClass = isWe ? "text-red-500" : "text-gray-700";
            let cellClass = "hover:bg-gray-100 cursor-pointer relative";
            let indicator = null;

            if (vac) {
                if (vac.status === 'approved') { bgClass = "bg-blue-600 text-white"; cellClass = ""; }
                else if (vac.status === 'pending') { bgClass = "bg-amber-400 text-white"; cellClass = ""; }
                else if (vac.status === 'draft') { bgClass = "bg-gray-400 text-white"; cellClass = "cursor-pointer hover:bg-gray-500"; }
            } else if (teamVacs.length > 0) {
                if (teamVacs.some(v => v.status === 'approved')) bgClass = "bg-cyan-100 text-cyan-900";
                else if (teamVacs.some(v => v.status === 'pending')) bgClass = "bg-orange-100 text-orange-900";
                else bgClass = "bg-gray-100 text-gray-500 border border-dashed border-gray-300";
            }

            if (selection.start && current.getTime() === selection.start.getTime()) bgClass = "bg-indigo-600 text-white rounded-l-full";
            if (selection.end && current.getTime() === selection.end.getTime()) bgClass = "bg-indigo-600 text-white rounded-r-full";
            if (selection.start && selection.end && current > selection.start && current < selection.end) bgClass = "bg-indigo-200 text-indigo-800";
            
            if ((vac || (selection.start && current >= selection.start && current <= (selection.end || selection.start))) && teamVacs.length > 0) {
                indicator = <div className="absolute bottom-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm"></div>;
            }

            const buildTooltip = () => {
                let lines = [];
                if (vac) lines.push(`Я: ${vac.status === 'approved' ? 'Согласовано' : vac.status === 'pending' ? 'На согласовании' : 'Черновик'}`);
                if (teamVacs.length > 0) {
                    if (vac) lines.push('---');
                    teamVacs.forEach(v => {
                        const u = users.find(u => u.id === v.userId);
                        if (u) lines.push(`${u.name}: ${v.status === 'approved' ? 'Согласовано' : v.status === 'pending' ? 'Ждет' : 'Черновик'}`);
                    });
                }
                return lines.length > 0 ? lines.join('\n') : null;
            };

            const tooltipText = buildTooltip();

            days.push(
                <div 
                    key={d} 
                    onClick={() => onSelectRange(current)}
                    onMouseEnter={(e) => {
                        if (tooltipText) {
                            const rect = e.target.getBoundingClientRect();
                            setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 5, text: tooltipText });
                        }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    className={`w-8 h-8 flex items-center justify-center text-sm rounded-full transition-colors ${bgClass} ${cellClass}`}
                >
                    {d}
                    {indicator}
                </div>
            );
        }
        return (
            <div key={monthIndex} className="mb-6">
                <h4 className="font-bold text-gray-800 mb-2 pl-2">{FULL_MONTHS[monthIndex]}</h4>
                <div className="grid grid-cols-7 gap-1 text-center">{WEEKDAYS.map(w => <div key={w} className="text-xs text-gray-400 font-medium w-8">{w}</div>)}{days}</div>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative">
            {tooltip && (
                <div 
                    className="fixed z-50 bg-gray-800 text-white text-xs p-2 rounded shadow-lg pointer-events-none whitespace-pre-line"
                    style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
                >
                    {tooltip.text}
                </div>
            )}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={onPrevYear} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft className="w-5 h-5"/></button>
                    <span className="text-xl font-bold text-gray-900">{year}</span>
                    <button onClick={onNextYear} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight className="w-5 h-5"/></button>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-500 mr-4">Доступно: <span className="font-bold text-blue-600">{balance}</span> дн. {selection.count > 0 && <span className="ml-2 text-indigo-600">(Выбрано: {selection.count})</span>}</div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">{Array.from({length: 12}, (_, i) => renderMonth(i))}</div>
            
            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600"></div>Ваш (Одобрен)</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400"></div>Ваш (Ждет)</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-400"></div>Ваш (Черновик)</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-cyan-100 border border-cyan-200"></div>Коллега (Одобрен)</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-100 border border-orange-200"></div>Коллега (Ждет)</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border border-dashed border-gray-400 bg-gray-50"></div>Коллега (Черновик)</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div>Пересечение</div>
            </div>
        </div>
    );
};

const TeamCalendar = ({ vacations, users, departments, currentMonthDate, onPrev, onNext, viewMode, setViewMode, currentUser, localDraft }) => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const today = new Date();
    
    const months = viewMode === 'year' 
        ? MONTHS_SHORT.map((_, i) => i) 
        : viewMode === 'quarter' 
            ? [Math.floor(month/3)*3, Math.floor(month/3)*3+1, Math.floor(month/3)*3+2] 
            : [month];

    const [expandedDepts, setExpandedDepts] = useState([]);

    useEffect(() => {
        if (currentUser.role === 'admin') setExpandedDepts(departments);
        else setExpandedDepts([currentUser.department]);
    }, [currentUser, departments]);

    const toggleDept = (dept) => {
        if (expandedDepts.includes(dept)) setExpandedDepts(expandedDepts.filter(d => d !== dept));
        else setExpandedDepts([...expandedDepts, dept]);
    };

    const getVacationForDay = (uid, d) => {
        return vacations.find(v => v.userId === uid && d >= new Date(v.startDate).setHours(0,0,0,0) && d <= new Date(v.endDate).setHours(0,0,0,0));
    };

    const isLocalDraftDay = (d) => {
        if (!localDraft || !localDraft.start || !localDraft.end) return false;
        return d >= new Date(localDraft.start).setHours(0,0,0,0) && d <= new Date(localDraft.end).setHours(0,0,0,0);
    };

    const usersByDept = useMemo(() => {
        const grouped = {};
        departments.forEach(d => grouped[d] = []);
        users.filter(u => u.role !== 'admin').forEach(u => { if(grouped[u.department]) grouped[u.department].push(u); });
        if (currentUser.role !== 'admin') {
            const myDept = currentUser.department;
            if (grouped[myDept]) {
                grouped[myDept].sort((a, b) => {
                    if (a.id === currentUser.id) return -1;
                    if (b.id === currentUser.id) return 1;
                    return 0;
                });
            }
        }
        return grouped;
    }, [users, departments, currentUser]);

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white sticky left-0 z-20">
                <div className="font-bold text-gray-800 flex gap-2 text-lg">
                    <Calendar className="w-6 h-6 text-blue-600"/> 
                    {viewMode === 'year' ? year : `${FULL_MONTHS[month]} ${year}`}
                </div>
                <div className="flex gap-3 items-center">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={()=>setViewMode('month')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode==='month'?'bg-white text-blue-600 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>Месяц</button>
                        <button onClick={()=>setViewMode('quarter')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode==='quarter'?'bg-white text-blue-600 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>Квартал</button>
                        <button onClick={()=>setViewMode('year')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode==='year'?'bg-white text-blue-600 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>Год</button>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={onPrev} className="p-2 hover:bg-gray-100 rounded-full text-gray-600"><ChevronLeft className="w-5 h-5"/></button>
                        <button onClick={onNext} className="p-2 hover:bg-gray-100 rounded-full text-gray-600"><ChevronRight className="w-5 h-5"/></button>
                    </div>
                </div>
            </div>
            
            <div className="overflow-x-auto relative">
                <div className="min-w-[800px]">
                    <div className="flex border-b border-gray-200 bg-gray-50/50">
                        <div className="w-64 flex-shrink-0 p-3 border-r border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">Сотрудник</div>
                        <div className="flex-grow flex">
                            {months.map(mIdx => {
                                const daysInMonth = new Date(year, mIdx+1, 0).getDate();
                                return viewMode === 'year' ? 
                                    <div key={mIdx} className="flex-1 text-center text-xs font-semibold py-3 border-r border-gray-200 text-gray-600">{MONTHS_SHORT[mIdx]}</div> : 
                                    Array.from({length:daysInMonth},(_,i)=>i+1).map(d => {
                                        const currentDate = new Date(year, mIdx, d);
                                        const isWe = isWeekend(currentDate);
                                        const isToday = isSameDay(currentDate, today);
                                        return (
                                            <div key={d} className={`w-8 flex-shrink-0 flex flex-col items-center justify-center text-[10px] py-2 border-r border-gray-200 min-w-[28px] ${isWe ? 'bg-gray-50 text-gray-400' : 'bg-white text-gray-600'} ${isToday ? 'bg-blue-50 text-blue-600 font-bold ring-1 ring-inset ring-blue-200' : ''}`}>
                                                {d}
                                            </div>
                                        )
                                    });
                            })}
                        </div>
                    </div>

                    {departments.map(dept => {
                        const deptUsers = usersByDept[dept];
                        if (!deptUsers || deptUsers.length === 0) return null;
                        return (<React.Fragment key={dept}>
                            <div onClick={()=>toggleDept(dept)} className="bg-gray-100/80 px-4 py-2 text-xs font-bold uppercase cursor-pointer flex items-center gap-2 hover:bg-gray-200/80 border-b border-gray-200 text-gray-700 sticky left-0 z-10">
                                {expandedDepts.includes(dept)?<ChevronDown className="w-3 h-3"/>:<ChevronRight className="w-3 h-3"/>}{dept}
                            </div>
                            {expandedDepts.includes(dept) && deptUsers.map(u => (
                                <div key={u.id} className={`flex border-b border-gray-100 h-10 transition-colors ${u.id===currentUser.id?'bg-blue-50/30 hover:bg-blue-50/50':'hover:bg-gray-50'}`}>
                                    <div className={`w-64 flex-shrink-0 px-4 border-r border-gray-200 flex items-center gap-3 text-sm sticky left-0 z-10 ${u.id===currentUser.id?'bg-blue-50/30 backdrop-blur-sm':'bg-white'}`}>
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center font-bold text-xs text-gray-600 border border-gray-200 shadow-sm">{u.avatar}</div>
                                        <span className={`truncate ${u.id===currentUser.id ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>{u.name}</span>
                                    </div>
                                    <div className="flex-grow flex">{months.map(mIdx => {
                                        const days = new Date(year, mIdx+1, 0).getDate();
                                        return viewMode === 'year' ? 
                                        <div key={mIdx} className="flex-1 border-r border-gray-200 relative bg-white">{Array.from({length:days},(_,i)=>i+1).map(d=>{
                                            const dt = new Date(year,mIdx,d).getTime();
                                            const v = getVacationForDay(u.id, dt);
                                            return v && v.status === 'approved' ? <div key={d} className="absolute inset-y-1 bg-blue-500 rounded-sm opacity-90" style={{left:`${(d/days)*100}%`, width: `${100/days}%`}}/> : null;
                                        })}</div> :
                                        Array.from({length:days},(_,i)=>i+1).map(d => {
                                            const dt = new Date(year, mIdx, d).getTime();
                                            const v = getVacationForDay(u.id, dt);
                                            const isWe = isWeekend(new Date(year, mIdx, d));
                                            const isLocal = u.id === currentUser.id && isLocalDraftDay(dt);
                                            
                                            let content = null;
                                            
                                            if (isLocal) {
                                                content = <div className="absolute inset-1 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes-light.png')] bg-indigo-100 border border-indigo-300 rounded-sm animate-pulse" title="Планируется"></div>;
                                            } else if (v) {
                                                if (v.status === 'approved') content = <div className="absolute inset-1 bg-blue-500 rounded-sm shadow-sm" title="Отпуск"></div>;
                                                else if (v.status === 'pending') content = <div className="absolute inset-1 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes-light.png')] bg-amber-200 rounded-sm border border-amber-300" title="На согласовании"></div>;
                                                else if (v.status === 'draft') content = <div className="absolute inset-1 border-2 border-dashed border-gray-300 rounded-sm bg-gray-50" title="Черновик"></div>;
                                            }
                                            
                                            return <div key={d} className={`w-8 flex-shrink-0 border-r border-gray-100 relative min-w-[28px] ${isWe ? 'bg-gray-50' : 'bg-white'}`}>
                                                {content}
                                            </div>
                                        })
                                    })}</div>
                                </div>
                            ))}
                        </React.Fragment>)
                    })}
                </div>
            </div>
        </div>
    );
};

const UserView = ({ user, users, vacs, onAdd, onUpdate, onDel, calendarProps }) => {
    const [sel, setSel] = useState({ start: null, end: null, count: 0 });
    const [replacementId, setReplacementId] = useState('');
    const [isSendingDrafts, setIsSendingDrafts] = useState(false);
    const draftCount = vacs.filter(v => v.userId === user.id && v.status === 'draft').length;
    
    // Calculate Balance
    const totalAllowance = Number(user.yearlyAllowance) + Number(user.carryOverDays);
    const usedDays = vacs.filter(v => v.userId === user.id && v.status !== 'rejected' && v.status !== 'draft').reduce((acc, v) => acc + countBillableDays(v.startDate, v.endDate), 0);
    const remainingDays = totalAllowance - usedDays;

    const potentialReplacements = useMemo(() => {
        return users.filter(u => u.department === user.department && u.id !== user.id);
    }, [users, user]);

    const handleSelect = (date) => {
        if (!sel.start || (sel.start && sel.end)) { setSel({ start: date, end: null, count: 0 }); } 
        else { let s = sel.start, e = date; if (date < s) { s = date; e = sel.start; } const days = countBillableDays(s, e); setSel({ start: s, end: e, count: days }); }
    };
    
    const handleAction = (status) => {
        if (!sel.start || !sel.end) return;
        if (sel.count > remainingDays) return alert(`Ошибка: Выбрано ${sel.count} дн., а доступно всего ${remainingDays}`);
        
        const payload = { 
            userId: user.id, 
            startDate: sel.start.toLocaleDateString('en-CA'), 
            endDate: sel.end.toLocaleDateString('en-CA'), 
            status: status, 
            replacementId: replacementId ? Number(replacementId) : null 
        };
        onAdd(payload);
        setSel({ start: null, end: null, count: 0 });
        setReplacementId('');
    };

    const sendAllDrafts = () => {
        const drafts = vacs.filter(v => v.userId === user.id && v.status === 'draft');
        if (!drafts.length) return;
        
        const totalDraftDays = drafts.reduce((acc, d) => acc + countBillableDays(d.startDate, d.endDate), 0);
        
        if (totalDraftDays > remainingDays) {
            alert(`Ошибка: Черновики содержат ${totalDraftDays} дн., а доступно ${remainingDays}. Нельзя отправить.`);
            return;
        }

        setIsSendingDrafts(true);
    };

    const confirmSend = () => {
        const drafts = vacs.filter(v => v.userId === user.id && v.status === 'draft');
        drafts.forEach(d => onUpdate({ ...d, status: 'pending' }));
        setIsSendingDrafts(false);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-6">
                <BalanceCard user={user} vacations={vacs} />
                
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-blue-600"/>Параметры новой заявки</h3>
                    <div className="mb-4 text-sm text-gray-600">
                        {sel.start && sel.end ? (
                            <div>
                                <span className="block font-medium">Даты:</span> 
                                {sel.start.toLocaleDateString()} — {sel.end.toLocaleDateString()}
                                <span className="ml-2 font-bold text-blue-600">({sel.count} дн.)</span>
                            </div>
                        ) : (
                            <span className="italic text-gray-400">Выберите даты на календаре...</span>
                        )}
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Заместитель</label>
                        <div className="relative">
                            <select 
                                value={replacementId} 
                                onChange={(e) => setReplacementId(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg outline-none focus:border-blue-500 appearance-none bg-white text-sm"
                            >
                                <option value="">-- Не выбран --</option>
                                {potentialReplacements.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                            <UserCheck className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                         <button 
                            onClick={() => handleAction('draft')}
                            disabled={!sel.start || !sel.end} 
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <FileText className="w-4 h-4"/> Сохранить черновик
                        </button>
                        <button 
                            onClick={() => handleAction('pending')}
                            disabled={!sel.start || !sel.end} 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Send className="w-4 h-4"/> На согласование
                        </button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex-grow">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><ClipboardList className="w-5 h-5 text-gray-500"/>Черновики</h3>
                        {draftCount > 0 && (<button onClick={sendAllDrafts} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded text-xs hover:bg-blue-100 font-medium transition-colors"><Send className="w-3 h-3"/> Отправить все</button>)}
                    </div>
                    <div className="space-y-2">
                        {vacs.filter(v=>v.userId===user.id).length === 0 && <p className="text-sm text-gray-400 italic">Пока нет запланированных отпусков</p>}
                        {vacs.filter(v=>v.userId===user.id).sort((a,b)=>new Date(a.startDate)-new Date(b.startDate)).map(v=>(
                            <div key={v.id} className="flex justify-between items-start text-sm border-b border-gray-100 pb-3 last:border-0 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                                <div>
                                    <div className="font-medium text-gray-800">{new Date(v.startDate).toLocaleDateString()} — {new Date(v.endDate).toLocaleDateString()}</div>
                                    <div className="text-xs text-gray-500 mt-1">{countBillableDays(v.startDate, v.endDate)} дн.</div>
                                    <div className={`text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full inline-block 
                                        ${v.status==='approved'?'bg-green-100 text-green-700':
                                          v.status==='rejected'?'bg-red-100 text-red-700':
                                          v.status==='draft'?'bg-gray-100 text-gray-700 border border-gray-200':
                                          'bg-amber-100 text-amber-700'}`}>
                                        {v.status === 'pending' ? 'На согласовании' : v.status === 'approved' ? 'Согласовано' : v.status === 'draft' ? 'Черновик' : 'Отклонено'}
                                    </div>
                                    {v.replacementId && <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><UserCheck className="w-3 h-3"/> Зам: {users.find(u=>u.id===v.replacementId)?.name}</div>}
                                </div>
                                {isFuture(v.startDate) && <button onClick={()=>onDel(v.id)} className="text-gray-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors" title="Удалить"><Trash2 className="w-4 h-4"/></button>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="md:col-span-2 space-y-8">
                 <PersonalYearCalendar 
                    year={calendarProps.currentMonthDate.getFullYear()} 
                    user={user} 
                    vacations={vacs} 
                    users={users}
                    onSelectRange={handleSelect} 
                    selection={sel} 
                    balance={remainingDays} 
                    onPrevYear={() => calendarProps.onPrevYear()}
                    onNextYear={() => calendarProps.onNextYear()}
                 />
                 
                 <div className="mt-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Users className="w-6 h-6"/> График отдела</h2>
                    <TeamCalendar vacations={vacs} users={users} departments={[...new Set(users.map(u=>u.department))]} currentUser={user} {...calendarProps} />
                 </div>
            </div>
            <ConfirmModal isOpen={isSendingDrafts} title="Отправка черновиков" message={`Отправить все черновики (${draftCount}) на согласование?`} confirmText="Отправить" isDanger={false} onConfirm={confirmSend} onCancel={() => setIsSendingDrafts(false)} />
        </div>
    );
};

const ManagerApprovals = ({ currentUser, users, vacations, onUpdateVacation }) => {
    const [rejectModal, setRejectModal] = useState(null);
    const pendingRequests = useMemo(() => {
        return vacations.filter(v => {
            const user = users.find(u => u.id === v.userId);
            return v.status === 'pending' && user && user.department === currentUser.department && user.id !== currentUser.id;
        }).map(v => ({ ...v, user: users.find(u => u.id === v.userId) }));
    }, [vacations, users, currentUser]);
    const handleApprove = (vacation) => onUpdateVacation({ ...vacation, status: 'approved' });
    const confirmReject = () => { if (rejectModal) { onUpdateVacation({ ...rejectModal, status: 'rejected' }); setRejectModal(null); } };
    if (pendingRequests.length === 0) return null;
    return (
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden mb-6 animate-fadeIn">
            <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex items-center justify-between"><h3 className="font-bold text-orange-800 flex items-center gap-2"><Clock className="w-5 h-5" />Заявки на согласование ({pendingRequests.length})</h3></div>
            <div className="divide-y divide-gray-100">{pendingRequests.map(req => (<div key={req.id} className="p-4 flex items-center justify-between hover:bg-orange-50/30 transition-colors"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-sm">{req.user.avatar}</div><div><div className="font-semibold text-gray-800">{req.user.name}</div><div className="text-sm text-gray-500">{new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate).toLocaleDateString()} ({countBillableDays(req.startDate, req.endDate)} дн.)</div></div></div><div className="flex gap-2"><button onClick={() => handleApprove(req)} className="flex items-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"><Check className="w-4 h-4" /> Согласовать</button><button onClick={() => setRejectModal(req)} className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"><X className="w-4 h-4" /> Отклонить</button></div></div>))}</div>
            <ConfirmModal isOpen={!!rejectModal} title="Отклонение" message={`Отклонить заявку сотрудника?`} confirmText="Отклонить" isDanger={true} onConfirm={confirmReject} onCancel={() => setRejectModal(null)} />
        </div>
    );
};

const ManagerAnalyticsPage = ({ department, users, vacations, onBack }) => {
    const deptUsers = users.filter(u => u.department === department);
    const deptVacations = vacations.filter(v => deptUsers.find(u => u.id === v.userId) && v.status === 'approved'); 
    const monthCounts = Array(12).fill(0);
    deptVacations.forEach(v => { const start = new Date(v.startDate); monthCounts[start.getMonth()]++; });
    const maxMonthIndex = monthCounts.indexOf(Math.max(...monthCounts));
    const peakMonth = new Date(2026, maxMonthIndex).toLocaleString('ru-RU', { month: 'long' });
    const usersWithVacation = new Set(deptVacations.map(v => v.userId));
    const burnoutRiskUsers = deptUsers.filter(u => !usersWithVacation.has(u.id));
    const totalUsers = deptUsers.length;
    const totalDaysPlanned = deptVacations.reduce((acc, v) => acc + countBillableDays(v.startDate, v.endDate), 0);
    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-4"><button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm"><ArrowLeft className="w-4 h-4" /> Назад к графику</button><h2 className="text-2xl font-bold text-gray-800">Аналитика отдела "{department}"</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"><div className="flex items-center justify-between mb-4"><h3 className="text-gray-500 font-medium text-sm">Всего сотрудников</h3><Users className="w-5 h-5 text-emerald-500" /></div><div className="text-3xl font-bold text-gray-800">{totalUsers}</div></div><div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"><div className="flex items-center justify-between mb-4"><h3 className="text-gray-500 font-medium text-sm">Самый нагруженный месяц</h3><TrendingUp className="w-5 h-5 text-amber-500" /></div><div className="text-3xl font-bold text-gray-800 capitalize">{peakMonth}</div></div><div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"><div className="flex items-center justify-between mb-4"><h3 className="text-gray-500 font-medium text-sm">Использовано дней (Согл.)</h3><PieChart className="w-5 h-5 text-blue-500" /></div><div className="text-3xl font-bold text-gray-800">{totalDaysPlanned}</div></div></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"><h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-red-500" />Зона внимания: Риск выгорания</h3>{burnoutRiskUsers.length > 0 ? (<div className="bg-red-50 border border-red-100 rounded-lg p-4"><p className="text-sm text-red-800 mb-2">Следующие сотрудники еще не запланировали отпуск в 2026 году:</p><div className="flex flex-wrap gap-2">{burnoutRiskUsers.map(u => (<span key={u.id} className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full text-sm border border-red-200 text-gray-700"><div className="w-5 h-5 rounded-full bg-red-100 text-[10px] flex items-center justify-center font-bold text-red-600">{u.avatar}</div>{u.name}</span>))}</div></div>) : (<div className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-center gap-2 text-green-700"><CheckCircle className="w-5 h-5" />Все сотрудники отдела запланировали отдых.</div>)}</div>
        </div>
    );
};

const AdminStats = ({ users, vacations }) => {
    const totalUsers = users.filter(u => u.role !== 'admin').length;
    const totalVacationDays = vacations.filter(v => v.status === 'approved').reduce((acc, v) => acc + countBillableDays(v.startDate, v.endDate), 0);
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center"><div><div className="text-gray-500 text-sm">Сотрудников</div><div className="text-3xl font-bold">{totalUsers}</div></div><Users className="w-8 h-8 text-blue-500 opacity-20"/></div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center"><div><div className="text-gray-500 text-sm">Дней отпуска (Согл.)</div><div className="text-3xl font-bold">{totalVacationDays}</div></div><Calendar className="w-8 h-8 text-green-500 opacity-20"/></div>
        </div>
    );
};

const DepartmentManagement = ({ departments, setDepartments, users, setUsers, deptDocs }) => {
    const [newDept, setNewDept] = useState('');
    const [editingDept, setEditingDept] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [moveModal, setMoveModal] = useState(null); 
    const [targetDept, setTargetDept] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null); 
    const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

    const handleAdd = async (e) => { e.preventDefault(); if (newDept && !departments.includes(newDept)) { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'departments'), { name: newDept }); setNewDept(''); }};
    const startEdit = (dept) => { setEditingDept(dept); setEditValue(dept); };
    const saveEdit = async () => { if (editValue && !departments.includes(editValue)) { const deptDoc = deptDocs.find(d => d.name === editingDept); if (deptDoc) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'departments', deptDoc.id), { name: editValue }); const usersToUpdate = users.filter(u => u.department === editingDept); for (const u of usersToUpdate) { if (u._docId) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u._docId), { department: editValue }); } setEditingDept(null); } else { setEditingDept(null); }};
    const attemptDelete = (dept) => { const usersInDept = users.filter(u => u.department === dept).length; if (usersInDept > 0) { setTargetDept(''); setMoveModal({ deptToDelete: dept, usersCount: usersInDept }); } else { setConfirmDelete({ dept }); }};
    const confirmDeleteDept = async () => { const deptDoc = deptDocs.find(d => d.name === confirmDelete.dept); if (deptDoc) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'departments', deptDoc.id)); setConfirmDelete(null); };
    const confirmMoveAndDelete = async () => { const deptToDelete = moveModal.deptToDelete; const newDepartment = targetDept || 'Без отдела'; const usersToMove = users.filter(u => u.department === deptToDelete); for (const u of usersToMove) { if (u._docId) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u._docId), { department: newDepartment }); } const deptDoc = deptDocs.find(d => d.name === deptToDelete); if (deptDoc) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'departments', deptDoc.id)); setMoveModal(null); };
    const handleDeleteAllDepartments = async () => { const batch = writeBatch(db); deptDocs.forEach(d => { const ref = doc(db, 'artifacts', appId, 'public', 'data', 'departments', d.id); batch.delete(ref); }); users.forEach(u => { if(u._docId) { const ref = doc(db, 'artifacts', appId, 'public', 'data', 'users', u._docId); batch.update(ref, { department: 'Без отдела' }); } }); await batch.commit(); setConfirmDeleteAll(false); };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><Briefcase className="w-5 h-5 text-gray-500" />Управление отделами</h3>
            <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
                {departments.map(dept => (
                    <div key={dept} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 group">
                        {editingDept === dept ? (
                            <div className="flex gap-2 flex-1 items-center">
                                <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded outline-none bg-white" autoFocus />
                                <button onClick={saveEdit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Check className="w-4 h-4" /></button>
                                <button onClick={() => setEditingDept(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
                            </div>
                        ) : (
                            <>
                                <span className="text-sm font-medium text-gray-700">{dept}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => startEdit(dept)} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Переименовать"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => attemptDelete(dept)} className="p-1 text-red-400 hover:bg-red-50 rounded" title="Удалить"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
            <form onSubmit={handleAdd} className="flex gap-2 mb-6"><input type="text" placeholder="Новый отдел" value={newDept} onChange={(e) => setNewDept(e.target.value)} className="flex-1 px-3 py-2 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /><button type="submit" disabled={!newDept} className="bg-indigo-600 text-white px-3 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"><Plus className="w-4 h-4" /> Добавить</button></form>
            <button onClick={() => setConfirmDeleteAll(true)} type="button" className="w-full text-center text-xs text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 p-2 rounded transition-colors flex items-center justify-center gap-1"><AlertOctagon className="w-3 h-3" /> Удалить ВСЕ отделы</button>
            
            <ConfirmModal isOpen={!!confirmDelete} title="Удаление отдела" message={`Вы уверены, что хотите удалить отдел "${confirmDelete?.dept}"?`} onConfirm={confirmDeleteDept} onCancel={() => setConfirmDelete(null)} />
            <ConfirmModal isOpen={confirmDeleteAll} title="Удаление ВСЕХ отделов" message="ВНИМАНИЕ! Это действие необратимо." confirmText="Удалить всё" onConfirm={handleDeleteAllDepartments} onCancel={() => setConfirmDeleteAll(false)} />
            {moveModal && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-gray-200"><h4 className="font-bold text-gray-800 text-lg mb-2">Удаление отдела</h4><p className="text-sm text-gray-500 mb-4 text-center">Куда перевести <b>{moveModal.usersCount}</b> сотрудников?</p><select value={targetDept} onChange={(e) => setTargetDept(e.target.value)} className="w-full mb-6 px-3 py-2 border border-gray-300 rounded text-sm bg-white"><option value="">-- Выберите новый отдел --</option><option value="">Без отдела</option>{departments.filter(d => d !== moveModal.deptToDelete).map(d => (<option key={d} value={d}>{d}</option>))}</select><div className="flex gap-3"><button onClick={() => setMoveModal(null)} className="flex-1 py-2 bg-gray-100 rounded">Отмена</button><button onClick={confirmMoveAndDelete} className="flex-1 py-2 bg-indigo-600 text-white rounded">Перенести</button></div></div></div>)}
        </div>
    );
};

const UserManagement = ({ users, setUsers, departments, vacations }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({ name: '', department: departments[0], hireDate: '', yearlyAllowance: 28, carryOverDays: 0, role: 'employee', password: '123' });
    const fileInputRef = useRef(null);
    const [confirmDelete, setConfirmDelete] = useState(null); 
    const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
    const [importInfo, setImportInfo] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkModal, setBulkModal] = useState(null); 
    const [bulkValue, setBulkValue] = useState('');

    const resetForm = () => { setFormData({ name: '', department: departments[0], hireDate: '', yearlyAllowance: 28, carryOverDays: 0, role: 'employee', password: '123' }); setEditingUser(null); setIsAdding(false); };
    const handleEdit = (user) => { setEditingUser(user); setFormData({ ...user }); setIsAdding(true); };
    const handleDelete = async () => { if (confirmDelete && confirmDelete._docId) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', confirmDelete._docId)); setConfirmDelete(null); }};
    const handleSubmit = async (e) => { e.preventDefault(); const avatar = formData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2); if (editingUser && editingUser._docId) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', editingUser._docId), { ...formData, avatar }); } else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), { ...formData, id: Date.now(), avatar }); } resetForm(); };
    const handleDeleteAllUsers = async () => { const batch = writeBatch(db); users.filter(u => u.role !== 'admin').forEach(u => { if (u._docId) { batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'users', u._docId)); } }); await batch.commit(); setConfirmDeleteAll(false); };
    const downloadTemplate = () => { const headers = "ФИО,Отдел,Роль (employee/manager),Дата найма (YYYY-MM-DD)\nИван Петров,IT Отдел,employee,2024-01-15"; const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.setAttribute('download', 'employees_template.csv'); document.body.appendChild(link); link.click(); document.body.removeChild(link); };
    const handleExportSchedule = () => { let csvContent = ",,Остаток отпуска на 31.12.2025,"; FULL_MONTHS.forEach(m => csvContent += `${m},,,,`); csvContent += "Суммарное количество в графике,Остаток дней неиспользованных дней отпуска на 31.12.2026\n"; csvContent += ",,,"; FULL_MONTHS.forEach(() => csvContent += "дата начала,дата окончания,кол-во дней,согласование руководителя,"); csvContent += ",,\n"; users.filter(u => u.role !== 'admin').forEach(user => { const userVacations = vacations.filter(v => v.userId === user.id && v.status === 'approved'); const totalAllowance = Number(user.yearlyAllowance) + Number(user.carryOverDays); let row = `${user.id},${user.name},${user.carryOverDays},`; let totalUsed = 0; for (let i = 0; i < 12; i++) { const vac = userVacations.find(v => { const d = new Date(v.startDate); return d.getMonth() === i && d.getFullYear() === 2026; }); if (vac) { const days = countBillableDays(vac.startDate, vac.endDate); totalUsed += days; row += `${vac.startDate},${vac.endDate},${days},согласовано,`; } else { row += ",,,,"; } } const remaining = totalAllowance - totalUsed; row += `${totalUsed},${remaining}\n`; csvContent += row; }); const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.setAttribute('download', 'Vacation_Schedule_2026.csv'); document.body.appendChild(link); link.click(); document.body.removeChild(link); };
    const handleFileUpload = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = async (evt) => { const text = evt.target.result; const lines = text.split('\n'); const newUsers = []; lines.forEach((line, index) => { const parts = line.split(',').map(s => s.trim()); if (parts.length >= 2 && index > 0 && parts[0]) { const name = parts[0]; const dept = parts[1] || 'Без отдела'; const role = parts[2] === 'manager' ? 'manager' : 'employee'; const date = parts[3] || new Date().toISOString().split('T')[0]; const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2); newUsers.push({ id: Date.now() + index, name, department: dept, role, yearlyAllowance: 28, carryOverDays: 0, hireDate: date, password: '123', avatar }); } }); if (newUsers.length > 0) { const batch = writeBatch(db); newUsers.forEach(u => { const ref = doc(collection(db, 'artifacts', appId, 'public', 'data', 'users')); batch.set(ref, u); }); await batch.commit(); setImportInfo({ message: `Успешно загружено ${newUsers.length} сотрудников`, isError: false }); } else { setImportInfo({ message: 'Ошибка: Не удалось распознать данные', isError: true }); } setTimeout(() => setImportInfo(null), 3000); }; reader.readAsText(file); e.target.value = ''; };
    const visibleUsers = users.filter(u => u.role !== 'admin');
    const allSelected = visibleUsers.length > 0 && visibleUsers.every(u => selectedIds.includes(u.id));
    const toggleSelectAll = () => { if (allSelected) setSelectedIds([]); else setSelectedIds(visibleUsers.map(u => u.id)); };
    const toggleSelectUser = (id) => { if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id)); else setSelectedIds([...selectedIds, id]); };
    const handleBulkSave = async () => { if (bulkValue === '') return; const batch = writeBatch(db); users.forEach(u => { if (selectedIds.includes(u.id) && u._docId) { const ref = doc(db, 'artifacts', appId, 'public', 'data', 'users', u._docId); if (bulkModal.type === 'department') batch.update(ref, { department: bulkValue }); if (bulkModal.type === 'quota') batch.update(ref, { yearlyAllowance: Number(bulkValue) }); } }); await batch.commit(); setBulkModal(null); setBulkValue(''); setSelectedIds([]); };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative pb-16">
            {importInfo && (<div className={`absolute top-0 left-0 right-0 p-2 text-center text-sm font-medium z-20 ${importInfo.isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{importInfo.message}</div>)}
            <div className="p-6 border-b border-gray-200 flex flex-wrap justify-between items-center bg-gray-50 gap-2">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Users className="w-5 h-5 text-gray-500" /> Все сотрудники</h3>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={downloadTemplate} className="bg-white border border-gray-300 text-gray-600 text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2" title="Скачать шаблон"><Download className="w-3 h-3" /> Шаблон</button>
                    <button onClick={handleExportSchedule} className="bg-white border border-gray-300 text-green-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-green-50 flex items-center gap-2" title="Экспорт графика (CSV)"><FileText className="w-3 h-3" /> Экспорт графика</button>
                    <button onClick={() => fileInputRef.current.click()} className="bg-white border border-gray-300 text-gray-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"><Upload className="w-3 h-3" /> Импорт</button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                    {!isAdding && <button onClick={() => setIsAdding(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2"><UserPlus className="w-3 h-3" /> Добавить</button>}
                </div>
            </div>
            
            {isAdding && (
                <div className="p-6 border-b border-gray-200 bg-indigo-50 animate-fadeIn">
                    <h4 className="font-bold text-gray-800 mb-4">{editingUser ? 'Редактирование сотрудника' : 'Новый сотрудник'}</h4>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="flex flex-col">
                            <label className="text-xs text-gray-500 font-semibold mb-1 uppercase">ФИО</label>
                            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="px-3 py-2 rounded border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs text-gray-500 font-semibold mb-1 uppercase">Отдел</label>
                            <select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="px-3 py-2 rounded border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white">{departments.map(d => <option key={d} value={d}>{d}</option>)}</select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs text-gray-500 font-semibold mb-1 uppercase">Роль</label>
                            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="px-3 py-2 rounded border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"><option value="employee">Сотрудник</option><option value="manager">Руководитель</option><option value="admin">Администратор</option></select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs text-gray-500 font-semibold mb-1 uppercase">Дата найма</label>
                            <input type="date" required value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})} className="px-3 py-2 rounded border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs text-gray-500 font-semibold mb-1 uppercase">Квота (дней/год)</label>
                            <input type="number" required value={formData.yearlyAllowance} onChange={e => setFormData({...formData, yearlyAllowance: Number(e.target.value)})} className="px-3 py-2 rounded border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs text-gray-500 font-semibold mb-1 uppercase">Остаток прошлых лет</label>
                            <input type="number" required value={formData.carryOverDays} onChange={e => setFormData({...formData, carryOverDays: Number(e.target.value)})} className="px-3 py-2 rounded border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="flex flex-col">
                             <label className="text-xs text-gray-500 font-semibold mb-1 uppercase">Пароль</label>
                             <div className="flex items-center border border-indigo-200 rounded px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-indigo-500">
                                <Key className="w-4 h-4 text-gray-400 mr-2" />
                                <input type="text" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full outline-none text-sm" />
                             </div>
                        </div>

                        <div className="flex gap-2 col-span-1 md:col-span-2 lg:col-span-3 justify-end items-end">
                            <button type="button" onClick={resetForm} className="px-4 py-2 bg-white text-gray-600 border rounded hover:bg-gray-50 transition-colors">Отмена</button>
                            <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">Сохранить</button>
                        </div>
                    </form>
                </div>
            )}
            
            <div className="overflow-auto max-h-96"><table className="w-full text-left text-sm"><thead className="bg-gray-50 sticky top-0"><tr><th className="p-3 w-8"><button onClick={toggleSelectAll} className="text-gray-400 hover:text-indigo-600">{allSelected ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5" />}</button></th><th>ФИО</th><th>Отдел</th><th>Квота / Остаток</th><th></th></tr></thead><tbody>
                {users.filter(u=>u.role!=='admin').map(u=>(<tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3"><button onClick={()=>toggleSelectUser(u.id)} className="text-gray-300 hover:text-indigo-500">{selectedIds.includes(u.id)?<CheckSquare className="w-5 h-5 text-indigo-600"/>:<Square className="w-5 h-5 text-gray-300"/>}</button></td>
                    <td className="p-3 font-medium text-gray-800">{u.name} <span className="text-xs text-gray-400">({u.role})</span></td>
                    <td className="p-3 text-gray-500">{u.department}</td>
                    <td className="p-3 text-center"><span className="font-bold text-gray-800">{u.yearlyAllowance}</span> / <span className="text-green-600">+{u.carryOverDays}</span></td>
                    <td className="p-3 text-right"><button onClick={() => handleEdit(u)} className="text-blue-500 p-1 hover:bg-blue-50 rounded"><Pencil className="w-3 h-3"/></button><button onClick={() => setConfirmDelete(u)} className="text-red-400 p-1 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3"/></button></td>
                </tr>))}
            </tbody></table></div>
            <div className="p-3 border-t border-gray-200 bg-gray-50"><button onClick={()=>setConfirmDeleteAll(true)} className="text-red-500 text-xs flex gap-1 items-center hover:text-red-700"><AlertTriangle className="w-3 h-3"/> Удалить ВСЕХ</button></div>

            {selectedIds.length > 0 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-20 animate-bounce-in">
                    <span className="text-sm font-medium whitespace-nowrap">Выбрано: {selectedIds.length}</span>
                    <div className="h-4 w-px bg-gray-700"></div>
                    <button onClick={() => setBulkModal({ type: 'department' })} className="text-xs hover:text-indigo-300 transition-colors flex items-center gap-1"><Briefcase className="w-3 h-3" /> Сменить отдел</button>
                    <button onClick={() => setBulkModal({ type: 'quota' })} className="text-xs hover:text-indigo-300 transition-colors flex items-center gap-1"><PieChart className="w-3 h-3" /> Изменить квоту</button>
                    <button onClick={() => setSelectedIds([])} className="ml-2 text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
            )}
             {/* Modals */}
             {bulkModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-gray-200">
                        <h4 className="font-bold text-gray-800 mb-4 text-center">{bulkModal.type === 'department' ? 'Смена отдела' : 'Изменение квоты отпуска'}</h4>
                        <p className="text-xs text-gray-500 mb-4 text-center">Для {selectedIds.length} выбранных сотрудников</p>
                        {bulkModal.type === 'department' ? (
                            <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="w-full mb-6 px-3 py-2 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                <option value="">-- Выберите отдел --</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        ) : (<input type="number" placeholder="Новая квота (дней)" value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="w-full mb-6 px-3 py-2 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500" />)}
                        <div className="flex gap-3"><button onClick={() => { setBulkModal(null); setBulkValue(''); }} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium">Отмена</button><button onClick={handleBulkSave} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Применить</button></div>
                    </div>
                </div>
            )}
            <ConfirmModal isOpen={!!confirmDelete} title="Удаление сотрудника" message={confirmDelete ? `Вы уверены, что хотите удалить сотрудника ${confirmDelete.name}? Это действие необратимо.` : ''} onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />
            <ConfirmModal isOpen={confirmDeleteAll} title="Удаление ВСЕХ сотрудников" message="ВНИМАНИЕ! Это действие удалит всех сотрудников (кроме админа)." confirmText="Удалить всех" onConfirm={handleDeleteAllUsers} onCancel={() => setConfirmDeleteAll(false)} />
        </div>
    );
};

const LoginScreen = ({ users, onSelectUser }) => {
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [passwordInput, setPasswordInput] = useState('');
    const [error, setError] = useState('');
    const [isAdminLogin, setIsAdminLogin] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const selectedUser = users.find(u => u.id === selectedUserId);
    
    // Filter users based on search and role
    const filteredUsers = users.filter(u => 
        u.role !== 'admin' && 
        u.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleLogin = (e) => {
        e.preventDefault();
        if (isAdminLogin) {
            const adminUser = users.find(u => u.role === 'admin');
            if (adminUser && adminUser.password === passwordInput) onSelectUser(adminUser);
            else setError('Неверный пароль администратора');
        } else {
            if (selectedUser && selectedUser.password === passwordInput) onSelectUser(selectedUser);
            else setError('Неверный пароль');
        }
    };

    const handleBack = () => { setSelectedUserId(null); setPasswordInput(''); setError(''); setIsAdminLogin(false); setSearchTerm(''); };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 relative">
                {!selectedUserId && !isAdminLogin && <button onClick={() => setIsAdminLogin(true)} className="absolute top-4 right-4 text-gray-300 hover:text-gray-500"><Lock className="w-4 h-4" /></button>}
                <div className="text-center mb-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${isAdminLogin ? 'bg-indigo-600 shadow-indigo-200' : 'bg-blue-600 shadow-blue-200'}`}>{isAdminLogin ? <Settings className="text-white w-8 h-8" /> : <Calendar className="text-white w-8 h-8" />}</div>
                    <h1 className="text-2xl font-bold text-gray-900">{isAdminLogin ? 'Панель управления' : 'График отпусков'}</h1>
                </div>
                {!selectedUserId && !isAdminLogin ? (
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Поиск по фамилии..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                            {filteredUsers.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Сотрудники не найдены</p>}
                            {filteredUsers.sort((a,b) => (a.role === 'manager' ? -1 : 1)).map(user => (
                                <button key={user.id} onClick={() => setSelectedUserId(user.id)} className={`w-full flex items-center p-3 rounded-xl border transition-all hover:shadow-sm text-left ${user.role === 'manager' ? 'border-emerald-100 bg-emerald-50 hover:border-emerald-500' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mr-4 ${user.role === 'manager' ? 'bg-emerald-200 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{user.avatar}</div>
                                    <div><div className="font-semibold text-gray-800">{user.name}</div><div className="text-xs text-gray-500">{user.role === 'manager' ? `Руководитель: ${user.department}` : user.department}</div></div>
                                    <ChevronRight className="w-5 h-5 ml-auto text-gray-300" />
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleLogin} className="animate-fadeIn">
                         <button type="button" onClick={handleBack} className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"><ArrowLeft className="w-4 h-4 mr-1" /> Назад</button>
                        {!isAdminLogin && <div className="flex items-center gap-3 mb-6 bg-gray-50 p-3 rounded-xl border border-gray-100"><div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-lg">{selectedUser.avatar}</div><div><div className="font-bold text-gray-800">{selectedUser.name}</div><div className="text-xs text-gray-500">{selectedUser.department}</div></div></div>}
                        {isAdminLogin && (<div className="mb-6 bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-center"><p className="text-sm text-indigo-800 font-medium">Введите пароль администратора</p></div>)}
                        <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-gray-400" /></div><input type="password" autoFocus value={passwordInput} onChange={(e) => { setPasswordInput(e.target.value); setError(''); }} className={`block w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${error ? 'border-red-300' : 'border-gray-300'}`} placeholder="Введите пароль" /></div>{error && <p className="mt-1 text-sm text-red-600">{error}</p>}</div>
                        <button className={`w-full text-white font-bold py-2 px-4 rounded-lg transition-colors ${isAdminLogin ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}`}>Войти</button>
                    </form>
                )}
            </div>
        </div>
    );
};

const App = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [vacations, setVacations] = useState([]);
    const [deptDocs, setDeptDocs] = useState([]);
    const [firebaseUser, setFirebaseUser] = useState(null);

    useEffect(() => {
        const initAuth = async () => {
            if (typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token) {
                try { await signInWithCustomToken(auth, window.__initial_auth_token); } catch { await signInAnonymously(auth); }
            } else await signInAnonymously(auth);
        };
        initAuth();
        return onAuthStateChanged(auth, setFirebaseUser);
    }, []);

    useEffect(() => {
        if(!firebaseUser) return;
        const eH = (e) => console.log("DB sync...", e);
        const uD = onSnapshot(collection(db,'artifacts',appId,'public','data','departments'), s => {
            const d = s.docs.map(doc=>({id:doc.id,...doc.data()}));
            if(!d.length) INITIAL_DEPARTMENTS_DATA.forEach(x=>addDoc(collection(db,'artifacts',appId,'public','data','departments'),x));
            else { setDeptDocs(d); setDepartments(d.map(x=>x.name)); }
        }, eH);
        const uU = onSnapshot(collection(db,'artifacts',appId,'public','data','users'), s => {
            const u = s.docs.map(doc=>({_docId:doc.id,...doc.data()}));
            if(!u.length) INITIAL_USERS_DATA.forEach(x=>addDoc(collection(db,'artifacts',appId,'public','data','users'),x));
            else setUsers(u);
        }, eH);
        const uV = onSnapshot(collection(db,'artifacts',appId,'public','data','vacations'), s => setVacations(s.docs.map(d=>({_docId:d.id,...d.data()}))), eH);
        return () => { uD(); uU(); uV(); };
    }, [firebaseUser]);

    const [calendarDate, setCalendarDate] = useState(new Date(2026, 0, 1)); 
    const [viewMode, setViewMode] = useState('month');
    const [editingVacation, setEditingVacation] = useState(null);
    const [showManagerStats, setShowManagerStats] = useState(false);
    const [deleteModal, setDeleteModal] = useState(null);

    const handleNavigation = (dir) => {
        const newDate = new Date(calendarDate);
        if (viewMode === 'year') {
            newDate.setFullYear(newDate.getFullYear() + dir);
        } else if (viewMode === 'quarter') {
            newDate.setMonth(newDate.getMonth() + (dir * 3));
        } else {
            newDate.setMonth(newDate.getMonth() + dir);
        }
        setCalendarDate(newDate);
    };
    
    const handleYearNav = (dir) => {
        const newDate = new Date(calendarDate);
        newDate.setFullYear(newDate.getFullYear() + dir);
        setCalendarDate(newDate);
    };

    const handleAddVacation = async (v) => { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'vacations'), { ...v, id: Date.now() }); };
    const handleUpdateVacation = async (v) => { const { _docId, ...data } = v; await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'vacations', v._docId), data); };
    const confirmDeleteVacation = async () => { 
        const v = vacations.find(x => x.id === deleteModal);
        if(v) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'vacations', v._docId));
        setDeleteModal(null);
    };

    if (!currentUser) return <LoginScreen users={users} onSelectUser={setCurrentUser} />;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12">
            <Header user={currentUser} onLogout={() => setCurrentUser(null)} />
            <main className="max-w-[1400px] mx-auto px-4 pt-8">
                {currentUser.role === 'admin' ? (
                    <div className="space-y-6">
                        <AdminStats users={users} vacations={vacations} departments={departments} />
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2"><UserManagement users={users} setUsers={()=>{}} departments={departments} vacations={vacations} /></div>
                            <div className="lg:col-span-1 space-y-6"><DepartmentManagement departments={departments} setDepartments={()=>{}} users={users} setUsers={()=>{}} deptDocs={deptDocs} /></div>
                        </div>
                    </div>
                ) : currentUser.role === 'manager' ? (
                    showManagerStats ? <ManagerAnalyticsPage department={currentUser.department} users={users} vacations={vacations} onBack={() => setShowManagerStats(false)} /> :
                    <div className="space-y-8">
                         <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                            <h2 className="text-lg font-bold text-emerald-900">Кабинет: {currentUser.department}</h2>
                            <button onClick={() => setShowManagerStats(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm"><BarChart2 className="w-4 h-4"/> Статистика</button>
                         </div>
                         <ManagerApprovals currentUser={currentUser} users={users} vacations={vacations} onUpdateVacation={handleUpdateVacation} />
                         
                         <UserView 
                            user={currentUser} 
                            users={users} 
                            vacs={vacations} 
                            onAdd={handleAddVacation} 
                            onUpdate={handleUpdateVacation} 
                            onDel={(id)=>setDeleteModal(id)} 
                            calendarProps={{
                                currentMonthDate: calendarDate, 
                                onPrev: () => handleNavigation(-1), 
                                onNext: () => handleNavigation(1), 
                                onPrevYear: () => handleYearNav(-1), 
                                onNextYear: () => handleYearNav(1), 
                                viewMode: viewMode, 
                                setViewMode: setViewMode, 
                                currentUser
                            }} 
                        />
                    </div>
                ) : (
                     <div className="space-y-8">
                        <UserView 
                            user={currentUser} 
                            users={users} 
                            vacs={vacations} 
                            onAdd={handleAddVacation} 
                            onUpdate={handleUpdateVacation} 
                            onDel={(id)=>setDeleteModal(id)} 
                            calendarProps={{
                                currentMonthDate: calendarDate, 
                                onPrev: () => handleNavigation(-1), 
                                onNext: () => handleNavigation(1), 
                                onPrevYear: () => handleYearNav(-1), 
                                onNextYear: () => handleYearNav(1), 
                                viewMode: viewMode, 
                                setViewMode: setViewMode, 
                                currentUser
                            }} 
                        />
                    </div>
                )}
                <ConfirmModal isOpen={!!deleteModal} title="Отмена" message="Удалить отпуск?" onConfirm={confirmDeleteVacation} onCancel={() => setDeleteModal(null)} />
            </main>
        </div>
    );
};

// Запуск приложения в браузере
const container = document.getElementById('root');
const root = createRoot(container);
root.render(React.createElement(App));


