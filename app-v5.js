import React, { useState, useMemo, useEffect, useRef, createContext, useContext } from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
import { Calendar, Users, Briefcase, CheckCircle, AlertTriangle, LogOut, ChevronLeft, ChevronRight, Plus, BarChart2, Maximize, LayoutGrid, Trash2, Pencil, Info, PieChart, Check, Settings, UserPlus, X, ClipboardList, Lock, Key, ArrowLeft, ChevronDown, ChevronUp, UserCheck, TrendingUp, AlertCircle, Upload, FileText, AlertOctagon, Download, Clock, XCircle, Square, CheckSquare, Search, Save, Send, Loader2, Bell, History, RotateCcw, Mail } from 'https://esm.sh/lucide-react@0.330.0';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, writeBatch, setDoc } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

const rawConfig = typeof window.__firebase_config !== 'undefined' ? window.__firebase_config : (typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const firebaseConfig = typeof rawConfig === 'string' ? JSON.parse(rawConfig || '{}') : rawConfig;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : (typeof __app_id !== 'undefined' ? __app_id : 'default-app-id');

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_HOLIDAYS = { [CURRENT_YEAR]: ['01-01', '02-01', '03-01', '04-01', '05-01', '06-01', '07-01', '08-01', '23-02', '08-03', '01-05', '09-05', '12-06', '04-11'], [CURRENT_YEAR + 1]: ['01-01', '02-01', '03-01', '04-01', '05-01', '06-01', '07-01', '08-01', '23-02', '08-03', '01-05', '09-05', '12-06', '04-11'] };
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

const AppContext = createContext(null);
const useAppContext = () => { const context = useContext(AppContext); if (!context) throw new Error("Error"); return context; };

const isHoliday = (d, hConfig = GLOBAL_HOLIDAYS) => { const year = d.getFullYear(); const dateStr = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}`; return (hConfig[year] || []).includes(dateStr); };
const isWeekend = (d, hConfig = GLOBAL_HOLIDAYS) => d.getDay() === 0 || d.getDay() === 6 || isHoliday(d, hConfig);
const countBillableDays = (s, e, hConfig = GLOBAL_HOLIDAYS) => { if (!s || !e) return 0; let c = 0, cur = new Date(s), end = new Date(e); while (cur <= end) { if (!isHoliday(cur, hConfig)) c++; cur.setDate(cur.getDate() + 1); } return c; };
const isSameDay = (d1, d2) => d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
const getApproverForUser = (user, users) => {
    if (!user || !users) return null;
    if (user.role === 'admin' || user.role === 'ceo') return null; 
    if (user.role === 'manager') return users.find(u => u.role === 'ceo') || users.find(u => u.role === 'admin');
    const deptManager = users.find(u => u.department === user.department && u.role === 'manager');
    return deptManager || users.find(u => u.role === 'ceo') || users.find(u => u.role === 'admin');
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Удалить", isDanger = true }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-gray-200 animate-fadeIn">
        <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">{isDanger && <AlertTriangle className="w-5 h-5 text-red-500" />}{title}</h3>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed whitespace-pre-line">{message}</p>
        <div className="flex gap-3"><button onClick={onCancel} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">Отмена</button><button onClick={onConfirm} className={`flex-1 px-4 py-2 text-white rounded-lg font-medium ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{confirmText}</button></div>
      </div>
    </div>
  );
};

const Header = ({ onLogout }) => {
  const { currentUser: user, vacations, users } = useAppContext();
  const [showNotifs, setShowNotifs] = useState(false);
  const [activePopups, setActivePopups] = useState([]);
  const notifRef = useRef(null), shownNotifsRef = useRef(new Set()); 

  useEffect(() => {
      const handleClickOutside = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false); };
      document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const notifications = useMemo(() => {
      if (!user || !vacations || !users) return [];
      const notifs = [], today = new Date(); today.setHours(0,0,0,0);
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
              const diffDays = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24)), daysText = diffDays === 0 ? 'сегодня' : diffDays === 1 ? 'завтра' : `через ${diffDays} дн.`;
              if (v.userId === user.id) notifs.push({ id: `self-${v._docId || v.id}`, title: 'Ваш отпуск', message: `Начинается ${daysText} (${new Date(v.startDate).toLocaleDateString()})`, type: 'self', date: startDate });
              else { const reqUser = users.find(u => u.id === v.userId); if (isSubordinate(reqUser)) notifs.push({ id: `sub-${v._docId || v.id}`, title: `Отпуск: ${reqUser.name}`, message: `Начинается ${daysText}`, type: 'subordinate', date: startDate }); }
          }
      });
      return notifs.sort((a, b) => a.date - b.date);
  }, [user, vacations, users]);

  useEffect(() => {
      if (notifications.length > 0) {
          const newPopups = notifications.filter(n => !shownNotifsRef.current.has(n.id));
          if (newPopups.length > 0) { newPopups.forEach(n => shownNotifsRef.current.add(n.id)); setActivePopups(prev => [...prev, ...newPopups]); newPopups.forEach(n => setTimeout(() => setActivePopups(prev => prev.filter(p => p.id !== n.id)), 6000)); }
      }
  }, [notifications]);

  useEffect(() => {
      const handleCustomToast = (e) => { const newPopup = { id: Date.now() + Math.random().toString(), ...e.detail }; setActivePopups(prev => [...prev, newPopup]); setTimeout(() => setActivePopups(prev => prev.filter(p => p.id !== newPopup.id)), 6000); };
      window.addEventListener('app-toast', handleCustomToast); return () => window.removeEventListener('app-toast', handleCustomToast);
  }, []);

  if (!user) return null;
  let roleIcon = <Calendar className="text-white w-6 h-6" />, headerBg = 'bg-blue-600', badgeBg = 'bg-blue-100 text-blue-700';
  if (user.role === 'admin') { roleIcon = <Settings className="text-white w-6 h-6" />; headerBg = 'bg-indigo-600'; badgeBg = 'bg-indigo-100 text-indigo-700'; }
  else if (user.role === 'manager') { roleIcon = <Briefcase className="text-white w-6 h-6" />; headerBg = 'bg-emerald-600'; badgeBg = 'bg-emerald-100 text-emerald-700'; }
  else if (user.role === 'ceo') { roleIcon = <Users className="text-white w-6 h-6" />; headerBg = 'bg-purple-600'; badgeBg = 'bg-purple-100 text-purple-700'; }

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm"><div className="flex items-center gap-2"><div className={`${headerBg} p-2 rounded-lg transition-colors`}>{roleIcon}</div><h1 className="text-xl font-bold text-gray-800">{user.role === 'admin' ? 'HR Панель' : 'Отпускной Трекер'}</h1></div><div className="flex items-center gap-4">{user.role !== 'admin' && (<div className="relative" ref={notifRef}><button onClick={() => setShowNotifs(!showNotifs)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative"><Bell className="w-5 h-5" />{notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}</button>{showNotifs && (<div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 animate-fadeIn"><div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center"><h3 className="font-bold text-gray-800 text-sm">Уведомления</h3><span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{notifications.length}</span></div><div className="max-h-80 overflow-y-auto">{notifications.length === 0 ? <div className="p-4 text-center text-sm text-gray-500">Нет ближайших отпусков</div> : (<div className="divide-y divide-gray-50">{notifications.map(n => (<div key={n.id} className="p-4 hover:bg-gray-50 transition-colors flex gap-3 items-start"><div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.type === 'self' ? 'bg-blue-500' : 'bg-orange-400'}`}></div><div><p className="text-xs font-bold text-gray-800">{n.title}</p><p className="text-sm text-gray-600 leading-snug">{n.message}</p></div></div>))}</div>)}</div></div>)}</div>)}<div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200"><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${badgeBg}`}>{user.avatar}</div><div className="flex flex-col"><span className="text-sm font-semibold text-gray-700">{user.name}</span><span className="text-xs text-gray-500">{user.department}</span></div></div><button onClick={onLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"><span className="text-sm font-medium">Выйти</span><LogOut className="w-4 h-4" /></button></div></div>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">{activePopups.map(p => (<div key={`popup-${p.id}`} className="bg-white border border-gray-100 shadow-2xl rounded-xl p-4 flex items-start gap-3 w-80 pointer-events-auto animate-fadeIn relative" style={{ animation: 'fadeIn 0.3s ease-out forwards' }}><div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm ${p.type === 'self' ? 'bg-blue-500' : p.type === 'email' ? 'bg-green-500' : 'bg-orange-400'}`}></div><div className="flex-1"><h4 className="text-sm font-bold text-gray-800 mb-0.5">{p.title}</h4><p className="text-xs text-gray-600 leading-snug">{p.message}</p></div><button onClick={() => setActivePopups(prev => prev.filter(x => x.id !== p.id))} className="text-gray-400 hover:text-gray-800 transition-colors p-1 hover:bg-gray-100 rounded-md"><X className="w-4 h-4" /></button></div>))}</div>
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

const PersonalYearCalendar = ({ year, onSelectRange, selection, onPrevYear, onNextYear }) => {
    const { currentUser: user, vacations, users, holidays } = useAppContext();
    const [tooltip, setTooltip] = useState(null);

    const renderMonth = (monthIndex) => {
        const date = new Date(year, monthIndex, 1), daysInMonth = new Date(year, monthIndex + 1, 0).getDate(), startDay = (date.getDay() + 6) % 7, days = [];
        const teamIds = user.role === 'ceo' ? users.filter(u => u.id !== user.id && (u.role === 'manager' || (u.role === 'employee' && !users.some(other => other.department === u.department && other.role === 'manager')))).map(u => u.id) : users.filter(u => u.department === user.department && u.id !== user.id).map(u => u.id);

        for (let i = 0; i < startDay; i++) days.push(<div key={`e-${i}`} className="w-8 h-8"></div>);
        for (let d = 1; d <= daysInMonth; d++) {
            const current = new Date(year, monthIndex, d), isWe = isWeekend(current, holidays), vac = vacations.find(v => v.userId === user.id && current >= new Date(v.startDate).setHours(0,0,0,0) && current <= new Date(v.endDate).setHours(0,0,0,0) && v.status !== 'rejected'), teamVacs = vacations.filter(v => teamIds.includes(v.userId) && current >= new Date(v.startDate).setHours(0,0,0,0) && current <= new Date(v.endDate).setHours(0,0,0,0) && v.status !== 'rejected');
            let bgClass = isWe ? "text-red-500" : "text-gray-700", cellClass = "hover:bg-gray-100 cursor-pointer relative", indicator = null;

            if (vac) { if (vac.status === 'approved') { bgClass = "bg-blue-600 text-white"; cellClass = ""; } else if (vac.status === 'pending') { bgClass = "bg-amber-400 text-white"; cellClass = ""; } else if (vac.status === 'draft') { bgClass = "bg-gray-400 text-white"; cellClass = "cursor-pointer hover:bg-gray-500"; } } 
            else if (teamVacs.length > 0) { if (teamVacs.some(v => v.status === 'approved')) bgClass = "bg-cyan-100 text-cyan-900"; else if (teamVacs.some(v => v.status === 'pending')) bgClass = "bg-orange-100 text-orange-900"; else bgClass = "bg-gray-100 text-gray-500 border border-dashed border-gray-300"; }
            if (selection.start && current.getTime() === selection.start.getTime()) bgClass = "bg-indigo-600 text-white rounded-l-full";
            if (selection.end && current.getTime() === selection.end.getTime()) bgClass = "bg-indigo-600 text-white rounded-r-full";
            if (selection.start && selection.end && current > selection.start && current < selection.end) bgClass = "bg-indigo-200 text-indigo-800";
            if ((vac || (selection.start && current >= selection.start && current <= (selection.end || selection.start))) && teamVacs.length > 0) indicator = <div className="absolute bottom-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm"></div>;

            const buildTooltip = () => { let lines = []; if (vac) lines.push(`Я: ${vac.status === 'approved' ? 'Согласовано' : vac.status === 'pending' ? 'На согласовании' : 'Черновик'}`); if (teamVacs.length > 0) { if (vac) lines.push('---'); teamVacs.forEach(v => { const u = users.find(u => u.id === v.userId); if (u) lines.push(`${u.name}: ${v.status === 'approved' ? 'Согласовано' : v.status === 'pending' ? 'Ждет' : 'Черновик'}`); }); } return lines.length > 0 ? lines.join('\n') : null; };
            const tooltipText = buildTooltip();

            days.push(<div key={`d-${monthIndex}-${d}`} onClick={() => onSelectRange(current)} onMouseEnter={(e) => { if (tooltipText) { const rect = e.target.getBoundingClientRect(); setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 5, text: tooltipText }); } }} onMouseLeave={() => setTooltip(null)} className={`w-8 h-8 flex items-center justify-center text-sm rounded-full transition-colors ${bgClass} ${cellClass}`}>{d}{indicator}</div>);
        }
        return <div key={`m-${monthIndex}`} className="mb-6"><h4 className="font-bold text-gray-800 mb-2 pl-2">{FULL_MONTHS[monthIndex]}</h4><div className="grid grid-cols-7 gap-1 text-center">{WEEKDAYS.map(w => <div key={`wd-${w}`} className="text-xs text-gray-400 font-medium w-8">{w}</div>)}{days}</div></div>;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative">
            {tooltip && (<div className="fixed z-50 bg-gray-800 text-white text-xs p-2 rounded shadow-lg pointer-events-none whitespace-pre-line" style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}>{tooltip.text}</div>)}
            <div className="flex justify-between items-center mb-6"><div className="flex items-center gap-4"><button onClick={onPrevYear} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft className="w-5 h-5"/></button><span className="text-xl font-bold text-gray-900">{year}</span><button onClick={onNextYear} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight className="w-5 h-5"/></button></div><div className="flex items-center gap-3"><div className="text-sm text-gray-500 mr-4">Выбрано: <span className="font-bold text-indigo-600">{selection.count}</span> дн.</div></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">{Array.from({length: 12}, (_, i) => renderMonth(i))}</div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-600"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600"></div>Ваш (Одобрен)</div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400"></div>Ваш (Ждет)</div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-400"></div>Ваш (Черновик)</div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-cyan-100 border border-cyan-200"></div>Коллега (Одобрен)</div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-100 border border-orange-200"></div>Коллега (Ждет)</div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border border-dashed border-gray-400 bg-gray-50"></div>Коллега (Черновик)</div><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div>Пересечение</div></div>
        </div>
    );
};

const TeamCalendar = ({ currentMonthDate, onPrev, onNext, viewMode, setViewMode, localDraft }) => {
    const { vacations, users, departments, currentUser, holidays } = useAppContext();
    const year = currentMonthDate.getFullYear(), month = currentMonthDate.getMonth(), today = new Date();
    const months = viewMode === 'year' ? MONTHS_SHORT.map((_, i) => i) : viewMode === 'quarter' ? [Math.floor(month/3)*3, Math.floor(month/3)*3+1, Math.floor(month/3)*3+2] : [month];
    const [expandedDepts, setExpandedDepts] = useState([]), [ceoFilter, setCeoFilter] = useState('direct');

    useEffect(() => { if (currentUser.role === 'admin' || currentUser.role === 'ceo') setExpandedDepts(departments); else setExpandedDepts([currentUser.department]); }, [currentUser, departments]);
    const toggleDept = (dept) => { if (expandedDepts.includes(dept)) setExpandedDepts(expandedDepts.filter(d => d !== dept)); else setExpandedDepts([...expandedDepts, dept]); };
    const getVacationForDay = (uid, d) => vacations.find(v => v.userId === uid && d >= new Date(v.startDate).setHours(0,0,0,0) && d <= new Date(v.endDate).setHours(0,0,0,0));
    const isLocalDraftDay = (d) => { if (!localDraft || !localDraft.start || !localDraft.end) return false; return d >= new Date(localDraft.start).setHours(0,0,0,0) && d <= new Date(localDraft.end).setHours(0,0,0,0); };

    const usersByDept = useMemo(() => {
        const grouped = {}; departments.forEach(d => grouped[d] = []);
        users.filter(u => u.role !== 'admin').forEach(u => { 
            if (currentUser.role === 'ceo' && ceoFilter === 'direct') { const isManager = u.role === 'manager', isOrphan = u.role === 'employee' && !users.some(other => other.department === u.department && other.role === 'manager'); if (!isManager && !isOrphan) return; }
            if(grouped[u.department]) grouped[u.department].push(u); 
        });
        if (currentUser.role !== 'admin' && currentUser.role !== 'ceo') { const myDept = currentUser.department; if (grouped[myDept]) grouped[myDept].sort((a, b) => a.id === currentUser.id ? -1 : b.id === currentUser.id ? 1 : 0); }
        return grouped;
    }, [users, departments, currentUser, ceoFilter]);

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white sticky left-0 z-20">
                <div className="font-bold text-gray-800 flex gap-2 text-lg"><Calendar className="w-6 h-6 text-blue-600"/> {viewMode === 'year' ? year : `${FULL_MONTHS[month]} ${year}`}</div>
                <div className="flex gap-3 items-center">
                    {currentUser.role === 'ceo' && (<div className="flex bg-gray-100 p-1 rounded-lg mr-2"><button onClick={()=>setCeoFilter('direct')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${ceoFilter==='direct'?'bg-white text-purple-600 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>Мои подчиненные</button><button onClick={()=>setCeoFilter('all')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${ceoFilter==='all'?'bg-white text-purple-600 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>Все сотрудники</button></div>)}
                    <div className="flex bg-gray-100 p-1 rounded-lg"><button onClick={()=>setViewMode('month')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode==='month'?'bg-white text-blue-600 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>Месяц</button><button onClick={()=>setViewMode('quarter')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode==='quarter'?'bg-white text-blue-600 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>Квартал</button><button onClick={()=>setViewMode('year')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode==='year'?'bg-white text-blue-600 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>Год</button></div>
                    <div className="flex gap-1"><button onClick={onPrev} className="p-2 hover:bg-gray-100 rounded-full text-gray-600"><ChevronLeft className="w-5 h-5"/></button><button onClick={onNext} className="p-2 hover:bg-gray-100 rounded-full text-gray-600"><ChevronRight className="w-5 h-5"/></button></div>
                </div>
            </div>
            <div className="overflow-x-auto relative">
                <div className="min-w-[800px]">
                    <div className="flex border-b border-gray-200 bg-gray-50/50">
                        <div className="w-64 flex-shrink-0 p-3 border-r border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">Сотрудник</div>
                        <div className="flex-grow flex">
                            {months.map(mIdx => {
                                const daysInMonth = new Date(year, mIdx+1, 0).getDate();
                                return viewMode === 'year' ? <div key={`mhdr-${mIdx}`} className="flex-1 text-center text-xs font-semibold py-3 border-r border-gray-200 text-gray-600">{MONTHS_SHORT[mIdx]}</div> : Array.from({length:daysInMonth},(_,i)=>i+1).map(d => {
                                        const currentDate = new Date(year, mIdx, d), isWe = isWeekend(currentDate, holidays), isToday = isSameDay(currentDate, today);
                                        return (<div key={`dhdr-${mIdx}-${d}`} className={`w-8 flex-shrink-0 flex flex-col items-center justify-center text-[10px] py-2 border-r border-gray-200 min-w-[28px] ${isWe ? 'bg-gray-50 text-gray-400' : 'bg-white text-gray-600'} ${isToday ? 'bg-blue-50 text-blue-600 font-bold ring-1 ring-inset ring-blue-200' : ''}`}>{d}</div>)
                                    });
                            })}
                        </div>
                    </div>
                    {departments.map(dept => {
                        const deptUsers = usersByDept[dept];
                        if (!deptUsers || deptUsers.length === 0) return null;
                        return (<React.Fragment key={`dept-${dept}`}>
                            <div onClick={()=>toggleDept(dept)} className="bg-gray-100/80 px-4 py-2 text-xs font-bold uppercase cursor-pointer flex items-center gap-2 hover:bg-gray-200/80 border-b border-gray-200 text-gray-700 sticky left-0 z-10">{expandedDepts.includes(dept)?<ChevronDown className="w-3 h-3"/>:<ChevronRight className="w-3 h-3"/>}{dept}</div>
                            {expandedDepts.includes(dept) && deptUsers.map(u => (
                                <div key={u._docId || u.id} className={`flex border-b border-gray-100 h-10 transition-colors ${u.id===currentUser.id?'bg-blue-50/30 hover:bg-blue-50/50':'hover:bg-gray-50'}`}>
                                    <div className={`w-64 flex-shrink-0 px-4 border-r border-gray-200 flex items-center gap-3 text-sm sticky left-0 z-10 ${u.id===currentUser.id?'bg-blue-50/30 backdrop-blur-sm':'bg-white'}`}><div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center font-bold text-xs text-gray-600 border border-gray-200 shadow-sm">{u.avatar}</div><span className={`truncate ${u.id===currentUser.id ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>{u.name}</span></div>
                                    <div className="flex-grow flex">{months.map(mIdx => {
                                        const days = new Date(year, mIdx+1, 0).getDate();
                                        return viewMode === 'year' ? <div key={`cyear-${u.id}-${mIdx}`} className="flex-1 border-r border-gray-200 relative bg-white">{Array.from({length:days},(_,i)=>i+1).map(d=>{
                                            const dt = new Date(year,mIdx,d).getTime(), v = getVacationForDay(u.id, dt);
                                            return v && v.status === 'approved' ? <div key={`v-${u.id}-${mIdx}-${d}`} className="absolute inset-y-1 bg-blue-500 rounded-sm opacity-90" style={{left:`${(d/days)*100}%`, width: `${100/days}%`}}/> : null;
                                        })}</div> : Array.from({length:days},(_,i)=>i+1).map(d => {
                                            const dt = new Date(year, mIdx, d).getTime(), v = getVacationForDay(u.id, dt), isWe = isWeekend(new Date(year, mIdx, d), holidays), isLocal = u.id === currentUser.id && isLocalDraftDay(dt);
                                            let content = null;
                                            if (isLocal) content = <div className="absolute inset-1 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes-light.png')] bg-indigo-100 border border-indigo-300 rounded-sm animate-pulse" title="Планируется"></div>;
                                            else if (v) { if (v.status === 'approved') content = <div className="absolute inset-1 bg-blue-500 rounded-sm shadow-sm" title="Отпуск"></div>; else if (v.status === 'pending') content = <div className="absolute inset-1 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes-light.png')] bg-amber-200 rounded-sm border border-amber-300" title="На согласовании"></div>; else if (v.status === 'draft') content = <div className="absolute inset-1 border-2 border-dashed border-gray-300 rounded-sm bg-gray-50" title="Черновик"></div>; }
                                            return <div key={`cday-${u.id}-${mIdx}-${d}`} className={`w-8 flex-shrink-0 border-r border-gray-100 relative min-w-[28px] ${isWe ? 'bg-gray-50' : 'bg-white'}`}>{content}</div>
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
const DatabaseBackup = () => {
    const { users, departments, vacations, holidays, authSettings, logAction, deptDocs } = useAppContext();
    const fileRef = useRef(null);

    const handleExport = () => {
        const data = { users, deptDocs, vacations, holidays, authSettings };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `HR_Backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        logAction('SYSTEM_BACKUP', 'Скачан бэкап базы данных (JSON)');
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = JSON.parse(evt.target.result);
                const batch = writeBatch(db);
                if (data.users) data.users.forEach(u => batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'users', u._docId || u.id.toString()), u));
                if (data.vacations) data.vacations.forEach(v => batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'vacations', v._docId || v.id.toString()), v));
                if (data.deptDocs) data.deptDocs.forEach(d => batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'departments', d.id), d));
                if (data.holidays) batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'holidays'), data.holidays);
                if (data.authSettings) batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'auth'), data.authSettings);
                await batch.commit();
                logAction('SYSTEM_RESTORE', 'База восстановлена из бэкапа');
                alert('База данных успешно восстановлена!');
            } catch(err) { alert('Ошибка импорта: ' + err.message); }
        };
        reader.readAsText(file); e.target.value = '';
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><Save className="w-5 h-5 text-gray-500" />Резервное копирование</h3>
            <p className="text-xs text-gray-500 mb-4">Полная выгрузка и загрузка базы данных (пользователи, отпуска, отделы, настройки).</p>
            <div className="flex gap-3">
                <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"><Download className="w-4 h-4"/> Скачать JSON</button>
                <button onClick={() => fileRef.current.click()} className="flex-1 flex items-center justify-center gap-2 bg-orange-50 text-orange-700 py-2 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors"><Upload className="w-4 h-4"/> Загрузить JSON</button>
                <input type="file" ref={fileRef} onChange={handleImport} accept=".json" className="hidden" />
            </div>
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
                        const managers = users.filter(u => u.department === emp?.department && u.role === 'manager');
                        
                        if (emp) console.log(`[EMAIL СЕРВИС] 📧 Кому: Сотруднику (${emp.name}). Тема: Скоро отпуск! Текст: Ваш отпуск начинается ${new Date(v.startDate).toLocaleDateString()}`);
                        managers.forEach(m => console.log(`[EMAIL СЕРВИС] 📧 Кому: Руководителю (${m.name}). Тема: Отпуск в отделе. Текст: Сотрудник ${emp?.name} уходит в отпуск ${new Date(v.startDate).toLocaleDateString()}`));

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
        const uH = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'holidays'), s => { if (s.exists()) { const data = s.data(); const newHolidays = { ...DEFAULT_HOLIDAYS }; for (const k in data) newHolidays[k] = data[k]; setHolidays(newHolidays); Object.assign(GLOBAL_HOLIDAYS, newHolidays); } }, eH);
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

    const contextValue = { currentUser, users, departments, vacations, holidays, authSettings, auditLogs, logAction, deptDocs };

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
                                    <div className="space-y-6"><AuthSettingsManagement /><DatabaseBackup /></div>
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
