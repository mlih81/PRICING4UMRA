import React, { useState, useEffect, useContext, createContext } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  User, Quotation, AppState, RoomType, RoomConfig, Language 
} from './types';
import { 
  DEFAULT_EXCHANGE_RATE, INITIAL_ROOM_CONFIG, TRANSLATIONS, 
  DEFAULT_MAZARAT_PRICE_MAD, DEFAULT_FAQIH_PRICE_MAD 
} from './constants';
import { generatePDF, calculateQuotation } from './services/pdfGenerator';
import { 
  LayoutDashboard, FilePlus, Settings, LogOut, Plane, CheckCircle,
  FileText, UserPlus, Download, Plus, Trash2, Globe, BedDouble, MapPin, Bus, Stamp, Star, Upload, Image as ImageIcon, Menu, X
} from 'lucide-react';

// --- Global Styles ---
// Theme Colors:
// Background (Deep Navy): #0f172a (slate-900)
// Card/Section (Charcoal/Slate): #1e293b (slate-800)
// Input (Medium-Dark Gray): #334155 (slate-700)
// Text Main: #ffffff
// Text Label: #94a3b8 (slate-400)
// Accent: #d4af37 (Gold)

const INPUT_BASE = "bg-[#334155] text-white border border-gray-600 rounded-lg placeholder-gray-400 focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] outline-none transition-all shadow-sm";

const INPUT_CLASS = `w-full p-3 ${INPUT_BASE}`;
const SELECT_CLASS = `p-3 font-medium ${INPUT_BASE}`;
const SMALL_INPUT_CLASS = `p-2 text-center ${INPUT_BASE}`;

const LABEL_CLASS = "block text-sm text-[#94a3b8] mb-1 font-sans font-medium";
const SECTION_TITLE_CLASS = "text-[#d4af37] font-bold uppercase tracking-wider text-lg mb-4 font-serif";
const CARD_CLASS = "bg-[#1e293b] p-6 rounded-xl border border-gray-700 shadow-lg";
const PAGE_BG = "bg-[#0f172a] min-h-screen text-white";

// --- Context ---
interface AppContextType extends AppState {
  login: (email: string, pass: string) => boolean;
  signup: (name: string, email: string, pass: string) => boolean;
  logout: () => void;
  updateSettings: (rate: number, logo: string | null) => boolean; // Return success status
  saveQuotation: (q: Quotation) => void;
  deleteQuotation: (id: string) => void;
  setLanguage: (lang: Language) => void;
}

const AppContext = createContext<AppContextType | null>(null);

// --- Helpers ---
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

// --- Components ---

const Sidebar = ({ mobile, closeMobile }: { mobile?: boolean, closeMobile?: () => void }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const ctx = useContext(AppContext);
  const t = TRANSLATIONS[ctx?.language || 'en'];

  const menu = [
    { icon: LayoutDashboard, label: t.dashboard, path: '/dashboard' },
    { icon: FilePlus, label: t.newQuote, path: '/quote/new' },
    { icon: Settings, label: t.settings, path: '/settings' },
  ];

  const handleNav = (path: string) => {
    navigate(path);
    if (mobile && closeMobile) closeMobile();
  };

  return (
    <div className={`${mobile ? 'fixed inset-0 z-50 bg-[#0f172a]' : 'w-64 min-h-screen border-r border-gray-800'} bg-[#0f172a] text-white flex flex-col shadow-2xl transition-all`}>
      {mobile && (
        <button onClick={closeMobile} className="absolute top-4 right-4 text-white p-2">
          <X size={24} />
        </button>
      )}
      <div className="p-6 border-b border-gray-800 flex flex-col items-center">
        {ctx?.agencyLogo ? (
          <img src={ctx.agencyLogo} alt="Agency Logo" className="h-20 w-auto object-contain mb-3 bg-white rounded p-1" />
        ) : (
          <div className="h-16 w-16 bg-[#d4af37] rounded-full flex items-center justify-center text-[#0f172a] font-bold mb-3 text-xl shadow-lg border-2 border-white">MHT</div>
        )}
        <h1 className="text-xl font-serif text-[#d4af37] font-bold tracking-widest text-center">MHT TRAVEL</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {menu.map(item => (
          <button
            key={item.path}
            onClick={() => handleNav(item.path)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              location.pathname === item.path 
                ? 'bg-[#d4af37] text-[#0f172a] font-bold shadow-md' 
                : 'hover:bg-[#1e293b] text-gray-300'
            }`}
          >
            <item.icon size={20} />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-2 mb-4">
           {['en', 'fr', 'ar'].map((l) => (
             <button 
               key={l}
               onClick={() => ctx?.setLanguage(l as Language)}
               className={`flex-1 text-xs py-1 rounded border transition-colors ${ctx?.language === l ? 'bg-[#d4af37] text-black border-[#d4af37] font-bold' : 'border-gray-600 text-gray-400 hover:border-gray-400'}`}
             >
               {l.toUpperCase()}
             </button>
           ))}
        </div>
        <button 
          onClick={ctx?.logout}
          className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-[#1e293b] rounded-lg text-sm transition-colors"
        >
          <LogOut size={16} /> {t.logout}
        </button>
      </div>
    </div>
  );
};

// --- Pages ---

const Login = () => {
  // Initialize email with last used email if available
  const [email, setEmail] = useState(() => localStorage.getItem('mht_last_email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const ctx = useContext(AppContext);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (ctx?.login(email, password)) {
      localStorage.setItem('mht_last_email', email); // Remember email for next time
      navigate('/dashboard');
    } else {
      setError('Invalid email or password.');
    }
  };

  return (
    <div className={`${PAGE_BG} flex items-center justify-center p-4`}>
      <div className={`${CARD_CLASS} w-full max-w-md p-8 border-t-4 border-t-[#d4af37]`}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-[#d4af37] font-bold tracking-widest">MHT TRAVEL</h1>
          <p className="text-gray-400 mt-2 text-sm uppercase tracking-wide">Agent Portal Login</p>
        </div>
        {error && <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm text-center">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className={LABEL_CLASS}>Email Address</label>
            <input 
              type="email" 
              name="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={INPUT_CLASS}
              required 
              placeholder="name@agency.com"
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Password</label>
            <input 
              type="password" 
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={INPUT_CLASS}
              required 
              placeholder="Enter your password"
            />
          </div>
          <button className="w-full bg-[#d4af37] text-[#0f172a] font-bold py-3 rounded-lg hover:bg-[#b5952f] transition-colors uppercase tracking-wide">
            Login
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link to="/signup" className="text-[#d4af37] hover:text-white transition-colors text-sm">Register New Agent</Link>
        </div>
      </div>
    </div>
  );
};

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const ctx = useContext(AppContext);
  const navigate = useNavigate();

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (ctx?.signup(name, email, password)) {
      localStorage.setItem('mht_last_email', email); // Remember email
      navigate('/dashboard');
    } else {
      setError('Email already exists.');
    }
  };

  return (
    <div className={`${PAGE_BG} flex items-center justify-center p-4`}>
      <div className={`${CARD_CLASS} w-full max-w-md p-8 border-t-4 border-t-[#d4af37]`}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-[#d4af37] font-bold tracking-widest">MHT TRAVEL</h1>
          <p className="text-gray-400 mt-2 text-sm uppercase tracking-wide">Agent Registration</p>
        </div>
        {error && <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm text-center">{error}</div>}
        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className={LABEL_CLASS}>Full Name</label>
            <input 
              type="text" 
              name="name"
              autoComplete="name"
              value={name}
              onChange={e => setName(e.target.value)}
              className={INPUT_CLASS}
              required 
              placeholder="Your Name"
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Email Address</label>
            <input 
              type="email" 
              name="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={INPUT_CLASS}
              required 
              placeholder="name@agency.com"
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Password</label>
            <input 
              type="password" 
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={INPUT_CLASS}
              required 
              placeholder="Choose a password"
            />
          </div>
          <button className="w-full bg-[#d4af37] text-[#0f172a] font-bold py-3 rounded-lg hover:bg-[#b5952f] transition-colors flex items-center justify-center gap-2 uppercase tracking-wide">
            <UserPlus size={18} /> Sign Up
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link to="/" className="text-[#d4af37] hover:text-white transition-colors text-sm">Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const ctx = useContext(AppContext);
  const navigate = useNavigate();
  const t = TRANSLATIONS[ctx?.language || 'en'];

  return (
    <div className={`${PAGE_BG} p-4 md:p-8`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-white">{t.dashboard}</h2>
        </div>
        <button 
          onClick={() => navigate('/quote/new')}
          className="w-full md:w-auto bg-[#d4af37] text-[#0f172a] px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-[#b5952f] shadow-lg transition-colors uppercase tracking-wide text-sm"
        >
          <Plus size={20} /> {t.newQuote}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className={CARD_CLASS}>
          <div className="flex justify-between items-start">
            <div>
              <p className={LABEL_CLASS}>{t.totalQuotes}</p>
              <h3 className="text-3xl font-bold text-white">{ctx?.quotations.length}</h3>
            </div>
            <div className="p-3 bg-blue-900/30 text-blue-400 rounded-lg">
              <FileText size={24} />
            </div>
          </div>
        </div>
        <div className={CARD_CLASS}>
          <div className="flex justify-between items-start">
            <div>
              <p className={LABEL_CLASS}>{t.confirmed}</p>
              <h3 className="text-3xl font-bold text-green-400">
                {ctx?.quotations.filter(q => q.status === 'Confirmed').length}
              </h3>
            </div>
            <div className="p-3 bg-green-900/30 text-green-400 rounded-lg">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>
        <div className={CARD_CLASS}>
          <div className="flex justify-between items-start">
            <div>
              <p className={LABEL_CLASS}>{t.currentRate}</p>
              <h3 className="text-3xl font-bold text-[#d4af37]">{ctx?.exchangeRate} MAD</h3>
            </div>
            <div className="p-3 bg-yellow-900/30 text-[#d4af37] rounded-lg">
              <Globe size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className={`${CARD_CLASS} overflow-hidden p-0`}>
        <div className="p-6 border-b border-gray-700">
          <h3 className={SECTION_TITLE_CLASS.replace('mb-4', 'mb-0')}>{t.recentQuotes}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0f172a] text-[#94a3b8]">
              <tr>
                <th className="p-4 uppercase tracking-wider font-semibold">{t.reference}</th>
                <th className="p-4 uppercase tracking-wider font-semibold">{t.client}</th>
                <th className="p-4 uppercase tracking-wider font-semibold">{t.date}</th>
                <th className="p-4 uppercase tracking-wider font-semibold">{t.pax}</th>
                <th className="p-4 uppercase tracking-wider font-semibold">{t.status}</th>
                <th className="p-4 text-right uppercase tracking-wider font-semibold">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {ctx?.quotations.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No quotations found.</td></tr>
              ) : ctx?.quotations.map(q => (
                <tr key={q.id} className="hover:bg-[#334155]/30 transition-colors">
                  <td className="p-4 font-medium text-[#d4af37]">{q.reference}</td>
                  <td className="p-4 text-white">{q.clientName}</td>
                  <td className="p-4 text-gray-300">{new Date(q.createdAt).toLocaleDateString()}</td>
                  <td className="p-4 text-gray-300">{q.paxCount}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      q.status === 'Confirmed' ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    {q.status === 'Confirmed' && (
                      <>
                         <button 
                          onClick={() => generatePDF(q, 'CLIENT', ctx.agencyLogo)}
                          className="p-2 text-blue-400 hover:bg-blue-900/30 rounded transition-colors" 
                          title="Client PDF"
                        >
                          <Download size={16} />
                        </button>
                        <button 
                          onClick={() => generatePDF(q, 'AGENCY', ctx.agencyLogo)}
                          className="p-2 text-[#d4af37] hover:bg-yellow-900/30 rounded transition-colors" 
                          title="Agency PDF"
                        >
                          <FileText size={16} />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => ctx.deleteQuotation(q.id)}
                      className="p-2 text-red-400 hover:bg-red-900/30 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const ctx = useContext(AppContext);
  const [rate, setRate] = useState(ctx?.exchangeRate || DEFAULT_EXCHANGE_RATE);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const t = TRANSLATIONS[ctx?.language || 'en'];

  // Initialize preview with current logo ONLY once on mount
  useEffect(() => {
    if (ctx?.agencyLogo) {
      setLogoPreview(ctx.agencyLogo);
    }
  }, [ctx?.agencyLogo]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        alert("File too large! Please upload a logo smaller than 500KB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setLogoPreview(reader.result as string);
        }
      };
      reader.onerror = () => {
        alert("Failed to read file.");
      }
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (ctx?.updateSettings(Number(rate), logoPreview)) {
       alert('Settings Saved Successfully!');
    } else {
       alert('Error: Could not save settings. Storage limit exceeded. Please try a smaller logo.');
    }
  };

  return (
    <div className={`${PAGE_BG} p-8 max-w-2xl`}>
      <h2 className="text-3xl font-serif font-bold text-white mb-8">{t.settings}</h2>
      
      <div className={`${CARD_CLASS} space-y-8`}>
        {/* Only Admin can change the global exchange rate */}
        {ctx?.user?.role === 'Admin' && (
          <div>
            <label className={LABEL_CLASS}>Default Exchange Rate (SAR to MAD)</label>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                step="0.01"
                value={rate} 
                onChange={e => setRate(Number(e.target.value))}
                className={INPUT_CLASS}
              />
              <span className="text-[#d4af37] font-bold">MAD</span>
            </div>
          </div>
        )}

        <div>
          <label className={LABEL_CLASS}>{t.uploadLogo}</label>
          <p className="text-xs text-gray-400 mb-2">Supported formats: PNG, JPG. Max size: 500KB. This logo will appear on all PDFs.</p>
          <div className="flex flex-col items-center justify-center w-full gap-4 mt-2">
            
            {/* Explicit ID binding for File Input to guarantee trigger */}
            <input 
              id="logo-upload"
              type="file" 
              className="hidden" 
              accept="image/png, image/jpeg, image/jpg" 
              onChange={handleLogoUpload}
              onClick={(e) => e.currentTarget.value = ''} // Allow re-selecting same file
            />
            
            <label 
              htmlFor="logo-upload"
              className="relative z-10 w-[240px] h-[70px] bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] border-[3px] border-white text-white font-bold rounded-lg shadow-xl flex items-center justify-center gap-3 hover:scale-105 transition-transform cursor-pointer transform hover:-translate-y-1"
            >
                <Upload className="w-8 h-8 text-white drop-shadow-md" />
                <span className="text-lg drop-shadow-md uppercase tracking-wide">Upload Logo</span>
            </label>
            
            {logoPreview ? (
              <div className="mt-4 p-4 border border-gray-600 rounded bg-[#334155] flex flex-col items-center w-full animate-fade-in">
                <span className="text-xs text-[#d4af37] mb-2 font-bold uppercase tracking-wider">Current / New Preview:</span>
                <img src={logoPreview} alt="Logo Preview" className="h-24 object-contain bg-white rounded p-1 shadow-lg" />
              </div>
            ) : (
              <div className="mt-2 text-gray-500 flex flex-col items-center">
                 <ImageIcon size={40} className="mb-2 opacity-50" />
                 <span className="text-xs">No logo uploaded yet</span>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full bg-[#d4af37] text-[#0f172a] font-bold py-3 rounded-lg hover:bg-[#b5952f] transition-colors uppercase tracking-wide shadow-lg"
        >
          Save Configuration
        </button>
      </div>
    </div>
  );
};

// --- Quote Builder Refactored ---

const QuoteBuilder = () => {
  const ctx = useContext(AppContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const t = TRANSLATIONS[ctx?.language || 'en'];

  // Core Data
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [rooms, setRooms] = useState<RoomConfig[]>(INITIAL_ROOM_CONFIG);
  
  // Per-Quote Settings
  const [quoteExchangeRate, setQuoteExchangeRate] = useState(ctx?.exchangeRate || DEFAULT_EXCHANGE_RATE);
  
  // Flights & Extras
  const [hasFlight, setHasFlight] = useState(true);
  const [airline, setAirline] = useState('Royal Air Maroc');
  const [flightPriceMAD, setFlightPriceMAD] = useState(5000); 

  const [hasTransfer, setHasTransfer] = useState(true);
  const [transferPrice, setTransferPrice] = useState(200);
  const [transferDetails, setTransferDetails] = useState('');

  const [hasVisa, setHasVisa] = useState(true);
  const [visaPrice, setVisaPrice] = useState(1500);

  // Extra Services Configuration
  const [hasMazarat, setHasMazarat] = useState(false);
  const [hasFaqih, setHasFaqih] = useState(false);

  // Financials State
  const [extraServicesPerPerson, setExtraServicesPerPerson] = useState(0);
  const [commissionPerPerson, setCommissionPerPerson] = useState(200);
  const [marginPerPerson, setMarginPerPerson] = useState(500);

  const totalPax = rooms.reduce((acc, r) => acc + (r.count * r.paxPerRoom), 0);

  useEffect(() => {
    let suggested = 0;
    if (hasMazarat) suggested += DEFAULT_MAZARAT_PRICE_MAD;
    if (hasFaqih) suggested += DEFAULT_FAQIH_PRICE_MAD;
    setExtraServicesPerPerson(suggested);
  }, [hasMazarat, hasFaqih]);


  // Room Handler
  const updateRoom = (id: string, field: keyof RoomConfig, value: any) => {
    setRooms(rooms.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (field === 'type') {
        updated.paxPerRoom = value === 'Single' ? 1 : value === 'Double' ? 2 : value === 'Triple' ? 3 : 4;
      }
      return updated;
    }));
  };

  const addRoom = () => {
    if (rooms.length >= 5) return;
    const newRoom: RoomConfig = {
      id: Date.now().toString(),
      type: RoomType.DOUBLE,
      count: 1,
      paxPerRoom: 2,
      hasMadinah: true, madinahHotel: '', madinahNights: 3, madinahPricePerPersonSAR: 0,
      hasMakkah: true, makkahHotel: '', makkahNights: 5, makkahPricePerPersonSAR: 0
    };
    setRooms([...rooms, newRoom]);
  };

  const removeRoom = (id: string) => {
    if (rooms.length > 1) {
      setRooms(rooms.filter(r => r.id !== id));
    }
  };

  const handleConfirm = () => {
    const year = new Date().getFullYear();
    const count = (ctx?.quotations.length || 0) + 1;
    const paddedCount = count.toString().padStart(4, '0');
    const reference = `QT-${year}${paddedCount}`;

    const q: Quotation = {
      id: Date.now().toString(),
      reference,
      clientName, clientEmail, clientPhone, paxCount: totalPax,
      createdAt: new Date().toISOString(),
      status: 'Confirmed',
      language: ctx?.language || 'en',
      exchangeRate: quoteExchangeRate,
      rooms,
      hasFlight, airline, flightPriceMAD,
      hasTransfer, transferPriceSAR: transferPrice, transferDetails,
      hasVisa, visaPriceSAR: visaPrice,
      hasMazarat, hasFaqih,
      otherServices: [],
      extraServicesMADPerPerson: extraServicesPerPerson,
      commissionMADPerPerson: commissionPerPerson,
      agencyMarginMADPerPerson: marginPerPerson
    };
    ctx?.saveQuotation(q);
    generatePDF(q, 'CLIENT', ctx?.agencyLogo || null);
    generatePDF(q, 'AGENCY', ctx?.agencyLogo || null);
    navigate('/dashboard');
  };

  const previewData = calculateQuotation({
    rooms, hasFlight, flightPriceMAD, hasTransfer, transferPriceSAR: transferPrice, transferDetails, hasVisa, visaPriceSAR: visaPrice, 
    hasMazarat, hasFaqih,
    otherServices: [], 
    extraServicesMADPerPerson: extraServicesPerPerson,
    commissionMADPerPerson: commissionPerPerson,
    agencyMarginMADPerPerson: marginPerPerson,
    exchangeRate: quoteExchangeRate, paxCount: totalPax
  } as Quotation);

  const steps = [
    { label: t.step1, icon: BedDouble },
    { label: t.step2, icon: Plane },
    { label: t.step3, icon: CheckCircle },
  ];

  return (
    <div className={`${PAGE_BG} p-4 md:p-8 pb-24 max-w-5xl mx-auto ${ctx?.language === 'ar' ? 'rtl' : ''}`} dir={ctx?.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-serif font-bold text-white tracking-wide">{t.newQuote}</h2>
        <div className="flex gap-4">
          <div className="bg-[#1e293b] border border-gray-600 p-2 rounded-lg flex flex-col items-center shadow-md">
             <span className="text-[10px] text-[#d4af37] font-bold uppercase tracking-wider">{t.sarToMadRate}</span>
             <input 
               type="number" 
               step="0.01"
               className={`w-24 ${SMALL_INPUT_CLASS}`} 
               value={quoteExchangeRate} 
               onChange={e => setQuoteExchangeRate(Number(e.target.value))} 
             />
          </div>
          <div className="bg-[#d4af37] text-[#0f172a] px-4 py-2 rounded-lg text-center shadow-md">
             <p className="text-xs uppercase tracking-wider font-bold">{t.pax}</p>
             <p className="text-2xl font-bold">{totalPax}</p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="flex mb-8 bg-[#1e293b] p-2 rounded-xl shadow-md border border-gray-700">
        {steps.map((step, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${
              activeTab === idx ? 'bg-[#d4af37] text-[#0f172a] font-bold shadow-md' : 'text-gray-400 hover:bg-[#334155]'
            }`}
          >
            <step.icon size={18} /> <span className="hidden md:inline uppercase tracking-wide text-xs">{step.label}</span>
          </button>
        ))}
      </div>

      <div className={`${CARD_CLASS} shadow-xl`}>
        
        {/* Step 1: Accommodation */}
        {activeTab === 0 && (
          <div className="space-y-8">
            <h3 className={SECTION_TITLE_CLASS}>Client Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={LABEL_CLASS}>{t.clientName}</label>
                <input className={INPUT_CLASS} value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Full Name" />
              </div>
              <div>
                <label className={LABEL_CLASS}>{t.mobile}</label>
                <input className={INPUT_CLASS} value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+212 6..." />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-700">
              <div className="flex justify-between items-center mb-6">
                 <h3 className={SECTION_TITLE_CLASS.replace('mb-4', 'mb-0')}>{t.roomConfig}</h3>
                 <button onClick={addRoom} className="text-xs bg-[#d4af37] text-[#0f172a] px-3 py-2 rounded font-bold flex items-center gap-1 hover:bg-[#b5952f] transition-colors uppercase tracking-wide">
                   <Plus size={16} /> {t.addRoom}
                 </button>
              </div>

              <div className="space-y-6">
                {rooms.map((room, idx) => (
                  <div key={room.id} className="border border-gray-600 rounded-xl overflow-hidden bg-[#0f172a]/50">
                    <div className="bg-[#1e293b] p-4 flex justify-between items-center border-b border-gray-600">
                      <div className="flex items-center gap-4">
                         <span className="font-bold text-[#d4af37] text-lg">#{idx + 1}</span>
                         <select 
                           className={SELECT_CLASS}
                           value={room.type}
                           onChange={e => updateRoom(room.id, 'type', e.target.value)}
                         >
                           {Object.values(RoomType).map(t => <option key={t} value={t}>{t}</option>)}
                         </select>
                         <div className="flex items-center gap-2">
                           <span className="text-xs text-gray-400 uppercase font-bold">Qty:</span>
                           <input 
                             type="number" min="1" 
                             className={`w-20 ${SMALL_INPUT_CLASS}`}
                             value={room.count} 
                             onChange={e => updateRoom(room.id, 'count', parseInt(e.target.value))} 
                           />
                         </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Subtotal</p>
                          <p className="font-bold text-[#d4af37]">
                             {((room.madinahPricePerPersonSAR * room.madinahNights) + (room.makkahPricePerPersonSAR * room.makkahNights)).toLocaleString()} SAR/pp
                          </p>
                        </div>
                        <button onClick={() => removeRoom(room.id)} className="text-red-400 hover:text-red-300 p-2 rounded transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </div>

                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                       {/* Madinah Section */}
                       <div className="space-y-4">
                         <div className="flex items-center justify-between text-green-400 font-bold text-sm bg-green-900/20 p-2 rounded border border-green-900/50">
                            <span className="flex items-center gap-2 uppercase tracking-wide"><MapPin size={14} /> {t.madinah}</span>
                            <input type="checkbox" checked={room.hasMadinah} onChange={e => updateRoom(room.id, 'hasMadinah', e.target.checked)} className="accent-green-500 w-4 h-4" />
                         </div>
                         {room.hasMadinah && (
                           <>
                             <div>
                               <label className={LABEL_CLASS}>{t.hotelName}</label>
                               <input 
                                 placeholder="Enter Hotel Name" 
                                 className={INPUT_CLASS}
                                 value={room.madinahHotel}
                                 onChange={e => updateRoom(room.id, 'madinahHotel', e.target.value)}
                               />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                               <div>
                                 <label className={LABEL_CLASS}>{t.nights}</label>
                                 <input type="number" className={INPUT_CLASS} value={room.madinahNights} onChange={e => updateRoom(room.id, 'madinahNights', Number(e.target.value))} />
                               </div>
                               <div>
                                 <label className={LABEL_CLASS}>{t.pricePerPax}</label>
                                 <input type="number" className={INPUT_CLASS} value={room.madinahPricePerPersonSAR} onChange={e => updateRoom(room.id, 'madinahPricePerPersonSAR', Number(e.target.value))} />
                               </div>
                             </div>
                           </>
                         )}
                       </div>

                       {/* Makkah Section */}
                       <div className="space-y-4">
                         <div className="flex items-center justify-between text-[#d4af37] font-bold text-sm bg-yellow-900/20 p-2 rounded border border-yellow-900/50">
                            <span className="flex items-center gap-2 uppercase tracking-wide"><MapPin size={14} /> {t.makkah}</span>
                            <input type="checkbox" checked={room.hasMakkah} onChange={e => updateRoom(room.id, 'hasMakkah', e.target.checked)} className="accent-[#d4af37] w-4 h-4" />
                         </div>
                         {room.hasMakkah && (
                           <>
                             <div>
                               <label className={LABEL_CLASS}>{t.hotelName}</label>
                               <input 
                                 placeholder="Enter Hotel Name" 
                                 className={INPUT_CLASS}
                                 value={room.makkahHotel}
                                 onChange={e => updateRoom(room.id, 'makkahHotel', e.target.value)}
                               />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                               <div>
                                 <label className={LABEL_CLASS}>{t.nights}</label>
                                 <input type="number" className={INPUT_CLASS} value={room.makkahNights} onChange={e => updateRoom(room.id, 'makkahNights', Number(e.target.value))} />
                               </div>
                               <div>
                                 <label className={LABEL_CLASS}>{t.pricePerPax}</label>
                                 <input type="number" className={INPUT_CLASS} value={room.makkahPricePerPersonSAR} onChange={e => updateRoom(room.id, 'makkahPricePerPersonSAR', Number(e.target.value))} />
                               </div>
                             </div>
                           </>
                         )}
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Flight & Extras */}
        {activeTab === 1 && (
          <div className="space-y-8">
            {/* Flight */}
            <div className="bg-[#0f172a] p-6 rounded-xl border border-gray-700">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-lg flex items-center gap-2 text-blue-400 uppercase tracking-wide"><Plane size={20} /> {t.flightDetails}</h3>
                 <input type="checkbox" checked={hasFlight} onChange={e => setHasFlight(e.target.checked)} className="w-5 h-5 accent-blue-500" />
               </div>
               {hasFlight && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                     <label className={LABEL_CLASS}>{t.airline}</label>
                     <input className={INPUT_CLASS} placeholder="Airline Name" value={airline} onChange={e => setAirline(e.target.value)} />
                   </div>
                   <div className="relative">
                      <label className={LABEL_CLASS}>{t.priceMadPax}</label>
                      <input className={INPUT_CLASS} type="number" value={flightPriceMAD} onChange={e => setFlightPriceMAD(Number(e.target.value))} />
                   </div>
                 </div>
               )}
            </div>

            {/* Visa & Transfers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="p-6 bg-[#0f172a] border border-gray-700 rounded-xl">
                  <div className="flex justify-between mb-4">
                    <span className="font-bold flex items-center gap-2 text-white uppercase tracking-wide"><Stamp size={16} /> {t.visaFees}</span>
                    <input type="checkbox" checked={hasVisa} onChange={e => setHasVisa(e.target.checked)} className="accent-[#d4af37] w-5 h-5" />
                  </div>
                  {hasVisa && (
                    <div className="relative">
                      <label className={LABEL_CLASS}>Price (SAR/Pax)</label>
                      <input type="number" className={INPUT_CLASS} value={visaPrice} onChange={e => setVisaPrice(Number(e.target.value))} />
                    </div>
                  )}
               </div>
               <div className="p-6 bg-[#0f172a] border border-gray-700 rounded-xl">
                  <div className="flex justify-between mb-4">
                    <span className="font-bold flex items-center gap-2 text-white uppercase tracking-wide"><Bus size={16} /> {t.transfers}</span>
                    <input type="checkbox" checked={hasTransfer} onChange={e => setHasTransfer(e.target.checked)} className="accent-[#d4af37] w-5 h-5" />
                  </div>
                  {hasTransfer && (
                    <div className="space-y-4">
                      <div>
                        <label className={LABEL_CLASS}>Price (SAR/Pax)</label>
                        <input type="number" className={INPUT_CLASS} value={transferPrice} onChange={e => setTransferPrice(Number(e.target.value))} />
                      </div>
                      <div>
                         <label className={LABEL_CLASS}>Transfer Details</label>
                         <textarea
                           className={`${INPUT_CLASS} h-24 resize-none`}
                           placeholder={t.transferDetailsPlaceholder}
                           value={transferDetails}
                           onChange={e => setTransferDetails(e.target.value)}
                         />
                      </div>
                    </div>
                  )}
               </div>
            </div>

            {/* Extra Services Checkboxes */}
            <div className="bg-[#0f172a] p-6 rounded-xl border border-yellow-900/30">
               <h3 className="font-bold text-lg mb-4 text-[#d4af37] flex items-center gap-2 uppercase tracking-wide"><Star size={20} /> Included Services (Select for PDF)</h3>
               <div className="flex gap-6 text-white">
                 <label className="flex items-center gap-2 cursor-pointer p-3 bg-[#334155] rounded border border-gray-600 hover:border-[#d4af37] transition-colors">
                   <input type="checkbox" checked={hasMazarat} onChange={e => setHasMazarat(e.target.checked)} className="w-5 h-5 accent-[#d4af37]" />
                   <span className="font-bold">{t.mazarat}</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer p-3 bg-[#334155] rounded border border-gray-600 hover:border-[#d4af37] transition-colors">
                   <input type="checkbox" checked={hasFaqih} onChange={e => setHasFaqih(e.target.checked)} className="w-5 h-5 accent-[#d4af37]" />
                   <span className="font-bold">{t.faqih}</span>
                 </label>
               </div>
            </div>

            {/* Financials - PER PERSON Logic */}
            <div className="p-6 bg-[#0f172a] rounded-xl border border-gray-700">
              <h3 className={SECTION_TITLE_CLASS}>{t.financials}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Extra Services (Per Person) */}
                <div>
                   <label className={LABEL_CLASS}>{t.extraLabel}</label>
                   <div className="relative">
                     <input 
                       className={INPUT_CLASS} 
                       type="number" 
                       value={extraServicesPerPerson} 
                       onChange={e => setExtraServicesPerPerson(Number(e.target.value))} 
                     />
                   </div>
                   <p className="text-[10px] text-gray-500 mt-2 text-right">
                     {fmt(extraServicesPerPerson, 'MAD')} × {totalPax} = <span className="text-[#d4af37] font-bold">{fmt(extraServicesPerPerson * totalPax, 'MAD')}</span>
                   </p>
                </div>

                {/* 2. Agent Commission (Per Person) */}
                <div>
                   <label className={LABEL_CLASS}>{t.commissionLabel}</label>
                   <div className="relative">
                     <input 
                       className={INPUT_CLASS} 
                       type="number" 
                       value={commissionPerPerson} 
                       onChange={e => setCommissionPerPerson(Number(e.target.value))} 
                     />
                   </div>
                   <p className="text-[10px] text-gray-500 mt-2 text-right">
                     {fmt(commissionPerPerson, 'MAD')} × {totalPax} = <span className="text-[#d4af37] font-bold">{fmt(commissionPerPerson * totalPax, 'MAD')}</span>
                   </p>
                </div>

                {/* 3. Agency Margin (Per Person) */}
                <div>
                   <label className={LABEL_CLASS}>{t.agencyMargin}</label>
                   <div className="relative">
                     <input 
                       className={INPUT_CLASS} 
                       type="number" 
                       value={marginPerPerson} 
                       onChange={e => setMarginPerPerson(Number(e.target.value))} 
                     />
                   </div>
                   <p className="text-[10px] text-gray-500 mt-2 text-right">
                     {fmt(marginPerPerson, 'MAD')} × {totalPax} = <span className="text-[#d4af37] font-bold">{fmt(marginPerPerson * totalPax, 'MAD')}</span>
                   </p>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {activeTab === 2 && (
          <div className="space-y-6">
            <h3 className={`${SECTION_TITLE_CLASS} text-center`}>{t.summary}</h3>
            
            <div className="bg-[#0f172a] p-6 rounded-xl space-y-4 border border-gray-700">
               {previewData.rows.map((row, i) => (
                 <div key={i} className="flex justify-between items-center border-b border-gray-700 pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-bold text-[#d4af37] text-lg uppercase tracking-wide">{row.roomType} Room</p>
                      <p className="text-sm text-gray-400">{row.count} room(s) × {row.paxPerRoom} pax</p>
                    </div>
                    <div className="text-right">
                       <p className="font-bold text-xl text-white">{fmt(row.perPerson.finalMAD, 'MAD')}</p>
                       <p className="text-xs text-gray-500 uppercase tracking-wider">per person</p>
                    </div>
                 </div>
               ))}
               <div className="pt-6 mt-4 border-t border-gray-600 flex justify-between items-center">
                 <span className="font-bold text-xl text-gray-300 uppercase tracking-widest">{t.totalGlobal}</span>
                 <span className="font-bold text-3xl text-[#d4af37]">{fmt(previewData.grandTotalMAD, 'MAD')}</span>
               </div>
            </div>

            <div className="bg-yellow-900/20 p-4 rounded text-sm text-[#d4af37] border border-yellow-900/50 flex gap-3 items-start">
               <span className="font-bold text-lg">NB:</span>
               <p>{t.nbText}</p>
            </div>

            <button 
              onClick={handleConfirm}
              className="w-full bg-[#d4af37] text-[#0f172a] font-bold py-4 rounded-xl text-lg hover:bg-[#b5952f] shadow-xl uppercase tracking-widest transition-all transform hover:scale-[1.01]"
            >
              {t.confirmBtn}
            </button>
          </div>
        )}

      </div>

      {/* Nav */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-[#0f172a] p-4 border-t border-gray-800 flex justify-between z-10 shadow-lg">
         <button 
           disabled={activeTab === 0}
           onClick={() => setActiveTab(p => p - 1)}
           className="px-6 py-3 rounded bg-[#334155] text-white disabled:opacity-50 font-bold uppercase tracking-wide hover:bg-[#475569] transition-colors"
         >
           Back
         </button>
         {activeTab < 2 && (
           <button 
             onClick={() => setActiveTab(p => p + 1)}
             className="px-8 py-3 rounded bg-[#d4af37] text-[#0f172a] font-bold uppercase tracking-wide hover:bg-[#b5952f] transition-colors shadow-lg"
           >
             Next Step
           </button>
         )}
      </div>
    </div>
  );
};

// ... Helper for format ...
const fmt = (num: number, currency: string) => `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

// --- Main App Logic ---

const App = () => {
  // Initialize Users lazily to avoid race conditions
  // NOTE: Changed key to 'mht_users_v2' to reset legacy data preventing signup
  const [users, setUsers] = useState<User[]>(() => {
    return loadFromStorage<User[]>('mht_users_v2', []); 
  });

  // Initialize Session lazily
  const [user, setUser] = useState<User | null>(() => {
    return loadFromStorage<User | null>('mht_active_user', null);
  });

  // Data State
  const [quotations, setQuotations] = useState<Quotation[]>(() => loadFromStorage<Quotation[]>('mht_quotes', []));
  
  // Settings State
  const initialSettings = loadFromStorage<{rate: number, logo: string|null}>('mht_settings', { rate: DEFAULT_EXCHANGE_RATE, logo: null });
  const [exchangeRate, setExchangeRate] = useState(initialSettings.rate);
  const [agencyLogo, setAgencyLogo] = useState<string | null>(initialSettings.logo);

  // Language State
  const [language, setLanguage] = useState<Language>(() => loadFromStorage<Language>('mht_lang', 'en'));
  
  // Mobile Menu State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync active user session to storage
  useEffect(() => {
    if (user) {
      localStorage.setItem('mht_active_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('mht_active_user');
    }
  }, [user]);

  const updateLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('mht_lang', lang);
  }

  const login = (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const foundUser = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === pass);
    if (foundUser) {
      setUser(foundUser);
      return true;
    }
    return false;
  };

  const signup = (name: string, email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    
    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return false;
    }

    const role = cleanEmail === 'mlih.abdell@gmail.com' ? 'Admin' : 'Agent';
    
    const newUser: User = {
      id: Date.now().toString(),
      name,
      email: cleanEmail,
      password: pass,
      role
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('mht_users_v2', JSON.stringify(updatedUsers)); // Save to new key
    
    setUser(newUser); 
    return true;
  };

  const logout = () => {
    setUser(null);
  };

  const updateSettings = (rate: number, logo: string | null) => {
    try {
        setExchangeRate(rate);
        setAgencyLogo(logo);
        localStorage.setItem('mht_settings', JSON.stringify({ rate, logo }));
        return true;
    } catch (e) {
        console.error("Storage limit exceeded:", e);
        return false;
    }
  };

  const saveQuotation = (q: Quotation) => {
    const updated = [q, ...quotations];
    setQuotations(updated);
    localStorage.setItem('mht_quotes', JSON.stringify(updated));
  };

  const deleteQuotation = (id: string) => {
    const updated = quotations.filter(q => q.id !== id);
    setQuotations(updated);
    localStorage.setItem('mht_quotes', JSON.stringify(updated));
  };

  return (
    <AppContext.Provider value={{ 
      user, quotations, exchangeRate, agencyLogo, language,
      login, signup, logout, updateSettings, saveQuotation, deleteQuotation, setLanguage: updateLanguage 
    }}>
      <HashRouter>
        <Routes>
          <Route path="/" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/dashboard" />} />
          <Route path="/*" element={
            !user ? <Navigate to="/" /> : (
              <div className="flex min-h-screen bg-[#0f172a] font-sans">
                {/* Desktop Sidebar */}
                <div className="hidden md:block sticky top-0 h-screen">
                  <Sidebar />
                </div>
                
                {/* Mobile Menu Overlay */}
                {mobileMenuOpen && (
                  <Sidebar mobile closeMobile={() => setMobileMenuOpen(false)} />
                )}

                <div className="flex-1 overflow-auto">
                  {/* Mobile Header */}
                  <div className="md:hidden bg-[#0f172a] text-white p-4 flex justify-between items-center border-b border-gray-800 sticky top-0 z-30 shadow-md">
                    <div className="flex items-center gap-3">
                       <button onClick={() => setMobileMenuOpen(true)}>
                         <Menu size={24} className="text-[#d4af37]" />
                       </button>
                       {agencyLogo ? (
                         <img src={agencyLogo} className="h-8 w-auto bg-white rounded p-0.5 object-contain" alt="Logo" />
                       ) : (
                         <span className="font-serif font-bold text-[#d4af37] tracking-widest">MHT TRAVEL</span>
                       )}
                    </div>
                    <div className="flex items-center gap-4">
                      <Link to="/settings" className="text-gray-300 hover:text-[#d4af37]"><Settings size={20} /></Link>
                      <button onClick={logout}><LogOut size={20} /></button>
                    </div>
                  </div>
                  
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/quote/new" element={<QuoteBuilder />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </div>
              </div>
            )
          } />
        </Routes>
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;