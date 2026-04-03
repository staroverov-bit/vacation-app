import React, { useState, useMemo, useEffect, useRef, createContext, useContext } from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
import { 
  Calendar, Users, Briefcase, CheckCircle, AlertTriangle, LogOut, ChevronLeft, ChevronRight, 
  Plus, BarChart2, Maximize, LayoutGrid, Trash2, Pencil, Info, PieChart, Check, Settings, 
  UserPlus, X, ClipboardList, Lock, Key, ArrowLeft, ChevronDown, ChevronUp, UserCheck, 
  TrendingUp, AlertCircle, Upload, FileText, AlertOctagon, Download, Clock, XCircle, 
  Square, CheckSquare, Search, Save, Send, Loader2, Bell, History, RotateCcw, Mail
} from 'https://esm.sh/lucide-react@0.330.0';

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, writeBatch, setDoc } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

// --- CONFIGURATION ---
const rawConfig = typeof window.__firebase_config !== 'undefined' ? window.__firebase_config : (typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const firebaseConfig = typeof rawConfig === 'string' ? JSON.parse(rawConfig || '{}') : rawConfig;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : (typeof __app_id !== 'undefined' ? __app_id : 'default-app-id');

// --- CONSTANTS ---
const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_HOLIDAYS = {
    [CURRENT_YEAR]: ['01-01', '02-01', '03-01', '04-01', '05-01', '06-01', '07-01', '08-01', '23-02', '08-03', '01-05', '09-05', '12-06', '04-11'],
    [CURRENT_YEAR + 1]: ['01-01', '02-01', '03-01', '04-01', '05-01', '06-01', '07-01', '08-01', '23-02', '08-03', '01-05', '09-05', '12-06', '04-11'],
};
let GLOBAL_HOLIDAYS = { ...DEFAULT_HOLIDAYS }; 
const DEFAULT_AUTH_SETTINGS = { password: true, google: true, yandex: true };
const MONTHS_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const FULL_MONTHS = ['ЯНВАРЬ', 'ФЕВРАЛЬ', 'МАРТ', 'АПРЕЛЬ', 'МАЙ', 'ИЮНЬ', 'ИЮЛЬ', 'АВГУСТ', 'СЕНТЯБРЬ', 'ОКТЯБРЬ', 'НОЯБРЬ', 'ДЕКАБРЬ'];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const INITIAL_DEPARTMENTS_DATA = [{ name: 'IT Отдел' }, { name: 'Продажи' }, { name: 'Бухгалтерия' }, { name: 'HR' }, { name: 'Управление' }];
const INITIAL_USERS_DATA = [
  { id: 100, name: 'Стив Джобс', email: 'ceo@example.com', department: 'Управление', avatar: 'СД', role: 'ceo', yearlyAllowance: 28, carryOverDays: 0, hireDate: `${CURRENT_YEAR - 5}-01-01`, password: '123' },
  { id: 999, name: 'HR Администратор', email: 'admin@example.com', department: 'HR', avatar: 'AD', role: 'admin', yearlyAllowance: 0, carryOverDays: 0, hireDate: `${CURRENT_YEAR - 2}-01-01`, password: 'admin' }
];

// --- APP CONTEXT ---
const AppContext = createContext(null);
const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("useAppContext must be used within AppProvider");
    return context;
};

// --- PURE HELPERS ---
const isHoliday = (d, holidaysConfig = GLOBAL_HOLIDAYS) => {
    const year = d.getFullYear();
    const dateStr = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}`;
    return (holidaysConfig[year] || []).includes(dateStr);
};
const isWeekend = (d, holidaysConfig = GLOBAL_HOLIDAYS) => d.getDay() === 0 || d.getDay() === 6 || isHoliday(d, holidaysConfig);
const countBillableDays = (s, e, holidaysConfig = GLOBAL_HOLIDAYS) => {
  if (!s || !e) return 0;
  let c = 0, cur = new Date(s), end = new Date(e);
  while (cur <= end) { if (!isHoliday(cur, holidaysConfig)) c++; cur.setDate(cur.getDate() + 1); }
  return c;
};
const isSameDay = (d1, d2) => d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
const getApproverForUser = (user, users) => {
    if (!user || !users) return null;
    if (user.role === 'admin' || user.role === 'ceo') return null; 
    if (user.role === 'manager') return users.find(u => u.role === 'ceo') || users.find(u => u.role === 'admin');
    const deptManager = users.find(u => u.department === user.department && u.role === 'manager');
    return deptManager || users.find(u => u.role === 'ceo') || users.find(u => u.role === 'admin');
};

// --- COMPONENTS ---
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Удалить", isDanger = true }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-gray-200 animate-fadeIn">
        <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">{isDanger && <AlertTriangle className="w-5 h-5 text-red-500" />}{title}</h3>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors">Отмена</button>
          <button onClick={onConfirm} className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

const Header = ({ onLogout }) => {
  const { currentUser: user, vacations, users } = useAppContext();
  const [showNotifs, setShowNotifs] = useState(false);
  const [activePopups, setActivePopups] = useState([]);
  const notifRef = useRef(null);
  const shownNotifsRef = useRef(new Set()); 

  useEffect(() => {
      const handleClickOutside = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false); };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const notifications = useMemo(() => {
      if (!user || !vacations || !users) return [];
      const notifs = [];
      const today = new Date(); today.setHours(0,0,0,0);
      const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
      const isSubordinate = (reqUser) => {
          if (!reqUser || reqUser.id === user.id) return false;
          if (user.role === 'ceo') return reqUser.role === 'manager' || (reqUser.role === 'employee' && !users.some(u => u.department === reqUser.department && u.role === 'manager'));
          if (user.role === 'manager') return reqUser.department === user.department && reqUser.role === 'employee';
          return false;
      };
      vacations.forEach(v => {
          if (v.status !== 'approved') return;
          const startDate = new Date(v.startDate); startDate.setHours(0,0,0,0);
          if (startDate >= today && startDate <= nextWeek) {
              const diffDays = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
              const daysText = diffDays === 0 ? 'сегодня' : diffDays === 1 ? 'завтра' : `через ${diffDays} дн.`;
              if (v.userId === user.id) {
                  notifs.push({ id: `self-${v._docId || v.id}`, title: 'Ваш отпуск', message: `Начинается ${daysText} (${new Date(v.startDate).toLocaleDateString()})`, type: 'self', date: startDate });
              } else {
                  const reqUser = users.find(u => u.id === v.userId);
                  if (isSubordinate(reqUser)) notifs.push({ id: `sub-${v._docId || v.id}`, title: `Отпуск: ${reqUser.name}`, message: `Начинается ${daysText} (${new Date(v.startDate).toLocaleDateString()})`, type: 'subordinate', date: startDate });
              }
          }
      });
      return notifs.sort((a, b) => a.date - b.date);
  }, [user, vacations, users]);

  useEffect(() => {
      if (notifications.length > 0) {
          const newPopups = notifications.filter(n => !shownNotifsRef.current.has(n.id));
          if (newPopups.length > 0) {
              newPopups.forEach(n => shownNotifsRef.current.add(n.id));
              setActivePopups(prev => [...prev, ...newPopups]);
              newPopups.forEach(n => setTimeout(() => setActivePopups(prev => prev.filter(p => p.id !== n.id)), 6000));
          }
      }
  }, [notifications]);

  useEffect(() => {
      const handleCustomToast = (e) => {
          const newPopup = { id: Date.now() + Math.random().toString(), ...e.detail };
          setActivePopups(prev => [...prev, newPopup]);
          setTimeout(() => setActivePopups(prev => prev.filter(p => p.id !== newPopup.id)), 6000);
      };
      window.addEventListener('app-toast', handleCustomToast);
      return () => window.removeEventListener('app-toast', handleCustomToast);
  }, []);

  if (!user) return null;
  let roleIcon = <Calendar className="text-white w-6 h-6" />;
  let headerBg = 'bg-blue-600', badgeBg = 'bg-blue-100 text-blue-700';
  if (user.role === 'admin') { roleIcon = <Settings className="text-white w-6 h-6" />; headerBg = 'bg-indigo-600'; badgeBg = 'bg-indigo-100 text-indigo-700'; }
  else if (user.role === 'manager') { roleIcon = <Briefcase className="text-white w-6 h-6" />; headerBg = 'bg-emerald-600'; badgeBg = 'bg-emerald-100 text-emerald-700'; }
  else if (user.role === 'ceo') { roleIcon = <Users className="text-white w-6 h-6" />; headerBg = 'bg-purple-600'; badgeBg = 'bg-purple-100 text-purple-700'; }

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2"><div className={`${headerBg} p-2 rounded-lg transition-colors`}>{roleIcon}</div><h1 className="text-xl font-bold text-gray-800">{user.role === 'admin' ? 'HR Панель' : 'Отпускной Трекер'}</h1></div>
        <div className="flex items-center gap-4">
          {user.role !== 'admin' && (
              <div className="relative" ref={notifRef}>
                  <button onClick={() => setShowNotifs(!showNotifs)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative"><Bell className="w-5 h-5" />{notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}</button>
                  {showNotifs && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 animate-fadeIn">
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center"><h3 className="font-bold text-gray-800 text-sm">Уведомления</h3><span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{notifications.length}</span></div>
                          <div className="max-h-80 overflow-y-auto">
                              {notifications.length === 0 ? <div className="p-4 text-center text-sm text-gray-500">Нет ближайших отпусков</div> : (
                                  <div className="divide-y divide-gray-50">{notifications.map(n => (<div key={n.id} className="p-4 hover:bg-gray-50 transition-colors flex gap-3 items-start"><div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.type === 'self' ? 'bg-blue-500' : 'bg-orange-400'}`}></div><div><p className="text-xs font-bold text-gray-800">{n.title}</p><p className="text-sm text-gray-600 leading-snug">{n.message}</p></div></div>))}</div>
                              )}
                          </div>
                      </div>
                  )}
              </div>
          )}
          <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200"><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${badgeBg}`}>{user.avatar}</div><div className="flex flex-col"><span className="text-sm font-semibold text-gray-700">{user.name}</span><span className="text-xs text-gray-500">{user.department}</span></div></div>
          <button onClick={onLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"><span className="text-sm font-medium">Выйти</span><LogOut className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
          {activePopups.map(p => (
              <div key={`popup-${p.id}`} className="bg-white border border-gray-100 shadow-2xl rounded-xl p-4 flex items-start gap-3 w-80 pointer-events-auto animate-fadeIn relative"><div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm ${p.type === 'self' ? 'bg-blue-500' : p.type === 'email' ? 'bg-green-500' : 'bg-orange-400'}`}></div><div className="flex-1"><h4 className="text-sm font-bold text-gray-800 mb-0.5">{p.title}</h4><p className="text-xs text-gray-600 leading-snug">{p.message}</p></div><button onClick={() => setActivePopups(prev => prev.filter(x => x.id !== p.id))} className="text-gray-400 hover:text-gray-800 transition-colors p-1 hover:bg-gray-100 rounded-md"><X className="w-4 h-4" /></button></div>
          ))}
      </div>
    </>
  );
};

const BalanceCard = () => {
    const { currentUser: user, vacations, holidays } = useAppContext();
    const stats = useMemo(() => {
        const totalAllowance = Number(user.yearlyAllowance) + Number(user.carryOverDays);
        let usedDays = 0, pendingDays = 0, draftDays = 0;
        vacations.filter(v => v.userId === user.id).forEach(v => {
            const days = countBillableDays(v.startDate, v.endDate, holidays);
            if (v.status === 'approved') usedDays += days;
            else if (v.status === 'pending') pendingDays += days;
            else if (v.status === 'draft') draftDays += days;
        });
        return { totalAllowance, usedDays, pendingDays, draftDays, remainingDays: totalAllowance - usedDays - pendingDays - draftDays };
    }, [user, vacations, holidays]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide"><PieChart className="w-4 h-4 text-gray-500" /> Мой Баланс</h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg text-center"><div className="text-xs text-blue-600 font-medium mb-1">Всего</div><div className="text-xl font-bold text-blue-800">{stats.totalAllowance}</div></div>
                <div className="bg-green-50 p-3 rounded-lg text-center"><div className="text-xs text-green-600 font-medium mb-1">Одобрено</div><div className="text-xl font-bold text-green-800">{stats.usedDays}</div></div>
                <div className={`p-3 rounded-lg text-center ${stats.remainingDays < 0 ? 'bg-red-50' : 'bg-gray-100'}`}><div className={`text-xs font-medium mb-1 ${stats.remainingDays < 0 ? 'text-red-600' : 'text-gray-600'}`}>Остаток</div><div className={`text-xl font-bold ${stats.remainingDays < 0 ? 'text-red-800' : 'text-gray-800'}`}>{stats.remainingDays}</div></div>
            </div>
            {stats.pendingDays > 0 && <div className="mb-2 bg-orange-50 border border-orange-100 rounded-lg p-2 flex items-center justify-center gap-2 text-xs text-orange-700"><Clock className="w-3 h-3" /> На согласовании: <b>{stats.pendingDays}</b> дн.</div>}
            {stats.draftDays > 0 && <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-2 flex items-center justify-center gap-2 text-xs text-gray-600"><FileText className="w-3 h-3" /> В черновиках: <b>{stats.draftDays}</b> дн.</div>}
        </div>
    );
};

const PersonalYearCalendar = ({ year, onSelectRange, selection, balance, onPrevYear, onNextYear }) => {
    const { currentUser: user, vacations, users, holidays } = useAppContext();
    const [tooltip, setTooltip] = useState(null);

    const renderMonth = (monthIndex) => {
        const date = new Date(year, monthIndex, 1);
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        const startDay = (date.getDay() + 6) % 7; 
        const days = [];
        const teamIds = user.role === 'ceo' ? users.filter(u => u.id !== user.id && (u.role === 'manager' || (u.role === 'employee' && !users.some(other => other.department === u.department && other.role === 'manager')))).map(u => u.id) : users.filter(u => u.department === user.department && u.id !== user.id).map(u => u.id);

        for (let i = 0; i < startDay; i++) days.push(<div key={`e-${i}`} className="w-8 h-8"></div>);
        for (let d = 1; d <= daysInMonth; d++) {
            const current = new Date(year, monthIndex, d);
            const isWe = isWeekend(current, holidays);
            const vac = vacations.find(v => v.userId === user.id && current >= new Date(v.startDate).setHours(0,0,0,0) && current <= new Date(v.endDate).setHours(0,0,0,0) && v.status !== 'rejected');
            const teamVacs = vacations.filter(v => teamIds.includes(v.userId) && current >= new Date(v.startDate).setHours(0,0,0,0) && current <= new Date(v.endDate).setHours(0,0,0,0) && v.status !== 'rejected');
            
            let bgClass = isWe ? "text-red-500" : "text-gray-700", cellClass = "hover:bg-gray-100 cursor-pointer relative", indicator = null;
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
            if ((vac || (selection.start && current >= selection.start && current <= (selection.end || selection.start))) && teamVacs.length > 0) indicator = <div className="absolute bottom-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm"></div>;

            const buildTooltip = () => {
                let lines = [];
                if (vac) lines.push(`Я: ${vac.status === 'approved' ? 'Согласовано' : vac.status === 'pending' ? 'На согласовании' : 'Черновик'}`);
                if (teamVacs.length > 0) {
                    if (vac) lines.push('---');
                    teamVacs.forEach(v => { const u = users.find(u => u.id === v.userId); if (u) lines.push(`${u.name}: ${v.status === 'approved' ? 'Согласовано' : v.status === 'pending' ? 'Ждет' : 'Черновик'}`); });
                }
                return lines.length > 0 ? lines.join('\n') : null;
            };
            const tooltipText = buildTooltip();

            days.push(<div key={`d-${monthIndex}-${d}`} onClick={() => onSelectRange(current)} onMouseEnter={(e) => { if (tooltipText) { const rect = e.target.getBoundingClientRect(); setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 5, text: tooltipText }); } }} onMouseLeave={() => setTooltip(null)} className={`w-8 h-8 flex items-center justify-center text-sm rounded-full transition-colors ${bgClass} ${cellClass}`}>{d}{indicator}</div>);
        }
        return <div key={`m-${monthIndex}`} className="mb-6"><h4 className="font-bold text-gray-800 mb-2 pl-2">{FULL_MONTHS[monthIndex]}</h4><div className="grid grid-cols-7 gap-1 text-center">{WEEKDAYS.map(w => <div key={`wd-${w}`} className="text-xs text-gray-400 font-medium w-8">{w}</div>)}{days}</div></div>;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative">
            {tooltip && (<div className="fixed z-50 bg-gray-800 text-white text-xs p-2 rounded shadow-lg pointer-events-none whitespace-pre-line" style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}>{tooltip.text}</div>)}
            <div className="flex justify-between items-center mb-6"><div className="flex items-center gap-4"><button onClick={onPrevYear} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft className="w-5 h-5"/></button><span className="text-xl font-bold text-gray-900">{year}</span><button onClick={onNextYear} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight className="w-5 h-5"/></button></div><div className="flex items-center gap-3"><div className="text-sm text-gray-500 mr-4">Доступно: <span className="font-bold text-blue-600">{balance}</span> дн. {selection.count > 0 && <span className="ml-2 text-indigo-600">(Выбрано: {selection.count})</span>}</div></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">{Array.from({length: 12}, (_, i) => renderMonth(i))}</div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-600"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600"></div>Ваш (Одобрен)</div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400"></div>Ваш (Ждет)</div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-400"></div>Ваш (Черновик)</div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-cyan-100 border border-cyan-200"></div>Коллега (Одобрен)</div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-100 border border-orange-200"></div>Коллега (Ждет)</div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border border-dashed border-gray-400 bg-gray-50"></div>Коллега (Черновик)</div><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div>Пересечение</div></div>
        </div>
    );
};
const UserView = ({ onAdd, onUpdate, onDel, calendarProps }) => {
    const { currentUser: user, users, vacations: vacs, holidays, logAction } = useAppContext();
    const [sel, setSel] = useState({ start: null, end: null, count: 0 });
    const [replacementId, setReplacementId] = useState('');
    const [isSendingDrafts, setIsSendingDrafts] = useState(false);
    
    const draftCount = vacs.filter(v => v.userId === user.id && v.status === 'draft').length;
    const totalAllowance = Number(user.yearlyAllowance) + Number(user.carryOverDays);
    const usedDays = vacs.filter(v => v.userId === user.id && v.status !== 'rejected' && v.status !== 'draft').reduce((acc, v) => acc + countBillableDays(v.startDate, v.endDate, holidays), 0);
    const remainingDays = totalAllowance - usedDays;

    const potentialReplacements = useMemo(() => {
        if (user.role === 'ceo') return users.filter(u => u.id !== user.id && u.role === 'manager');
        return users.filter(u => u.department === user.department && u.id !== user.id);
    }, [users, user]);

    const handleSelect = (date) => {
        if (!sel.start || (sel.start && sel.end)) { setSel({ start: date, end: null, count: 0 }); } 
        else { let s = sel.start, e = date; if (date < s) { s = date; e = sel.start; } const days = countBillableDays(s, e, holidays); setSel({ start: s, end: e, count: days }); }
    };
    
    const triggerMailto = (approver, datesStr) => {
        if (!approver || !approver.email) return;
        const subjectText = `Заявка на отпуск от ${user.name}`;
        const bodyText = `Здравствуйте, ${approver.name}!\r\n\r\nПрошу согласовать мой отпуск на следующие даты:\r\n${datesStr}\r\n\r\nС уважением,\r\n${user.name}`;
        const mailtoUrl = `mailto:${approver.email}?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`;
        const link = document.createElement('a'); link.setAttribute('href', mailtoUrl); link.setAttribute('target', '_blank'); document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const handleAction = async (status) => {
        if (!sel.start || !sel.end) return;
        if (sel.count > remainingDays) return alert(`Ошибка: Выбрано ${sel.count} дн., а доступно всего ${remainingDays}`);
        let finalStatus = status;
        if (status === 'pending' && (user.role === 'admin' || user.role === 'ceo')) finalStatus = 'approved';
        const payload = { userId: user.id, startDate: sel.start.toLocaleDateString('en-CA'), endDate: sel.end.toLocaleDateString('en-CA'), status: finalStatus, replacementId: replacementId ? Number(replacementId) : null };
        try {
            await onAdd(payload);
            if (finalStatus === 'pending') { const approver = getApproverForUser(user, users); triggerMailto(approver, `- с ${sel.start.toLocaleDateString()} по ${sel.end.toLocaleDateString()}`); }
            setSel({ start: null, end: null, count: 0 }); setReplacementId('');
        } catch (e) { console.error(e); alert('Произошла ошибка при сохранении заявки.'); }
    };

    const sendAllDrafts = () => {
        const drafts = vacs.filter(v => v.userId === user.id && v.status === 'draft');
        if (!drafts.length) return;
        const totalDraftDays = drafts.reduce((acc, d) => acc + countBillableDays(d.startDate, d.endDate, holidays), 0);
        if (totalDraftDays > remainingDays) return alert(`Ошибка: Черновики содержат ${totalDraftDays} дн., а доступно ${remainingDays}. Нельзя отправить.`);
        setIsSendingDrafts(true);
    };

    const confirmSend = async () => {
        const drafts = vacs.filter(v => v.userId === user.id && v.status === 'draft');
        const finalStatus = (user.role === 'admin' || user.role === 'ceo') ? 'approved' : 'pending';
        try {
            await Promise.all(drafts.map(d => onUpdate({ ...d, status: finalStatus })));
            if (finalStatus === 'pending') {
                const approver = getApproverForUser(user, users);
                const datesStr = drafts.map(d => `- с ${new Date(d.startDate).toLocaleDateString()} по ${new Date(d.endDate).toLocaleDateString()}`).join('\r\n');
                triggerMailto(approver, datesStr);
            }
        } catch (e) { console.error(e); alert('Произошла ошибка при отправке заявок.'); }
        setIsSendingDrafts(false);
    };

    const myApprover = getApproverForUser(user, users);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-6">
                <BalanceCard />
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-blue-600"/>Параметры новой заявки</h3>
                    <div className="mb-4 text-sm text-gray-600">{sel.start && sel.end ? (<div><span className="block font-medium">Даты:</span> {sel.start.toLocaleDateString()} — {sel.end.toLocaleDateString()} <span className="ml-2 font-bold text-blue-600">({sel.count} дн.)</span></div>) : (<span className="italic text-gray-400">Выберите даты на календаре...</span>)}</div>
                    <div className="mb-4"><label className="block text-xs font-medium text-gray-500 mb-1">Заместитель</label><div className="relative"><select value={replacementId} onChange={(e) => setReplacementId(e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none focus:border-blue-500 appearance-none bg-white text-sm"><option value="">-- Не выбран --</option>{potentialReplacements.map(u => (<option key={u._docId || u.id} value={u.id}>{u.name}</option>))}</select><UserCheck className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" /></div></div>
                    <div className="flex flex-col gap-2">
                         <button onClick={() => handleAction('draft')} disabled={!sel.start || !sel.end} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"><FileText className="w-4 h-4"/> Сохранить черновик</button>
                         <button onClick={() => handleAction('pending')} disabled={!sel.start || !sel.end} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"><Send className="w-4 h-4"/> На согласование</button>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex-grow">
                     <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-800 flex items-center gap-2"><ClipboardList className="w-5 h-5 text-gray-500"/>Черновики</h3>{draftCount > 0 && (<button onClick={sendAllDrafts} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded text-xs hover:bg-blue-100 font-medium transition-colors"><Send className="w-3 h-3"/> Отправить все</button>)}</div>
                    <div className="space-y-2">
                        {vacs.filter(v=>v.userId===user.id).length === 0 && <p className="text-sm text-gray-400 italic">Пока нет запланированных отпусков</p>}
                        {vacs.filter(v=>v.userId===user.id).sort((a,b)=>new Date(a.startDate)-new Date(b.startDate)).map(v=>(
                            <div key={v._docId || v.id} className="flex justify-between items-start text-sm border-b border-gray-100 pb-3 last:border-0 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                                <div>
                                    <div className="font-medium text-gray-800">{new Date(v.startDate).toLocaleDateString()} — {new Date(v.endDate).toLocaleDateString()}</div>
                                    <div className="text-xs text-gray-500 mt-1">{countBillableDays(v.startDate, v.endDate, holidays)} дн.</div>
                                    <div className={`text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${v.status==='approved'?'bg-green-100 text-green-700': v.status==='rejected'?'bg-red-100 text-red-700': v.status==='draft'?'bg-gray-100 text-gray-700 border border-gray-200': 'bg-amber-100 text-amber-700'}`}>
                                        {v.status === 'pending' ? 'На согласовании' : v.status === 'approved' ? 'Согласовано' : v.status === 'draft' ? 'Черновик' : 'Отклонено'}
                                        {v.status === 'pending' && myApprover?.email && (<button onClick={(e) => { e.stopPropagation(); triggerMailto(myApprover, `- с ${new Date(v.startDate).toLocaleDateString()} по ${new Date(v.endDate).toLocaleDateString()}`); }} className="ml-1 text-amber-600 hover:text-amber-800 transition-colors bg-amber-200/50 p-1 rounded-full" title={`Напомнить руководителю (${myApprover.name})`}><Mail className="w-3 h-3" /></button>)}
                                    </div>
                                    {v.replacementId && <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><UserCheck className="w-3 h-3"/> Зам: {users.find(u=>u.id===v.replacementId)?.name}</div>}
                                </div>
                                {<button onClick={()=>onDel(v.id)} className="text-gray-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors" title="Удалить"><Trash2 className="w-4 h-4"/></button>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="md:col-span-2 space-y-8">
                 <PersonalYearCalendar year={calendarProps.currentMonthDate.getFullYear()} onSelectRange={handleSelect} selection={sel} balance={remainingDays} onPrevYear={() => calendarProps.onPrevYear()} onNextYear={() => calendarProps.onNextYear()} />
                 <div className="mt-8"><h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Users className="w-6 h-6"/> График отдела</h2><TeamCalendar localDraft={sel} {...calendarProps} /></div>
            </div>
            <ConfirmModal isOpen={isSendingDrafts} title="Отправка черновиков" message={`Отправить все черновики (${draftCount}) на согласование?`} confirmText="Отправить" isDanger={false} onConfirm={confirmSend} onCancel={() => setIsSendingDrafts(false)} />
        </div>
    );
};

const ManagerApprovals = ({ onUpdateVacation }) => {
    const { currentUser, users, vacations, holidays, logAction } = useAppContext();
    const [rejectModal, setRejectModal] = useState(null);

    const pendingRequests = useMemo(() => {
        return vacations.filter(v => {
            const reqUser = users.find(u => u.id === v.userId);
            if (v.status !== 'pending' || !reqUser || reqUser.id === currentUser.id) return false;
            if (currentUser.role === 'ceo') return reqUser.role === 'manager' || (reqUser.role === 'employee' && !users.some(u => u.department === reqUser.department && u.role === 'manager'));
            if (currentUser.role === 'manager') return reqUser.department === currentUser.department && reqUser.role === 'employee';
            return false;
        }).map(v => ({ ...v, user: users.find(u => u.id === v.userId) }));
    }, [vacations, users, currentUser]);

    const handleApprove = (vacation) => { onUpdateVacation({ ...vacation, status: 'approved' }); logAction('APPROVE_VACATION', `Согласован отпуск сотрудника ${vacation.user.name}`, vacation.id, vacation, { ...vacation, status: 'approved' }); };
    const confirmReject = () => { if (rejectModal) { onUpdateVacation({ ...rejectModal, status: 'rejected' }); logAction('REJECT_VACATION', `Отклонен отпуск сотрудника ${rejectModal.user?.name}`, rejectModal.id, rejectModal, { ...rejectModal, status: 'rejected' }); setRejectModal(null); } };

    if (pendingRequests.length === 0) return null;
    return (
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden mb-6 animate-fadeIn">
            <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex items-center justify-between"><h3 className="font-bold text-orange-800 flex items-center gap-2"><Clock className="w-5 h-5" /> Заявки на согласование ({pendingRequests.length})</h3></div>
            <div className="divide-y divide-gray-100">
                {pendingRequests.map(req => (
                    <div key={req._docId || req.id} className="p-4 flex items-center justify-between hover:bg-orange-50/30 transition-colors">
                        <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-sm">{req.user.avatar}</div><div><div className="font-semibold text-gray-800">{req.user.name}</div><div className="text-sm text-gray-500">{new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate).toLocaleDateString()} <span className="ml-1 font-medium text-indigo-600">({countBillableDays(req.startDate, req.endDate, holidays)} дн.)</span></div></div></div>
                        <div className="flex gap-2"><button onClick={() => handleApprove(req)} className="flex items-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"><Check className="w-4 h-4" /> Согласовать</button><button onClick={() => setRejectModal(req)} className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"><X className="w-4 h-4" /> Отклонить</button></div>
                    </div>
                ))}
            </div>
            <ConfirmModal isOpen={!!rejectModal} title="Отклонение" message={`Отклонить заявку сотрудника?`} confirmText="Отклонить" isDanger={true} onConfirm={confirmReject} onCancel={() => setRejectModal(null)} />
        </div>
    );
};

const ManagerAnalyticsPage = ({ onBack }) => {
    const { currentUser, users, vacations, holidays } = useAppContext();
    const department = currentUser.department;
    const deptUsers = users.filter(u => u.department === department);
    const deptVacations = vacations.filter(v => deptUsers.find(u => u.id === v.userId) && v.status === 'approved'); 
    const monthCounts = Array(12).fill(0);
    deptVacations.forEach(v => { monthCounts[new Date(v.startDate).getMonth()]++; });
    const maxMonthIndex = monthCounts.indexOf(Math.max(...monthCounts));
    const peakMonth = new Date(CURRENT_YEAR, maxMonthIndex).toLocaleString('ru-RU', { month: 'long' });
    const usersWithVacation = new Set(deptVacations.map(v => v.userId));
    const burnoutRiskUsers = deptUsers.filter(u => !usersWithVacation.has(u.id));
    const totalUsers = deptUsers.length;
    const totalDaysPlanned = deptVacations.reduce((acc, v) => acc + countBillableDays(v.startDate, v.endDate, holidays), 0);

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-4"><button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm"><ArrowLeft className="w-4 h-4" /> Назад к графику</button><h2 className="text-2xl font-bold text-gray-800">Аналитика отдела "{department}"</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"><div className="flex items-center justify-between mb-4"><h3 className="text-gray-500 font-medium text-sm">Всего сотрудников</h3><Users className="w-5 h-5 text-emerald-500" /></div><div className="text-3xl font-bold text-gray-800">{totalUsers}</div></div><div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"><div className="flex items-center justify-between mb-4"><h3 className="text-gray-500 font-medium text-sm">Самый нагруженный месяц</h3><TrendingUp className="w-5 h-5 text-amber-500" /></div><div className="text-3xl font-bold text-gray-800 capitalize">{peakMonth}</div></div><div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"><div className="flex items-center justify-between mb-4"><h3 className="text-gray-500 font-medium text-sm">Использовано дней (Согл.)</h3><PieChart className="w-5 h-5 text-blue-500" /></div><div className="text-3xl font-bold text-gray-800">{totalDaysPlanned}</div></div></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"><h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-red-500" />Зона внимания: Риск выгорания</h3>{burnoutRiskUsers.length > 0 ? (<div className="bg-red-50 border border-red-100 rounded-lg p-4"><p className="text-sm text-red-800 mb-2">Следующие сотрудники еще не запланировали отпуск в {CURRENT_YEAR} году:</p><div className="flex flex-wrap gap-2">{burnoutRiskUsers.map(u => (<span key={u._docId || u.id} className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full text-sm border border-red-200 text-gray-700"><div className="w-5 h-5 rounded-full bg-red-100 text-[10px] flex items-center justify-center font-bold text-red-600">{u.avatar}</div>{u.name}</span>))}</div></div>) : (<div className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-center gap-2 text-green-700"><CheckCircle className="w-5 h-5" />Все сотрудники отдела запланировали отдых.</div>)}</div>
        </div>
    );
};

const AdminStats = () => {
    const { users, vacations, holidays } = useAppContext();
    const totalUsers = users.filter(u => u.role !== 'admin').length;
    const totalVacationDays = vacations.filter(v => v.status === 'approved').reduce((acc, v) => acc + countBillableDays(v.startDate, v.endDate, holidays), 0);
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center"><div><div className="text-gray-500 text-sm">Сотрудников</div><div className="text-3xl font-bold">{totalUsers}</div></div><Users className="w-8 h-8 text-blue-500 opacity-20"/></div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center"><div><div className="text-gray-500 text-sm">Дней отпуска (Согл.)</div><div className="text-3xl font-bold">{totalVacationDays}</div></div><Calendar className="w-8 h-8 text-green-500 opacity-20"/></div>
        </div>
    );
};

const AuditLogViewer = () => {
    const { auditLogs, logAction } = useAppContext();
    const [restoreModal, setRestoreModal] = useState(null);

    const confirmRestore = async () => {
        const log = restoreModal;
        if (!log) return;
        try {
            let collectionName = '', typeName = '';
            if (log.type.includes('USER')) { collectionName = 'users'; typeName = 'RESTORE_USER'; }
            else if (log.type.includes('VACATION')) { collectionName = 'vacations'; typeName = 'RESTORE_VACATION'; }
            else if (log.type.includes('DEPT')) { collectionName = 'departments'; typeName = 'RESTORE_DEPT'; }
            else throw new Error("Этот тип действий не поддерживает автоматическое восстановление.");

            if (log.type.includes('ADD') || log.type.includes('CREATE')) {
                const docId = log.newData?._docId || log.targetId;
                if (!docId) throw new Error("ID документа не найден.");
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, docId));
                logAction(typeName, `Отменено добавление: ${log.details}`);
            } else {
                if (!log.previousData || !log.previousData._docId) throw new Error("Невозможно восстановить: нет данных предыдущего состояния.");
                const { _docId, ...dataToRestore } = log.previousData;
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, _docId), dataToRestore);
                logAction(typeName, `Восстановлены данные из лога: ${log.details}`);
            }
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { title: 'Успех', message: 'Действие успешно отменено.', type: 'self' } }));
        } catch (e) { window.dispatchEvent(new CustomEvent('app-toast', { detail: { title: 'Ошибка', message: e.message, type: 'subordinate' } })); } 
        finally { setRestoreModal(null); }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
            <div className="p-6 border-b border-gray-200 bg-gray-50"><h3 className="font-bold text-gray-800 flex items-center gap-2"><History className="w-5 h-5 text-gray-500" /> Журнал действий (Бэклог)</h3><p className="text-xs text-gray-500 mt-1">История изменений системы. Поддерживается возврат (отмена) для удаленных или измененных данных.</p></div>
            <div className="overflow-auto max-h-96">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 sticky top-0 shadow-sm z-10"><tr><th className="p-3 w-40 text-gray-600 font-semibold text-xs uppercase">Дата / Время</th><th className="p-3 w-48 text-gray-600 font-semibold text-xs uppercase">Пользователь</th><th className="p-3 w-40 text-gray-600 font-semibold text-xs uppercase">Тип действия</th><th className="p-3 text-gray-600 font-semibold text-xs uppercase">Детали</th><th className="p-3 w-24 text-right text-gray-600 font-semibold text-xs uppercase">Откат</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                        {auditLogs.length === 0 && (<tr><td colSpan="5" className="p-8 text-center text-gray-400">Журнал пуст</td></tr>)}
                        {auditLogs.map(log => {
                            const date = new Date(log.timestamp);
                            const isDestructive = log.type.includes('DELETE') || log.type.includes('EDIT') || log.type.includes('REJECT');
                            const canRestore = (!!log.previousData || log.type.includes('ADD') || log.type.includes('CREATE')) && (log.type.includes('USER') || log.type.includes('DEPT') || log.type.includes('VACATION'));
                            return (
                                <tr key={log._docId} className={`hover:bg-gray-50 transition-colors ${log.reverted ? 'opacity-50' : ''}`}>
                                    <td className="p-3 text-gray-500 text-xs">{date.toLocaleDateString()} <span className="font-medium">{date.toLocaleTimeString()}</span></td>
                                    <td className="p-3 font-medium text-gray-700">{log.userName}</td>
                                    <td className="p-3"><span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${log.type.includes('DELETE') ? 'bg-red-100 text-red-700' : (log.type.includes('ADD') || log.type.includes('CREATE')) ? 'bg-green-100 text-green-700' : log.type.includes('RESTORE') ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{log.type}</span></td>
                                    <td className={`p-3 ${isDestructive ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{log.details}</td>
                                    <td className="p-3 text-right">{log.reverted ? (<span className="text-xs text-gray-400 flex items-center justify-end gap-1"><CheckCircle className="w-3 h-3"/> Отменено</span>) : canRestore ? (<button onClick={() => setRestoreModal(log)} className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded text-xs flex items-center justify-end gap-1 ml-auto transition-colors" title="Отменить действие"><RotateCcw className="w-3 h-3" /> Возврат</button>) : null}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <ConfirmModal isOpen={!!restoreModal} title="Отмена действия" message={restoreModal ? `Вы уверены, что хотите отменить действие:\n"${restoreModal.details}"?` : ''} confirmText="Отменить действие" isDanger={false} onConfirm={confirmRestore} onCancel={() => setRestoreModal(null)} />
        </div>
    );
};

const HolidayManagement = () => {
    const { holidays, logAction } = useAppContext();
    const [inputText, setInputText] = useState('');
    const [parsed, setParsed] = useState([]);
    const [holidayToDelete, setHolidayToDelete] = useState(null);
    const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

    const parseHolidays = (text) => {
        const monthMap = { января: '01', февраля: '02', марта: '03', апреля: '04', мая: '05', июня: '06', июля: '07', августа: '08', сентября: '09', октября: '10', ноября: '11', декабря: '12' };
        const holidaysSet = new Set();
        const textRegex = /((?:\d{1,2}[,\sи]*)+)(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)/gi;
        let match;
        while ((match = textRegex.exec(text)) !== null) {
            const daysStr = match[1], monthStr = match[2].toLowerCase(), monthNum = monthMap[monthStr], days = daysStr.match(/\d{1,2}/g);
            if (days && monthNum) days.forEach(d => holidaysSet.add(`${String(d).padStart(2, '0')}-${monthNum}`));
        }
        const numRegex = /\b(\d{1,2})\.(\d{1,2})\b/g;
        while ((match = numRegex.exec(text)) !== null) {
            const day = parseInt(match[1], 10), month = parseInt(match[2], 10);
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12) holidaysSet.add(`${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}`);
        }
        setParsed(Array.from(holidaysSet).sort());
    };

    const handleSave = async () => {
        const currentYearHolidays = GLOBAL_HOLIDAYS[selectedYear] || [];
        const combined = Array.from(new Set([...currentYearHolidays, ...parsed])).sort();
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'holidays'), { [selectedYear]: combined }, { merge: true });
        logAction('ADD_HOLIDAYS', `Добавлены выходные дни на ${selectedYear} год: ${parsed.join(', ')}`);
        setInputText(''); setParsed([]);
    };

    const confirmDeleteHoliday = async () => {
        if (!holidayToDelete) return;
        const currentYearHolidays = GLOBAL_HOLIDAYS[selectedYear] || [];
        const updated = currentYearHolidays.filter(d => d !== holidayToDelete);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'holidays'), { [selectedYear]: updated }, { merge: true });
        logAction('DELETE_HOLIDAY', `Удален выходной день ${holidayToDelete} из ${selectedYear} года`);
        setHolidayToDelete(null);
    };

    const displayedHolidays = GLOBAL_HOLIDAYS[selectedYear] || [];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-gray-500" />Праздничные дни</h3>
                <div className="flex items-center gap-2"><label className="text-xs font-medium text-gray-500">Год:</label><select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="px-2 py-1 border rounded-lg outline-none focus:border-blue-500 text-sm bg-gray-50">{[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2, CURRENT_YEAR + 3].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
            </div>
            <div className="mb-4"><label className="block text-xs font-medium text-gray-500 mb-1">Вставьте текст из Консультанта (напр. "1, 2 и 8 января...") или даты ("09.01")</label><textarea className="w-full px-3 py-2 border rounded-lg outline-none focus:border-blue-500 text-sm h-24 resize-none" value={inputText} onChange={(e) => { setInputText(e.target.value); parseHolidays(e.target.value); }} placeholder="Вставьте текст..." /></div>
            <div className="flex gap-2 mb-4"><button onClick={handleSave} disabled={parsed.length === 0} className="w-full bg-indigo-600 text-white px-3 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors">Добавить ({parsed.length} дн.)</button></div>
            <div className="text-xs text-gray-500"><strong>Будут добавлены в {selectedYear} год:</strong><div className="flex flex-wrap gap-1 mt-2">{parsed.map(d => <span key={`p-${d}`} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded">{d}</span>)}{parsed.length === 0 && <span>Нет данных</span>}</div></div>
            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500"><strong>Уже в базе для {selectedYear} года ({displayedHolidays.length}):</strong><div className="flex flex-wrap gap-1 mt-2">{displayedHolidays.map(d => (<span key={`h-${d}`} className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded group">{d}<button onClick={() => setHolidayToDelete(d)} className="text-gray-400 hover:text-red-500 transition-colors" title="Удалить"><X className="w-3 h-3" /></button></span>))}</div></div>
            <ConfirmModal isOpen={!!holidayToDelete} title="Удаление выходного" message={`Вы уверены, что хотите удалить выходной день ${holidayToDelete} из ${selectedYear} года?`} onConfirm={confirmDeleteHoliday} onCancel={() => setHolidayToDelete(null)} />
        </div>
    );
};

const AuthSettingsManagement = () => {
    const { authSettings, logAction } = useAppContext();
    const toggleSetting = async (key) => {
        const newValue = !authSettings[key];
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'auth'), { ...authSettings, [key]: newValue }, { merge: true });
        logAction('UPDATE_AUTH', `Изменены настройки входа. ${key} теперь ${newValue ? 'включен' : 'выключен'}`);
    };
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><Lock className="w-5 h-5 text-gray-500" />Методы входа</h3>
            <div className="space-y-3 text-sm text-gray-700">
                <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors -ml-2"><input type="checkbox" checked={authSettings.password} onChange={() => toggleSetting('password')} className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer" /><span className="font-medium">Вход по списку и паролю</span></label>
                <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors -ml-2"><input type="checkbox" checked={authSettings.google} onChange={() => toggleSetting('google')} className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer" /><span className="font-medium">Вход через Google</span></label>
                <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors -ml-2"><input type="checkbox" checked={authSettings.yandex} onChange={() => toggleSetting('yandex')} className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer" /><span className="font-medium">Вход через Яндекс</span></label>
            </div>
        </div>
    );
};

const DepartmentManagement = ({ deptDocs }) => {
    const { departments, users, logAction } = useAppContext();
    const [newDept, setNewDept] = useState(''), [editingDept, setEditingDept] = useState(null), [editValue, setEditValue] = useState('');
    const [moveModal, setMoveModal] = useState(null), [targetDept, setTargetDept] = useState(''), [confirmDelete, setConfirmDelete] = useState(null), [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

    const handleAdd = async (e) => { e.preventDefault(); if (newDept && !departments.includes(newDept)) { const ref = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'departments'), { name: newDept }); logAction('ADD_DEPT', `Создан отдел: ${newDept}`, ref.id, null, { name: newDept, _docId: ref.id }); setNewDept(''); } };
    const startEdit = (dept) => { setEditingDept(dept); setEditValue(dept); };
    const saveEdit = async () => { if (editValue && !departments.includes(editValue)) { const deptDoc = deptDocs.find(d => d.name === editingDept); if (deptDoc) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'departments', deptDoc.id), { name: editValue }); logAction('EDIT_DEPT', `Переименован отдел: ${editingDept} -> ${editValue}`, deptDoc.id, deptDoc, { ...deptDoc, name: editValue }); } const usersToUpdate = users.filter(u => u.department === editingDept); for (const u of usersToUpdate) { if (u._docId) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u._docId), { department: editValue }); } } setEditingDept(null); };
    const attemptDelete = (dept) => { const usersInDept = users.filter(u => u.department === dept).length; if (usersInDept > 0) { setTargetDept(''); setMoveModal({ deptToDelete: dept, usersCount: usersInDept }); } else setConfirmDelete({ dept }); };
    const confirmDeleteDept = async () => { const deptDoc = deptDocs.find(d => d.name === confirmDelete.dept); if (deptDoc) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'departments', deptDoc.id)); logAction('DELETE_DEPT', `Удален отдел: ${deptDoc.name}`, deptDoc.id, deptDoc); } setConfirmDelete(null); };
    const confirmMoveAndDelete = async () => { const deptToDelete = moveModal.deptToDelete; const newDepartment = targetDept || 'Без отдела'; const usersToMove = users.filter(u => u.department === deptToDelete); for (const u of usersToMove) { if (u._docId) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u._docId), { department: newDepartment }); } const deptDoc = deptDocs.find(d => d.name === deptToDelete); if (deptDoc) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'departments', deptDoc.id)); logAction('DELETE_DEPT_BULK_MOVE', `Удален отдел ${deptDoc.name} с переносом сотрудников в ${newDepartment}`, deptDoc.id, deptDoc); } setMoveModal(null); };
    const handleDeleteAllDepartments = async () => { const batch = writeBatch(db); deptDocs.forEach(d => { const ref = doc(db, 'artifacts', appId, 'public', 'data', 'departments', d.id); batch.delete(ref); }); users.forEach(u => { if(u._docId) { const ref = doc(db, 'artifacts', appId, 'public', 'data', 'users', u._docId); batch.update(ref, { department: 'Без отдела' }); } }); await batch.commit(); logAction('DELETE_ALL_DEPTS', `Удалены все отделы`); setConfirmDeleteAll(false); };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><Briefcase className="w-5 h-5 text-gray-500" />Управление отделами</h3>
            <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
                {departments.map((dept, index) => (
                    <div key={`dept-${index}`} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 group">
                        {editingDept === dept ? (<div className="flex gap-2 flex-1 items-center"><input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded outline-none bg-white" autoFocus /><button onClick={saveEdit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Check className="w-4 h-4" /></button><button onClick={() => setEditingDept(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button></div>) : (<><span className="text-sm font-medium text-gray-700">{dept}</span><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => startEdit(dept)} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Переименовать"><Pencil className="w-4 h-4" /></button><button onClick={() => attemptDelete(dept)} className="p-1 text-red-400 hover:bg-red-50 rounded" title="Удалить"><Trash2 className="w-4 h-4" /></button></div></>)}
                    </div>
                ))}
            </div>
            <form onSubmit={handleAdd} className="flex gap-2 mb-6"><input type="text" placeholder="Новый отдел" value={newDept} onChange={(e) => setNewDept(e.target.value)} className="flex-1 px-3 py-2 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /><button type="submit" disabled={!newDept} className="bg-indigo-600 text-white px-3 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"><Plus className="w-4 h-4" /> Добавить</button></form>
            <button onClick={() => setConfirmDeleteAll(true)} type="button" className="w-full text-center text-xs text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 p-2 rounded transition-colors flex items-center justify-center gap-1"><AlertOctagon className="w-3 h-3" /> Удалить ВСЕ отделы</button>
            <ConfirmModal isOpen={!!confirmDelete} title="Удаление отдела" message={`Вы уверены, что хотите удалить отдел "${confirmDelete?.dept}"?`} onConfirm={confirmDeleteDept} onCancel={() => setConfirmDelete(null)} />
            <ConfirmModal isOpen={confirmDeleteAll} title="Удаление ВСЕХ отделов" message="ВНИМАНИЕ! Это действие необратимо." confirmText="Удалить всё" onConfirm={handleDeleteAllDepartments} onCancel={() => setConfirmDeleteAll(false)} />
            {moveModal && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-gray-200"><h4 className="font-bold text-gray-800 text-lg mb-2">Удаление отдела</h4><p className="text-sm text-gray-500 mb-4 text-center">Куда перевести <b>{moveModal.usersCount}</b> сотрудников?</p><select value={targetDept} onChange={(e) => setTargetDept(e.target.value)} className="w-full mb-6 px-3 py-2 border border-gray-300 rounded text-sm bg-white"><option value="">-- Выберите новый отдел --</option><option value="Без отдела">Без отдела</option>{departments.filter(d => d !== moveModal.deptToDelete).map((d, i) => (<option key={`m-${i}`} value={d}>{d}</option>))}</select><div className="flex gap-3"><button onClick={() => setMoveModal(null)} className="flex-1 py-2 bg-gray-100 rounded">Отмена</button><button onClick={confirmMoveAndDelete} className="flex-1 py-2 bg-indigo-600 text-white rounded">Перенести</button></div></div></div>)}
        </div>
    );
};

const UserManagement = () => {
    const { users, departments, vacations, holidays, logAction } = useAppContext();
    const [isAdding, setIsAdding] = useState(false), [editingUser, setEditingUser] = useState(null), [formData, setFormData] = useState({ name: '', email: '', department: departments[0] || '', hireDate: '', yearlyAllowance: 28, carryOverDays: 0, role: 'employee', password: '123' });
    const fileInputRef = useRef(null);
    const [confirmDelete, setConfirmDelete] = useState(null), [confirmDeleteAll, setConfirmDeleteAll] = useState(false), [importInfo, setImportInfo] = useState(null), [selectedIds, setSelectedIds] = useState([]), [bulkModal, setBulkModal] = useState(null), [bulkValue, setBulkValue] = useState('');

    const resetForm = () => { setFormData({ name: '', email: '', department: departments[0] || '', hireDate: '', yearlyAllowance: 28, carryOverDays: 0, role: 'employee', password: '123' }); setEditingUser(null); setIsAdding(false); };
    const handleEdit = (user) => { setEditingUser(user); setFormData({ ...user }); setIsAdding(true); };
    
    const handleDelete = async () => { if (confirmDelete && confirmDelete._docId) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', confirmDelete._docId)); logAction('DELETE_USER', `Удален сотрудник: ${confirmDelete.name}`, confirmDelete.id, confirmDelete); setConfirmDelete(null); } };
    const handleSubmit = async (e) => { 
        e.preventDefault(); const avatar = formData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2); 
        if (editingUser && editingUser._docId) { 
            const oldUser = users.find(u => u._docId === editingUser._docId);
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', editingUser._docId), { ...formData, avatar }); 
            logAction('EDIT_USER', `Изменены данные сотрудника: ${formData.name}`, editingUser._docId, oldUser, { ...formData, avatar });
        } else { 
            const newId = Date.now();
            const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), { ...formData, id: newId, avatar }); 
            logAction('ADD_USER', `Добавлен сотрудник: ${formData.name}`, docRef.id, null, { ...formData, id: newId, avatar, _docId: docRef.id });
        } 
        resetForm(); 
    };

    const handleDeleteAllUsers = async () => { const batch = writeBatch(db); const usersToDelete = users.filter(u => u.role !== 'admin'); usersToDelete.forEach(u => { if (u._docId) batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'users', u._docId)); }); await batch.commit(); logAction('DELETE_ALL_USERS', `Удалены все сотрудники`); setConfirmDeleteAll(false); };
    const downloadTemplate = () => { const headers = "ФИО,Отдел,Роль (employee/manager/ceo),Дата найма (YYYY-MM-DD),Email\nИван Петров,IT Отдел,employee,2024-01-15,ivan@example.com"; const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.setAttribute('download', 'employees_template.csv'); document.body.appendChild(link); link.click(); document.body.removeChild(link); };
    
    const handleExportSchedule = () => { 
        let csvContent = `,,Остаток отпуска на 31.12.${CURRENT_YEAR - 1},`; FULL_MONTHS.forEach(m => csvContent += `${m},,,,`); csvContent += `Суммарное количество в графике,Остаток дней неиспользованных дней отпуска на 31.12.${CURRENT_YEAR}\n,,,`; FULL_MONTHS.forEach(() => csvContent += "дата начала,дата окончания,кол-во дней,согласование руководителя,"); csvContent += ",,\n"; 
        users.filter(u => u.role !== 'admin').forEach(user => { 
            const userVacations = vacations.filter(v => v.userId === user.id && v.status === 'approved'); const totalAllowance = Number(user.yearlyAllowance) + Number(user.carryOverDays); let row = `${user.id},${user.name},${user.carryOverDays},`, totalUsed = 0; 
            for (let i = 0; i < 12; i++) { 
                const vac = userVacations.find(v => { const d = new Date(v.startDate); return d.getMonth() === i && d.getFullYear() === CURRENT_YEAR; }); 
                if (vac) { const days = countBillableDays(vac.startDate, vac.endDate, holidays); totalUsed += days; row += `${vac.startDate},${vac.endDate},${days},согласовано,`; } else { row += ",,,,"; } 
            } 
            row += `${totalUsed},${totalAllowance - totalUsed}\n`; csvContent += row; 
        }); 
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.setAttribute('download', `Vacation_Schedule_${CURRENT_YEAR}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); 
    };
    
    const handleFileUpload = (e) => { 
        const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); 
        reader.onload = async (evt) => { 
            const lines = evt.target.result.split('\n'); const newUsers = []; const newDeptsToCreate = new Set();
            lines.forEach((line, index) => { 
                const parts = line.split(',').map(s => s.trim()); 
                if (parts.length >= 2 && index > 0 && parts[0]) { 
                    const name = parts[0], dept = parts[1] || 'Без отдела'; 
                    if (dept !== 'Без отдела' && !departments.includes(dept)) newDeptsToCreate.add(dept);
                    const role = parts[2] === 'manager' ? 'manager' : parts[2] === 'ceo' ? 'ceo' : 'employee', date = parts[3] || new Date().toISOString().split('T')[0], email = parts[4] || '', avatar = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2); 
                    newUsers.push({ id: Date.now() + index, name, department: dept, email, role, yearlyAllowance: 28, carryOverDays: 0, hireDate: date, password: '123', avatar }); 
                } 
            }); 
            if (newUsers.length > 0) { 
                const batch = writeBatch(db); 
                newDeptsToCreate.forEach(deptName => { const deptRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'departments')); batch.set(deptRef, { name: deptName }); });
                const createdUserIds = [];
                newUsers.forEach(u => { const ref = doc(collection(db, 'artifacts', appId, 'public', 'data', 'users')); createdUserIds.push(ref.id); batch.set(ref, u); }); 
                await batch.commit(); 
                logAction('BULK_IMPORT', `Массовый импорт: загружено ${newUsers.length} сотрудников`);
                setImportInfo({ message: `Успешно загружено ${newUsers.length} сотрудников${newDeptsToCreate.size > 0 ? ` и добавлено ${newDeptsToCreate.size} новых отделов` : ''}`, isError: false }); 
            } else setImportInfo({ message: 'Ошибка: Не удалось распознать данные', isError: true }); 
            setTimeout(() => setImportInfo(null), 3000); 
        }; 
        reader.readAsText(file); e.target.value = ''; 
    };

    const visibleUsers = users.filter(u => u.role !== 'admin');
    const allSelected = visibleUsers.length > 0 && visibleUsers.every(u => selectedIds.includes(u.id));
    const toggleSelectAll = () => { if (allSelected) setSelectedIds([]); else setSelectedIds(visibleUsers.map(u => u.id)); };
    const toggleSelectUser = (id) => { if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id)); else setSelectedIds([...selectedIds, id]); };
    
    const handleBulkSave = async () => { 
        if (bulkValue === '') return; const batch = writeBatch(db); const oldUsersData = users.filter(u => selectedIds.includes(u.id));
        users.forEach(u => { 
            if (selectedIds.includes(u.id) && u._docId) { 
                const ref = doc(db, 'artifacts', appId, 'public', 'data', 'users', u._docId); 
                if (bulkModal.type === 'department') batch.update(ref, { department: bulkValue }); 
                if (bulkModal.type === 'quota') batch.update(ref, { yearlyAllowance: Number(bulkValue) }); 
            } 
        }); 
        await batch.commit(); 
        logAction('BULK_EDIT', `Массовое изменение для ${selectedIds.length} сотрудников: ${bulkModal.type === 'department' ? 'Смена отдела' : 'Изменение квоты'}`);
        setBulkModal(null); setBulkValue(''); setSelectedIds([]); 
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative pb-16">
            {importInfo && (<div className={`absolute top-0 left-0 right-0 p-2 text-center text-sm font-medium z-20 ${importInfo.isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{importInfo.message}</div>)}
            <div className="p-6 border-b border-gray-200 flex flex-wrap justify-between items-center bg-gray-50 gap-2">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Users className="w-5 h-5 text-gray-500" /> Все сотрудники</h3>
                <div className="flex gap-2 flex-wrap"><button onClick={downloadTemplate} className="bg-white border border-gray-300 text-gray-600 text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2" title="Скачать шаблон"><Download className="w-3 h-3" /> Шаблон</button><button onClick={handleExportSchedule} className="bg-white border border-gray-300 text-green-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-green-50 flex items-center gap-2" title="Экспорт графика (CSV)"><FileText className="w-3 h-3" /> Экспорт графика</button><button onClick={() => fileInputRef.current.click()} className="bg-white border border-gray-300 text-gray-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"><Upload className="w-3 h-3" /> Импорт</button><input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />{!isAdding && <button onClick={() => setIsAdding(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2"><UserPlus className="w-3 h-3" /> Добавить</button>}</div>
            </div>
            
            {isAdding && (
                <div className="p-6 border-b border-gray-200 bg-indigo-50 animate-fadeIn">
                    <h4 className="font-bold text-gray-800 mb-4">{editingUser ? 'Редактирование сотрудника' : 'Новый сотрудник'}</h4>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="flex flex-col"><label className="text-xs text-gray-500 font-semibold mb-1 uppercase">ФИО</label><input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="px-3 py-2 rounded border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                        <div className="flex flex-col"><label className="text-xs text-gray-500 font-semibold mb-1 uppercase">Email (для входа)</label><input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="px-3 py-2 rounded border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="user@company.com" /></div>
                        <div className="flex flex-col"><label className="text-xs text-gray-500 font-semibold mb-1 uppercase">Отдел</label><select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="px-3 py-2 rounded border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white">{departments.map((d, i) => <option key={`opt-${i}`} value={d}>{d}</option>)}</select></div>
                        <div className="flex flex-col"><label className="text-xs text-gray-500 font-semibold mb-1 uppercase">Роль</label><select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="px-3 py-2 rounded border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"><option value="employee">Сотрудник</option><option value="manager">Руководитель</option><option value="ceo">СЕО</option><option value="admin">Администратор</option></select></div>
                        <div className="flex flex-col"><label className="text-xs text-gray-500 font-semibold mb-1 uppercase">Дата найма</label><input type="date" required value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})} className="px-3 py-2 rounded border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                        <div className="flex flex-col"><label className="text-xs text-gray-500 font-semibold mb-1 uppercase">Квота (дней/год)</label><input type="number" required value={formData.yearlyAllowance} onChange={e => setFormData({...formData, yearlyAllowance: Number(e.target.value)})} className="px-3 py-2 rounded border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                        <div className="flex flex-col"><label className="text-xs text-gray-500 font-semibold mb-1 uppercase">Остаток прошлых лет</label><input type="number" required value={formData.carryOverDays} onChange={e => setFormData({...formData, carryOverDays: Number(e.target.value)})} className="px-3 py-2 rounded border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                        <div className="flex flex-col"><label className="text-xs text-gray-500 font-semibold mb-1 uppercase">Пароль</label><div className="flex items-center border border-indigo-200 rounded px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-indigo-500"><Key className="w-4 h-4 text-gray-400 mr-2" /><input type="text" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full outline-none text-sm" /></div></div>
                        <div className="flex gap-2 col-span-1 md:col-span-2 lg:col-span-3 justify-end items-end"><button type="button" onClick={resetForm} className="px-4 py-2 bg-white text-gray-600 border rounded hover:bg-gray-50 transition-colors">Отмена</button><button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">Сохранить</button></div>
                    </form>
                </div>
            )}
            
            <div className="overflow-auto max-h-96">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 sticky top-0"><tr><th className="p-3 w-8"><button onClick={toggleSelectAll} className="text-gray-400 hover:text-indigo-600">{allSelected ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5" />}</button></th><th>ФИО / Email</th><th>Отдел</th><th>Квота / Остаток</th><th></th></tr></thead>
                    <tbody>
                        {users.filter(u=>u.role!=='admin').map(u=>(
                            <tr key={u._docId || u.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="p-3"><button onClick={()=>toggleSelectUser(u.id)} className="text-gray-300 hover:text-indigo-500">{selectedIds.includes(u.id)?<CheckSquare className="w-5 h-5 text-indigo-600"/>:<Square className="w-5 h-5 text-gray-300"/>}</button></td>
                                <td className="p-3 font-medium text-gray-800">{u.name} <span className="text-xs text-gray-400">({u.role})</span><div className="text-[10px] text-gray-500 font-normal">{u.email || 'Нет email'}</div></td>
                                <td className="p-3 text-gray-500">{u.department}</td>
                                <td className="p-3 text-center"><span className="font-bold text-gray-800">{u.yearlyAllowance}</span> / <span className="text-green-600">+{u.carryOverDays}</span></td>
                                <td className="p-3 text-right"><button onClick={() => handleEdit(u)} className="text-blue-500 p-1 hover:bg-blue-50 rounded"><Pencil className="w-3 h-3"/></button><button onClick={() => setConfirmDelete(u)} className="text-red-400 p-1 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3"/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="p-3 border-t border-gray-200 bg-gray-50"><button onClick={()=>setConfirmDeleteAll(true)} className="text-red-500 text-xs flex gap-1 items-center hover:text-red-700"><AlertTriangle className="w-3 h-3"/> Удалить ВСЕХ</button></div>

            {selectedIds.length > 0 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-20 animate-bounce-in">
                    <span className="text-sm font-medium whitespace-nowrap">Выбрано: {selectedIds.length}</span><div className="h-4 w-px bg-gray-700"></div>
                    <button onClick={() => setBulkModal({ type: 'department' })} className="text-xs hover:text-indigo-300 transition-colors flex items-center gap-1"><Briefcase className="w-3 h-3" /> Сменить отдел</button>
                    <button onClick={() => setBulkModal({ type: 'quota' })} className="text-xs hover:text-indigo-300 transition-colors flex items-center gap-1"><PieChart className="w-3 h-3" /> Изменить квоту</button>
                    <button onClick={() => setSelectedIds([])} className="ml-2 text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
            )}

            {bulkModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-gray-200">
                        <h4 className="font-bold text-gray-800 mb-4 text-center">{bulkModal.type === 'department' ? 'Смена отдела' : 'Изменение квоты отпуска'}</h4>
                        <p className="text-xs text-gray-500 mb-4 text-center">Для {selectedIds.length} выбранных сотрудников</p>
                        {bulkModal.type === 'department' ? (
                            <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="w-full mb-6 px-3 py-2 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500"><option value="">-- Выберите отдел --</option>{departments.map((d, i) => <option key={`bm-${i}`} value={d}>{d}</option>)}</select>
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

const LoginScreen = ({ onSelectUser }) => {
    const { users, authSettings } = useAppContext();
    const [selectedUserId, setSelectedUserId] = useState(null), [passwordInput, setPasswordInput] = useState(''), [error, setError] = useState(''), [isAdminLogin, setIsAdminLogin] = useState(false), [searchTerm, setSearchTerm] = useState(''), [isSocialLoading, setIsSocialLoading] = useState(false);

    const authConfig = authSettings || DEFAULT_AUTH_SETTINGS;
    const selectedUser = users.find(u => u.id === selectedUserId);
    const filteredUsers = users.filter(u => u.role !== 'admin' && u.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleLogin = (e) => {
        e.preventDefault();
        if (isAdminLogin) {
            const adminUser = users.find(u => u.role === 'admin');
            if (adminUser && adminUser.password === passwordInput) onSelectUser(adminUser); else setError('Неверный пароль администратора');
        } else {
            if (selectedUser && selectedUser.password === passwordInput) onSelectUser(selectedUser); else setError('Неверный пароль');
        }
    };

    const handleSocialLogin = async (providerType) => {
        if (isSocialLoading) return;
        try {
            setIsSocialLoading(true); setError('');
            const authInstance = getAuth();
            const provider = providerType === 'google' ? new GoogleAuthProvider() : new OAuthProvider('yandex.com');
            const result = await signInWithPopup(authInstance, provider);
            const userEmail = result.user?.email;
            
            if (!userEmail) { setError('Не удалось получить email от провайдера'); return; }
            const matchedUser = users.find(u => u.email && u.email.toLowerCase() === userEmail.toLowerCase());
            
            if (matchedUser) { onSelectUser(matchedUser); } 
            else { await signOut(authInstance); await signInAnonymously(authInstance); setError(`Доступ запрещен. Сотрудник с email ${userEmail} не добавлен администратором.`); }
        } catch (err) {
            console.error('Auth error:', err);
            const errStr = err.toString();
            if (err.code === 'auth/popup-blocked' || errStr.includes('popup-blocked')) setError('Браузер заблокировал всплывающее окно. Используйте вход через список.');
            else if (err.code === 'auth/cancelled-popup-request' || errStr.includes('cancelled-popup-request')) setError('Окно авторизации было закрыто. Используйте вход через список.');
            else if (err.code !== 'auth/popup-closed-by-user') setError(`Ошибка авторизации: ${err.message}`);
        } finally { setIsSocialLoading(false); }
    };

    const handleBack = () => { setSelectedUserId(null); setPasswordInput(''); setError(''); setIsAdminLogin(false); setSearchTerm(''); setIsSocialLoading(false); };

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
                        {authConfig.password && (
                            <>
                                <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input type="text" placeholder="Поиск по фамилии..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
                                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                    {filteredUsers.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Сотрудники не найдены</p>}
                                    {filteredUsers.sort((a,b) => (a.role === 'ceo' ? -2 : a.role === 'manager' ? -1 : 1)).map(user => (
                                        <button key={user._docId || user.id} onClick={() => setSelectedUserId(user.id)} className={`w-full flex items-center p-3 rounded-xl border transition-all hover:shadow-sm text-left ${user.role === 'ceo' ? 'border-purple-100 bg-purple-50 hover:border-purple-500' : user.role === 'manager' ? 'border-emerald-100 bg-emerald-50 hover:border-emerald-500' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mr-4 ${user.role === 'ceo' ? 'bg-purple-200 text-purple-700' : user.role === 'manager' ? 'bg-emerald-200 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{user.avatar}</div>
                                            <div><div className="font-semibold text-gray-800">{user.name}</div><div className="text-xs text-gray-500">{user.role === 'ceo' ? 'СЕО' : user.role === 'manager' ? `Руководитель: ${user.department}` : user.department}</div></div>
                                            <ChevronRight className="w-5 h-5 ml-auto text-gray-300" />
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                        {(authConfig.google || authConfig.yandex) && (
                            <>
                                {authConfig.password && (<div className="relative flex items-center py-2 mt-4 mb-2"><div className="flex-grow border-t border-gray-200"></div><span className="flex-shrink-0 mx-4 text-gray-400 text-xs">быстрый вход</span><div className="flex-grow border-t border-gray-200"></div></div>)}
                                <div className="flex gap-3">
                                    {authConfig.google && (<button type="button" disabled={isSocialLoading} onClick={() => handleSocialLogin('google')} className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors text-sm shadow-sm disabled:opacity-50">{isSocialLoading ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : 'Google'}</button>)}
                                    {authConfig.yandex && (<button type="button" disabled={isSocialLoading} onClick={() => handleSocialLogin('yandex')} className="flex-1 flex items-center justify-center gap-2 bg-[#FFCC00] text-black font-medium py-2 px-4 rounded-lg hover:bg-[#F2C100] transition-colors text-sm shadow-sm disabled:opacity-50">{isSocialLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Яндекс'}</button>)}
                                </div>
                            </>
                        )}
                        {!authConfig.password && !authConfig.google && !authConfig.yandex && (<div className="text-center py-8 text-gray-500 text-sm bg-gray-50 rounded-xl border border-gray-100"><AlertTriangle className="w-8 h-8 text-orange-400 mx-auto mb-2" />Все методы входа отключены администратором</div>)}
                        {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
                    </div>
                ) : (
                    <form onSubmit={handleLogin} className="animate-fadeIn">
                        <button type="button" onClick={handleBack} className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"><ArrowLeft className="w-4 h-4 mr-1" /> Назад</button>
                        {!isAdminLogin && <div className="flex items-center gap-3 mb-6 bg-gray-50 p-3 rounded-xl border border-gray-100"><div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-lg">{selectedUser?.avatar}</div><div><div className="font-bold text-gray-800">{selectedUser?.name}</div><div className="text-xs text-gray-500">{selectedUser?.department}</div></div></div>}
                        {isAdminLogin && (<div className="mb-6 bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-center"><p className="text-sm text-indigo-800 font-medium">Введите пароль администратора</p></div>)}
                        <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-gray-400" /></div><input type="password" autoFocus value={passwordInput} onChange={(e) => { setPasswordInput(e.target.value); setError(''); }} className={`block w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${error ? 'border-red-300' : 'border-gray-300'}`} placeholder="Введите пароль" /></div>{error && <p className="mt-1 text-sm text-red-600">{error}</p>}</div>
                        <button className={`w-full text-white font-bold py-2 px-4 rounded-lg transition-colors mb-4 ${isAdminLogin ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}`}>Войти</button>
                        {!isAdminLogin && (authConfig.google || authConfig.yandex) && (
                            <>
                                <div className="relative flex items-center py-2 mb-4"><div className="flex-grow border-t border-gray-200"></div><span className="flex-shrink-0 mx-4 text-gray-400 text-xs">или войти через</span><div className="flex-grow border-t border-gray-200"></div></div>
                                <div className="flex gap-3">
                                    {authConfig.google && (<button type="button" disabled={isSocialLoading} onClick={() => handleSocialLogin('google')} className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors text-sm shadow-sm disabled:opacity-50">{isSocialLoading ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : 'Google'}</button>)}
                                    {authConfig.yandex && (<button type="button" disabled={isSocialLoading} onClick={() => handleSocialLogin('yandex')} className="flex-1 flex items-center justify-center gap-2 bg-[#FFCC00] text-black font-medium py-2 px-4 rounded-lg hover:bg-[#F2C100] transition-colors text-sm shadow-sm disabled:opacity-50">{isSocialLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Яндекс'}</button>)}
                                </div>
                            </>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
};

const App = () => {
    const [firebaseUser, setFirebaseUser] = useState(null), [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null), [users, setUsers] = useState([]), [departments, setDepartments] = useState([]), [vacations, setVacations] = useState([]), [deptDocs, setDeptDocs] = useState([]), [holidays, setHolidays] = useState({ ...DEFAULT_HOLIDAYS }), [authSettings, setAuthSettings] = useState(DEFAULT_AUTH_SETTINGS), [auditLogs, setAuditLogs] = useState([]);
    const [calendarDate, setCalendarDate] = useState(new Date(CURRENT_YEAR, 0, 1)), [viewMode, setViewMode] = useState('month'), [deleteModal, setDeleteModal] = useState(null), [showManagerStats, setShowManagerStats] = useState(false);

    const logAction = async (type, details, targetId = null, previousData = null, newData = null) => {
        if (!currentUser && type !== 'SYSTEM') return;
        try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'audit_logs'), { timestamp: Date.now(), userId: currentUser ? currentUser.id : 'system', userName: currentUser ? currentUser.name : 'Система', type, details, targetId, previousData, newData, reverted: false }); } 
        catch (e) { console.error("Logging failed", e); }
    };

    useEffect(() => {
        if (!firebaseUser || !vacations.length || !users.length) return;
        const today = new Date(); today.setHours(0,0,0,0);
        const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);

        vacations.forEach(async (v) => {
            if (v.status === 'approved' && !v.notified7Days) {
                const start = new Date(v.startDate); start.setHours(0,0,0,0);
                if (start >= today && start <= nextWeek) {
                    try {
                        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'vacations', v._docId), { notified7Days: true });
                        const emp = users.find(u => u.id === v.userId);
                        if (emp) console.log(`[EMAIL СЕРВИС] 📧 Кому: Сотруднику (${emp.name}). Тема: Скоро отпуск! Текст: Ваш отпуск начинается ${new Date(v.startDate).toLocaleDateString()}`);
                        window.dispatchEvent(new CustomEvent('app-toast', { detail: { title: '📧 Отправка Email', message: `Письма об отпуске (${emp?.name}) успешно отправлены.`, type: 'email'} }));
                    } catch (err) { console.error("Ошибка при симуляции отправки email:", err); }
                }
            }
        });
    }, [vacations, users, firebaseUser]);

    useEffect(() => {
        const initAuth = async () => { if (typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token) { try { await signInWithCustomToken(auth, window.__initial_auth_token); } catch { await signInAnonymously(auth); } } else await signInAnonymously(auth); };
        initAuth();
        return onAuthStateChanged(auth, user => setFirebaseUser(user));
    }, []);

    useEffect(() => {
        if(!firebaseUser) return;
        const eH = (e) => console.error("DB sync error...", e);
        const uH = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'holidays'), s => { if (s.exists()) { const data = s.data(); const newHolidays = { ...DEFAULT_HOLIDAYS }; for (const k in data) newHolidays[k] = data[k]; setHolidays(newHolidays); } }, eH);
        const uA = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'auth'), s => { if (s.exists()) { setAuthSettings({ ...DEFAULT_AUTH_SETTINGS, ...s.data() }); } else { setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'auth'), DEFAULT_AUTH_SETTINGS); } }, eH);
        const uD = onSnapshot(collection(db,'artifacts',appId,'public','data','departments'), s => { const d = s.docs.map(doc=>({id:doc.id,...doc.data()})); if(!d.length) INITIAL_DEPARTMENTS_DATA.forEach(x=>addDoc(collection(db,'artifacts',appId,'public','data','departments'),x)); else { setDeptDocs(d); setDepartments([...new Set(d.map(x=>x.name))]); } }, eH);
        const uU = onSnapshot(collection(db,'artifacts',appId,'public','data','users'), s => { const u = s.docs.map(doc=>({_docId:doc.id,...doc.data()})); if(!u.length) INITIAL_USERS_DATA.forEach(x=>addDoc(collection(db,'artifacts',appId,'public','data','users'),x)); else setUsers(u); setLoading(false); }, eH);
        const uV = onSnapshot(collection(db,'artifacts',appId,'public','data','vacations'), s => setVacations(s.docs.map(d=>({_docId:d.id,...d.data()}))), eH);
        const uL = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'audit_logs'), s => { const logs = s.docs.map(doc => ({ _docId: doc.id, ...doc.data() })).sort((a,b) => b.timestamp - a.timestamp); setAuditLogs(logs); }, eH);

        return () => { uH(); uA(); uD(); uU(); uV(); uL(); };
    }, [firebaseUser]);

    const handleNavigation = (dir) => { const newDate = new Date(calendarDate); if (viewMode === 'year') { newDate.setFullYear(newDate.getFullYear() + dir); } else if (viewMode === 'quarter') { newDate.setMonth(newDate.getMonth() + (dir * 3)); } else { newDate.setMonth(newDate.getMonth() + dir); } setCalendarDate(newDate); };
    const handleYearNav = (dir) => { const newDate = new Date(calendarDate); newDate.setFullYear(newDate.getFullYear() + dir); setCalendarDate(newDate); };

    const handleAddVacation = async (v) => { const newId = Date.now(); const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'vacations'), { ...v, id: newId }); logAction('ADD_VACATION', `Создана заявка на отпуск`, docRef.id, null, { ...v, id: newId, _docId: docRef.id }); };
    const handleUpdateVacation = async (v) => { const { _docId, ...data } = v; const oldV = vacations.find(x => x._docId === _docId); await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'vacations', _docId), data); logAction('EDIT_VACATION', `Обновлена заявка на отпуск`, v.id, oldV, data); };
    const confirmDeleteVacation = async () => { const v = vacations.find(x => x.id === deleteModal); if(v) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'vacations', v._docId)); logAction('DELETE_VACATION', `Удален отпуск пользователя ${users.find(u => u.id === v.userId)?.name}`, v.id, v); } setDeleteModal(null); };

    if (loading) return (<div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500"><Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" /><p>Загрузка данных...</p></div>);

    const contextValue = { currentUser, users, departments, vacations, holidays, authSettings, auditLogs, logAction };

    return (
        <AppContext.Provider value={contextValue}>
            {!currentUser ? (<LoginScreen onSelectUser={setCurrentUser} />) : (
                <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12 relative overflow-hidden">
                    <Header onLogout={() => setCurrentUser(null)} />
                    <main className="max-w-[1400px] mx-auto px-4 pt-8">
                        {currentUser.role === 'admin' ? (
                            <div className="space-y-6">
                                <AdminStats />
                                <UserManagement />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                                    <DepartmentManagement deptDocs={deptDocs} />
                                    <HolidayManagement />
                                    <AuthSettingsManagement />
                                </div>
                                <AuditLogViewer />
                            </div>
                        ) : (currentUser.role === 'manager' || currentUser.role === 'ceo') ? (
                            showManagerStats ? <ManagerAnalyticsPage onBack={() => setShowManagerStats(false)} /> :
                            <div className="space-y-8">
                                 <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                    <h2 className="text-lg font-bold text-emerald-900">Кабинет: {currentUser.role === 'ceo' ? 'СЕО' : currentUser.department}</h2>
                                    {currentUser.role !== 'ceo' && <button onClick={() => setShowManagerStats(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm"><BarChart2 className="w-4 h-4"/> Статистика</button>}
                                 </div>
                                 <ManagerApprovals onUpdateVacation={handleUpdateVacation} />
                                 <UserView onAdd={handleAddVacation} onUpdate={handleUpdateVacation} onDel={(id)=>setDeleteModal(id)} calendarProps={{ currentMonthDate: calendarDate, onPrev: () => handleNavigation(-1), onNext: () => handleNavigation(1), onPrevYear: () => handleYearNav(-1), onNextYear: () => handleYearNav(1), viewMode: viewMode, setViewMode: setViewMode }} />
                            </div>
                        ) : (
                             <div className="space-y-8">
                                <UserView onAdd={handleAddVacation} onUpdate={handleUpdateVacation} onDel={(id)=>setDeleteModal(id)} calendarProps={{ currentMonthDate: calendarDate, onPrev: () => handleNavigation(-1), onNext: () => handleNavigation(1), onPrevYear: () => handleYearNav(-1), onNextYear: () => handleYearNav(1), viewMode: viewMode, setViewMode: setViewMode }} />
                            </div>
                        )}
                        <ConfirmModal isOpen={!!deleteModal} title="Отмена" message="Удалить отпуск?" onConfirm={confirmDeleteVacation} onCancel={() => setDeleteModal(null)} />
                    </main>
                </div>
            )}
        </AppContext.Provider>
    );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(React.createElement(App));
