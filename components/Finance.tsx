
import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, TransactionType, FinancialPocket, PocketType, Profile, Project, Card, CardType, TeamMember, RewardLedgerEntry } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import StatCard from './StatCard';
import DonutChart from './DonutChart';
import InteractiveCashflowChart from './InteractiveCashflowChart';
import { PencilIcon, Trash2Icon, PlusIcon, PiggyBankIcon, LockIcon, UsersIcon, ClipboardListIcon, DollarSignIcon, ArrowUpIcon, ArrowDownIcon, CreditCardIcon, FileTextIcon, CalendarIcon, TrendingUpIcon, TrendingDownIcon, BarChart2Icon, DownloadIcon, CashIcon, StarIcon, LightbulbIcon, TargetIcon, PrinterIcon, SparkleIcon, AlertCircleIcon, CheckCircleIcon } from '../constants';
import AIFinanceInsight from './AIFinanceInsight';
import { createCard as createCardRow, updateCard as updateCardRow, deleteCard as deleteCardRow, safeDeleteCard } from '../services/cards';
import { createTransaction as createTransactionRow, updateCardBalance, updateTransaction as updateTransactionRow } from '../services/transactions';
import { createPocket as createPocketRow, updatePocket as updatePocketRow, deletePocket as deletePocketRow } from '../services/pockets';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

// Currency formatter for CSV: avoids non-breaking space that Excel may render as 'Â'
const formatCurrencyCSV = (amount: number) => {
    const numberPart = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount);
    return `Rp ${numberPart}`; // regular space between Rp and number
}

const downloadCSV = (
    headers: string[],
    data: (string | number | undefined)[][],
    filename: string,
    prefaceRows: (string | number | undefined)[][] = []
) => {
    // Use semicolon as delimiter for locales (like Indonesia) where Excel expects ';'
    const DELIM = ';';
    const normalizeField = (field: string | number | undefined) => {
        const str = String(field ?? '');
        if (str.includes(DELIM) || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    const normalizeRow = (row: (string | number | undefined)[]) => row.map(normalizeField).join(DELIM);

    const csvRows = [
        // Excel delimiter hint to ensure proper column splitting
        `sep=${DELIM}`,
        ...prefaceRows.map(normalizeRow),
        headers.map(normalizeField).join(DELIM),
        ...data.map(normalizeRow)
    ];
    
    const csvString = csvRows.join('\n');
    // Add UTF-8 BOM so Excel (Windows) recognizes encoding and Indonesian characters
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


const PRODUCTION_COST_CATEGORIES = ["Gaji Freelancer", "Transportasi", "Konsumsi", "Sewa Tempat", "Sewa Alat", "Cetak Album"];

const ShieldIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
);


const emptyTransaction = {
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: 0,
    type: TransactionType.EXPENSE,
    category: '',
    method: 'Kartu',
    cardId: '',
    sourceId: '', // 'card-ID' or 'pocket-ID'
};

const emptyPocket: Omit<FinancialPocket, 'id' | 'amount'> = { name: '', description: '', type: PocketType.SAVING, icon: 'piggy-bank' };
const emptyCard: Omit<Card, 'id' | 'balance'> = { cardHolderName: 'Nama Pengguna', bankName: 'WBank', cardType: CardType.DEBIT, lastFourDigits: '', expiryDate: '', colorGradient: 'from-blue-500 to-cyan-500' };

const CardWidget: React.FC<{ card: Card, onEdit: () => void, onDelete: () => void, onClick: () => void, connectedPockets: FinancialPocket[] }> = ({ card, onEdit, onDelete, onClick, connectedPockets }) => {
    const isLight = card.colorGradient.includes('slate-100');
    const textColor = isLight ? 'text-gray-800' : 'text-white';

    const ChipIcon = () => (
        <svg className="w-10 h-8" viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="28" rx="4" fill="#D1D5DB"/>
            <rect x="4" y="4" width="32" height="20" rx="2" fill="#FBBF24"/>
            <path d="M4 14H18" stroke="#92400E" strokeWidth="2"/>
            <path d="M22 14H36" stroke="#92400E" strokeWidth="2"/>
            <path d="M20 4V12" stroke="#92400E" strokeWidth="2"/>
            <path d="M20 16V24" stroke="#92400E" strokeWidth="2"/>
        </svg>
    );
    const VisaLogo = () => <svg height="20px" viewBox="0 0 1000 310" className={`${isLight ? 'fill-black/70' : 'fill-white'}`}><path d="M783 310h101l-123-310H643l-89 220-22-220H414L291 310h103l23-60h100l15 60zM520 125l31 82 31-82h-62zM389 125l-63 158-20-44-41-114h-100l170 310h124L741 0H638l-49 125z"/></svg>;
    
    return (
        <div 
            className="group relative w-full aspect-[1.586] cursor-pointer" 
            style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
            onClick={onClick}
        >
            <div className={`
                relative w-full h-full p-5 rounded-2xl ${textColor} shadow-lg flex flex-col justify-between 
                bg-gradient-to-br ${card.colorGradient} 
                transition-transform duration-500 group-hover:transform group-hover:rotate-y-3 group-hover:scale-105
            `}>
                {/* Overlay pattern */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/az-subtle.png')] opacity-10 rounded-2xl"></div>

                {/* Card Top */}
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-lg">{card.bankName}</p>
                        <p className="text-xs opacity-80">{card.cardType}</p>
                    </div>
                    {card.bankName.toUpperCase() === 'VISA' ? <VisaLogo /> : <ChipIcon />}
                </div>

                {/* Card Middle */}
                <div>
                    <p className="text-2xl lg:text-3xl font-mono tracking-wider mb-2">**** **** **** {card.lastFourDigits}</p>
                    <p className="text-sm opacity-80">Saldo Tersedia</p>
                    <p className="text-xl lg:text-2xl font-bold tracking-tight">{formatCurrency(card.balance)}</p>
                </div>

                {/* Card Bottom */}
                <div className="flex justify-between items-end text-sm">
                    <div>
                        <p className="text-xs opacity-70">Pemegang Kartu</p>
                        <p className="font-medium">{card.cardHolderName}</p>
                    </div>
                    {card.expiryDate && (
                        <div className="text-right">
                            <p className="text-xs opacity-70">Kadaluwarsa</p>
                            <p className="font-medium">{card.expiryDate}</p>
                        </div>
                    )}
                </div>

                {/* Actions on hover */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 non-printable">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 backdrop-blur-sm"><PencilIcon className="w-4 h-4"/></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 backdrop-blur-sm"><Trash2Icon className="w-4 h-4"/></button>
                </div>
            </div>

            {connectedPockets.length > 0 && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[90%] bg-brand-input p-2 rounded-lg text-xs shadow-md opacity-0 group-hover:opacity-100 group-hover:-bottom-5 transition-all duration-300">
                    <p className="font-semibold text-brand-text-secondary text-center">Terhubung ke: {connectedPockets.map(p => p.name).join(', ')}</p>
                </div>
            )}
        </div>
    );
};

const CashWidget: React.FC<{ card: Card, onTopUp: () => void, onEdit: () => void, onClick: () => void, connectedPockets: FinancialPocket[] }> = ({ card, onTopUp, onEdit, onClick, connectedPockets }) => {
    return (
        <div 
            className="group relative w-full aspect-[1.586] cursor-pointer"
            style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
            onClick={onClick}
        >
            <div className={`
                relative w-full h-full p-5 rounded-2xl text-slate-800 shadow-lg flex flex-col justify-between 
                bg-gradient-to-br from-slate-50 to-slate-200
                transition-transform duration-500 group-hover:transform group-hover:rotate-y-3 group-hover:scale-105
            `}>
                {/* Overlay pattern */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/checkered-pattern.png')] opacity-5 rounded-2xl"></div>

                {/* Top */}
                <div className="flex justify-between items-start">
                    <p className="font-bold text-lg text-slate-700">{card.bankName}</p>
                    <CashIcon className="w-8 h-8 text-slate-500"/>
                </div>

                {/* Middle */}
                <div>
                     <p className="text-sm text-slate-500">Saldo Tunai</p>
                    <p className="text-3xl font-bold tracking-tight text-slate-900">{formatCurrency(card.balance)}</p>
                </div>

                {/* Bottom */}
                <div className="text-sm">
                    <p className="text-xs text-slate-500">Akun Kas</p>
                    <p className="font-medium text-slate-700">{card.cardHolderName}</p>
                </div>

                {/* Actions on hover */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 non-printable">
                    <button onClick={(e) => { e.stopPropagation(); onTopUp(); }} className="bg-slate-900/10 hover:bg-slate-900/20 text-slate-800 rounded-full p-2 backdrop-blur-sm" title="Top-up Tunai"><ArrowUpIcon className="w-4 h-4"/></button>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="bg-slate-900/10 hover:bg-slate-900/20 text-slate-800 rounded-full p-2 backdrop-blur-sm" title="Edit"><PencilIcon className="w-4 h-4"/></button>
                </div>
            </div>

            {connectedPockets.length > 0 && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[90%] bg-brand-input p-2 rounded-lg text-xs shadow-md opacity-0 group-hover:opacity-100 group-hover:-bottom-5 transition-all duration-300">
                    <p className="font-semibold text-brand-text-secondary text-center">Terhubung ke: {connectedPockets.map(p => p.name).join(', ')}</p>
                </div>
            )}
        </div>
    );
};

interface FinanceProps {
    transactions: Transaction[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    pockets: FinancialPocket[];
    setPockets: React.Dispatch<React.SetStateAction<FinancialPocket[]>>;
    projects: Project[];
    profile: Profile;
    cards: Card[];
    setCards: React.Dispatch<React.SetStateAction<Card[]>>;
    teamMembers: TeamMember[];
    rewardLedgerEntries: RewardLedgerEntry[];
    setRewardLedgerEntries: React.Dispatch<React.SetStateAction<RewardLedgerEntry[]>>;
}

const pocketIcons: { [key in FinancialPocket['icon']]: React.ReactNode } = {
    'piggy-bank': <PiggyBankIcon className="w-8 h-8"/>, 'lock': <LockIcon className="w-8 h-8"/>,
    'users': <UsersIcon className="w-8 h-8"/>, 'clipboard-list': <ClipboardListIcon className="w-8 h-8"/>,
    'star': <StarIcon className="w-8 h-8"/>
};

const getMonthDateRange = (date: Date) => {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return {
        from: startOfMonth.toISOString().split('T')[0],
        to: endOfMonth.toISOString().split('T')[0]
    };
};

const TransactionTable: React.FC<{transactions: Transaction[]}> = ({transactions}) => {
    if (transactions.length === 0) return <p className="text-center py-10 text-brand-text-secondary">Tidak ada transaksi pada periode ini.</p>;
    return (
        <table className="w-full text-sm">
            <thead className="text-xs uppercase print-bg-slate bg-brand-input"><tr className="print-text-black"><th className="p-3 text-left">ID Transaksi</th><th className="p-3 text-left">Tanggal</th><th className="p-3 text-left">Deskripsi</th><th className="p-3 text-left">Kategori</th><th className="p-3 text-right">Jumlah</th></tr></thead>
            <tbody className="divide-y divide-brand-border">
                {transactions.map(t => (<tr key={t.id}><td className="p-3 font-mono text-xs">{t.id}</td><td className="p-3">{new Date(t.date).toLocaleDateString('id-ID')}</td><td className="p-3 font-semibold">{t.description}</td><td className="p-3">{t.category}</td><td className={`p-3 text-right font-semibold ${t.type === TransactionType.INCOME ? 'print-text-green text-brand-success' : 'print-text-red text-brand-danger'}`}>{formatCurrency(t.amount)}</td></tr>))}
            </tbody>
        </table>
    );
}

const Finance: React.FC<FinanceProps> = ({ transactions, setTransactions, pockets, setPockets, projects, profile, cards, setCards, teamMembers, rewardLedgerEntries, setRewardLedgerEntries }) => {
    const [activeTab, setActiveTab] = useState<'transactions' | 'pockets' | 'cards' | 'cashflow' | 'laporan' | 'laporanKartu' | 'labaProyek' | 'laporanAI'>('transactions');
    const [modalState, setModalState] = useState<{ type: null | 'transaction' | 'pocket' | 'card' | 'transfer' | 'topup-cash', mode: 'add' | 'edit', data?: any }>({ type: null, mode: 'add' });
    const [historyModalState, setHistoryModalState] = useState<{ type: 'card' | 'pocket' | 'reward_pool', item: Card | FinancialPocket | null } | null>(null);
    const [form, setForm] = useState<any>({});
    const [activeStatModal, setActiveStatModal] = useState<'assets' | 'pockets' | 'income' | 'expense' | null>(null);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);

    // FILTERS
    const [filters, setFilters] = useState({ searchTerm: '', dateFrom: '', dateTo: '' });
    const [categoryFilter, setCategoryFilter] = useState<{ type: TransactionType | 'all', category: string }>({ type: 'all', category: 'Semua' });
    const [reportFilters, setReportFilters] = useState({ client: 'all', dateFrom: '', dateTo: '' });
    const [profitReportFilters, setProfitReportFilters] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
    
    // AI Report State
    const [aiReport, setAiReport] = useState<any | null>(null);
    const [aiReportRawData, setAiReportRawData] = useState<any | null>(null);
    const [isReportLoading, setIsReportLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);


    const showNotification = (message: string) => {
        // A simple placeholder for the app's notification system
        // In the main App, this is handled via state. Here, we can just log it
        // or assume a global notification function exists if this component were truly standalone.
        // Notification suppressed to keep console clean.
        // This component doesn't have access to the App's notification state,
        // so we can't show a visual notification from here without prop drilling `setNotification`.
        // For the purpose of this request, we will assume it's available via props if needed,
        // but the core logic is what's important.
    };

    const handleCloseBudget = (budgetPocket: FinancialPocket, isAutomatic: boolean = false) => {
        if (!budgetPocket) {
            return;
        }
    
        const now = new Date();
        const closedPocketName = budgetPocket.name;
        const currentMonthName = `Anggaran Operasional ${now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`;
    
        if (budgetPocket.amount > 0) {
            const newSavedPocket: FinancialPocket = {
                id: `POC-SISA-${now.getTime()}`,
                name: `Sisa ${closedPocketName}`,
                description: 'Hasil penutupan anggaran bulanan.',
                icon: 'piggy-bank',
                type: PocketType.SAVING,
                amount: budgetPocket.amount,
                sourceCardId: budgetPocket.sourceCardId,
            };
    
            const closingTx: Transaction = {
                id: `TRN-CLOSE-${now.getTime()}`,
                date: now.toISOString().split('T')[0],
                description: `Penutupan anggaran: ${closedPocketName}`,
                amount: budgetPocket.amount,
                type: TransactionType.EXPENSE,
                category: 'Penutupan Anggaran',
                method: 'Sistem',
                pocketId: budgetPocket.id
            };
    
            setPockets(prev => {
                const withNewPocket = [...prev, newSavedPocket];
                return withNewPocket.map(p =>
                    p.id === budgetPocket.id
                        ? { ...p, amount: 0, name: currentMonthName }
                        : p);
            });
            setTransactions(prev => [closingTx, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    
            showNotification(`Anggaran "${closedPocketName}" ditutup. Sisa ${formatCurrency(budgetPocket.amount)} disimpan.`);
        } else {
            // Just reset the pocket for the new month if amount is 0
            setPockets(prev => prev.map(p =>
                p.id === budgetPocket.id
                    ? { ...p, name: currentMonthName }
                    : p
            ));
            if (isAutomatic) {
                showNotification(`Anggaran bulanan telah diperbarui untuk ${now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}.`);
            }
        }
    };

    useEffect(() => {
        const autoCloseBudget = () => {
            const budgetPocket = pockets.find(p => p.type === PocketType.EXPENSE);
            if (!budgetPocket) return;
    
            const nameParts = budgetPocket.name.replace('Anggaran Operasional ', '').split(' ');
            if (nameParts.length < 2) return;
    
            const monthName = nameParts[0];
            const year = parseInt(nameParts[1], 10);
    
            if (isNaN(year)) return;
    
            const monthMap: { [key in string]: number } = {
                'Januari': 0, 'Februari': 1, 'Maret': 2, 'April': 3, 'Mei': 4, 'Juni': 5,
                'Juli': 6, 'Agustus': 7, 'September': 8, 'Oktober': 9, 'November': 10, 'Desember': 11
            };
            const month = monthMap[monthName];
    
            if (month === undefined) return;
    
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
    
            if (year < currentYear || (year === currentYear && month < currentMonth)) {
                handleCloseBudget(budgetPocket, true);
            }
        };
    
        autoCloseBudget();
    }, []); // Run only once on mount

    const cashflowChartData = useMemo(() => {
        const monthlyData: { [key: string]: { income: number, expense: number } } = {};
        [...transactions].reverse().forEach(t => {
            const month = new Date(t.date).toLocaleString('default', { month: 'short', year: '2-digit' });
            if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
            if (t.type === TransactionType.INCOME) monthlyData[month].income += t.amount;
            else if (t.type === TransactionType.EXPENSE) monthlyData[month].expense += t.amount;
        });

        let balance = 0;
        return Object.entries(monthlyData).map(([label, values]) => {
            balance += values.income - values.expense;
            return { label, ...values, balance };
        });
    }, [transactions]);
    
    const cashflowMetrics = useMemo(() => {
        const data = cashflowChartData; // The chart data is already calculated
        if (data.length === 0) {
            return { avgIncome: 0, avgExpense: 0, runway: 'N/A', burnRate: 0 };
        }
        const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
        const totalExpense = data.reduce((sum, d) => sum + d.expense, 0);
        const numMonths = data.length;
        
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const recentTransactions = transactions.filter(t => new Date(t.date) >= sixMonthsAgo);
        const recentNetChange = recentTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0) - recentTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
        const monthlyBurnRate = recentNetChange > 0 ? recentNetChange / Math.min(6, numMonths) : 0;
        
        let runway = 'Tak Terbatas';
        if (monthlyBurnRate > 0) {
            const totalAssets = cards.reduce((sum, card) => sum + card.balance, 0);
            const runwayInMonths = totalAssets / monthlyBurnRate;
            runway = `${runwayInMonths.toFixed(1)} bulan`;
        }
        
        return {
            avgIncome: totalIncome / numMonths,
            avgExpense: totalExpense / numMonths,
            runway,
            burnRate: monthlyBurnRate
        };
    }, [transactions, cards, cashflowChartData]);

    const { summary, thisMonthIncome, thisMonthExpense } = useMemo(() => {
        const totalAssets = cards.reduce((sum, c) => sum + c.balance, 0);
        const pocketsTotal = pockets.filter(p => p.type !== PocketType.REWARD_POOL).reduce((sum, p) => sum + p.amount, 0);
        // Compute total rewards directly from the reward ledger for accuracy
        const totalRewards = rewardLedgerEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        
        const now = new Date();
        const { from, to } = getMonthDateRange(now);
        const fromDate = new Date(from); fromDate.setHours(0,0,0,0);
        const toDate = new Date(to); toDate.setHours(23,59,59,999);
        
        const thisMonthTransactions = transactions.filter(t => {
            const txDate = new Date(t.date);
            return txDate >= fromDate && txDate <= toDate;
        });
        
        const totalIncomeThisMonth = thisMonthTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
        const totalExpenseThisMonth = thisMonthTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
        
        return { 
            summary: { totalAssets, pocketsTotal, totalIncomeThisMonth, totalExpenseThisMonth, totalRewards },
            thisMonthIncome: thisMonthTransactions.filter(t => t.type === TransactionType.INCOME).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            thisMonthExpense: thisMonthTransactions.filter(t => t.type === TransactionType.EXPENSE).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        };
    }, [cards, pockets, transactions, rewardLedgerEntries]);
    
    const monthlyBudgetPocket = useMemo(() => pockets.find(p => p.type === PocketType.EXPENSE), [pockets]);

    const categoryTotals = useMemo<{ income: Record<string, number>; expense: Record<string, number> }>(() => {
        const income: Record<string, number> = {};
        const expense: Record<string, number> = {};

        transactions.forEach(t => {
            if (t.type === TransactionType.INCOME) {
                income[t.category] = (income[t.category] || 0) + t.amount;
            } else {
                expense[t.category] = (expense[t.category] || 0) + t.amount;
            }
        });

        return { income, expense };
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const date = new Date(t.date);
            const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
            const to = filters.dateTo ? new Date(filters.dateTo) : null;
            if (from) from.setHours(0,0,0,0);
            if (to) to.setHours(23,59,59,999);
            
            const searchMatch = (
                t.description.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                t.category.toLowerCase().includes(filters.searchTerm.toLowerCase())
            );
            const dateMatch = (!from || date >= from) && (!to || date <= to);

            let categoryMatch = true;
            if (categoryFilter.type !== 'all') {
                if (t.type !== categoryFilter.type) {
                    categoryMatch = false;
                } else if (categoryFilter.category !== 'Semua' && t.category !== categoryFilter.category) {
                    categoryMatch = false;
                }
            }
            
            return searchMatch && dateMatch && categoryMatch;
        });
    }, [transactions, filters, categoryFilter]);

    const filteredSummary = useMemo(() => {
        const income = filteredTransactions
            .filter(t => t.type === TransactionType.INCOME)
            .reduce((sum, t) => sum + t.amount, 0);
        const expense = filteredTransactions
            .filter(t => t.type === TransactionType.EXPENSE)
            .reduce((sum, t) => sum + t.amount, 0);
        return { income, expense, net: income - expense };
    }, [filteredTransactions]);
    
    const reportClientOptions = useMemo(() => {
        const clientMap = projects.reduce((acc, p) => {
            if (!acc[p.clientId]) {
                acc[p.clientId] = p.clientName;
            }
            return acc;
        }, {} as Record<string, string>);
        return Object.entries(clientMap).map(([id, name]) => ({ id, name }));
    }, [projects]);
    
    const reportTransactions = useMemo(() => transactions.filter(t => {
        const date = new Date(t.date);
        const from = reportFilters.dateFrom ? new Date(reportFilters.dateFrom) : null;
        const to = reportFilters.dateTo ? new Date(reportFilters.dateTo) : null;
        if (from) from.setHours(0,0,0,0);
        if (to) to.setHours(23,59,59,999);

        const dateMatch = (!from || date >= from) && (!to || date <= to);

        const projectIdsForClient = projects
            .filter(p => p.clientId === reportFilters.client)
            .map(p => p.id);
            
        const clientMatch = reportFilters.client === 'all' || (t.projectId && projectIdsForClient.includes(t.projectId));

        return dateMatch && clientMatch;
    }), [transactions, projects, reportFilters]);
    
    const projectProfitabilityData = useMemo(() => {
        const { year, month } = profitReportFilters;

        // 1. Filter projects that have an event date within the selected month/year
        const projectsInMonth = projects.filter(p => {
            const projectDate = new Date(p.date);
            return projectDate.getFullYear() === year && projectDate.getMonth() === month;
        });

        // 2. Get a unique list of clientIds from these projects
        const clientIdsInMonth = [...new Set(projectsInMonth.map(p => p.clientId))];

        // 3. For each unique clientId, calculate profitability
        return clientIdsInMonth.map(clientId => {
            const client = reportClientOptions.find(c => c.id === clientId);
            if (!client) return null;

            const clientProjectsInMonth = projectsInMonth.filter(p => p.clientId === clientId);
            const clientProjectIdsInMonth = clientProjectsInMonth.map(p => p.id);
            
            // Find all transactions linked to this client's projects in this month
            const relevantTransactions = transactions.filter(t => t.projectId && clientProjectIdsInMonth.includes(t.projectId));

            const totalIncome = relevantTransactions
                .filter(t => t.type === TransactionType.INCOME)
                .reduce((sum, t) => sum + t.amount, 0);
            
            const totalCost = relevantTransactions
                .filter(t => t.type === TransactionType.EXPENSE && PRODUCTION_COST_CATEGORIES.includes(t.category))
                .reduce((sum, t) => sum + t.amount, 0);

            const profit = totalIncome - totalCost;
            
            return {
                clientId,
                clientName: client.name,
                totalIncome,
                totalCost,
                profit
            };
        }).filter(Boolean); // Remove nulls if a client wasn't found
    }, [profitReportFilters, projects, transactions, reportClientOptions]);
    
    const profitReportMetrics = useMemo(() => {
        if (projectProfitabilityData.length === 0) {
            return { totalProfit: 0, mostProfitableClient: 'N/A', profitableProjectsCount: 0, avgProfit: 0 };
        }
        const totalProfit = projectProfitabilityData.reduce((sum, item) => sum + (item?.profit || 0), 0);
        const mostProfitableClient = [...projectProfitabilityData].sort((a,b) => (b?.profit || 0) - (a?.profit || 0))[0]?.clientName || 'N/A';
        const profitableProjectsCount = projectProfitabilityData.filter(item => (item?.profit || 0) > 0).length;
        const avgProfit = totalProfit / projectProfitabilityData.length;
        return { totalProfit, mostProfitableClient, profitableProjectsCount, avgProfit };
    }, [projectProfitabilityData]);

    const reportYearOptions = useMemo(() => {
        const years = new Set<number>(transactions.map(t => new Date(t.date).getFullYear()));
        return Array.from(years).sort((a: number, b: number) => b - a);
    }, [transactions]);
    
    const generalReportMetrics = useMemo(() => {
        if (reportFilters.client !== 'all') return null;
        const reportIncome = reportTransactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
        const reportExpense = reportTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
        const incomeDonut = Object.entries(reportTransactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => ({...acc, [t.category]: (acc[t.category] || 0) + t.amount }), {} as Record<string, number>)).map(([l, v], i) => ({label: l, value: v, color: ['#34d399', '#60a5fa', '#38bdf8', '#a3e635', '#4ade80'][i % 5]}));
        const expenseDonut = Object.entries(reportTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => ({...acc, [t.category]: (acc[t.category] || 0) + t.amount }), {} as Record<string, number>)).map(([l, v], i) => ({label: l, value: v, color: ['#f87171', '#fb923c', '#facc15', '#ef4444', '#f472b6'][i % 5]}));
        return { reportIncome, reportExpense, incomeDonut, expenseDonut };
    }, [reportTransactions, reportFilters.client]);

    const cardStats = useMemo(() => {
        // Total utang kartu kredit: gunakan nilai absolut agar selalu positif
        const creditDebt = cards
            .filter(c => c.cardType === CardType.KREDIT)
            .reduce((sum, c) => sum + Math.abs(Number(c.balance) || 0), 0);

        // Total aset (debit & tunai)
        const debitAndCashAssets = cards
            .filter(c => c.cardType !== CardType.KREDIT)
            .reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
        
        // Total saldo tunai (bisa ada >1 kartu tunai)
        const cashBalance = cards
            .filter(c => c.cardType === CardType.TUNAI)
            .reduce((sum, c) => sum + (Number(c.balance) || 0), 0);

        // Hitung kartu paling sering dipakai hanya dari kartu yang ada di state 'cards'
        const cardIdSet = new Set(cards.map(c => c.id));
        const transactionCounts = transactions.reduce((acc, t) => {
            if (t.cardId && cardIdSet.has(t.cardId)) {
                acc[t.cardId] = (acc[t.cardId] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
        
        const idsByUsage = Object.keys(transactionCounts).sort((a, b) => transactionCounts[b] - transactionCounts[a]);
        const mostUsedCardId = idsByUsage[0] || null;
        const mostUsedCard = mostUsedCardId ? cards.find(c => c.id === mostUsedCardId) : null;
        const mostUsedCardName = mostUsedCard ? `${mostUsedCard.bankName} (${mostUsedCard.lastFourDigits ? '...'+mostUsedCard.lastFourDigits : ''})` : 'N/A';
        const mostUsedCardTxCount = mostUsedCardId ? transactionCounts[mostUsedCardId] : 0;
        
        const topUsedCards = idsByUsage.slice(0, 3).map(id => {
            const card = cards.find(c => c.id === id);
            return { id, name: card ? `${card.bankName} (${card.lastFourDigits ? '...'+card.lastFourDigits : ''})` : id, count: transactionCounts[id] };
        });
        return { creditDebt, debitAndCashAssets, cashBalance, mostUsedCardName, mostUsedCardTxCount, topUsedCards };
    }, [cards, transactions]);

    const handleOpenModal = (type: 'transaction' | 'pocket' | 'card' | 'transfer' | 'topup-cash', mode: 'add' | 'edit', data?: any) => {
        setModalState({ type, mode, data });
        if (mode === 'add') {
            if (type === 'transaction') setForm({...emptyTransaction, cardId: cards.find(c => c.cardType !== CardType.TUNAI)?.id || '', sourceId: cards.find(c => c.cardType !== CardType.TUNAI)?.id ? `card-${cards.find(c => c.cardType !== CardType.TUNAI)?.id}` : ''});
            if (type === 'pocket') setForm(emptyPocket);
            if (type === 'card') setForm({ ...emptyCard, initialBalance: '' });
            if (type === 'transfer') {
                const transferType = data?.transferType || 'deposit';
                setForm({ amount: '', fromCardId: cards.find(c=> c.cardType !== CardType.TUNAI)?.id || cards[0]?.id || '', toPocketId: data?.id, type: transferType });
            }
            if (type === 'topup-cash') setForm({ amount: '', fromCardId: cards.find(c => c.cardType !== CardType.TUNAI)?.id || '' });
        } else {
            setForm({ ...data, adjustmentAmount: '', adjustmentReason: '' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { type, mode, data } = modalState;
        
        if (type === 'transaction') {
            const newTx = { ...form, amount: Number(form.amount) };
            if (mode === 'add') {
                 if (newTx.type === TransactionType.EXPENSE) {
                    const source = newTx.sourceId; // e.g., 'card-CARD001' or 'pocket-POC003'
                    if (source.startsWith('pocket-')) {
                    const pocketId = source.replace('pocket-', '');
                    const pocket = pockets.find(p => p.id === pocketId);
                    if (pocket && pocket.amount < newTx.amount) {
                        alert(`Saldo kantong "${pocket.name}" tidak mencukupi. Saldo: ${formatCurrency(pocket.amount)}`);
                        return;
                    }
                    setPockets(prev => prev.map(p => p.id === pocketId ? { ...p, amount: p.amount - newTx.amount } : p));
                    // Persist pocket balance decrease to DB
                    try {
                        await updatePocketRow(pocketId, { amount: (pocket?.amount || 0) - newTx.amount });
                    } catch (e) {
                        console.warn('[Supabase] Gagal memperbarui saldo kantong saat pengeluaran.', e);
                    }
                    newTx.pocketId = pocketId;
                    delete newTx.sourceId;
                } else if (source.startsWith('card-')) {
                        const cardId = source.replace('card-', '');
                        newTx.cardId = cardId;
                        delete newTx.sourceId;
                    }
                }
                try {
                    const created = await createTransactionRow({
                        date: newTx.date,
                        description: newTx.description,
                        amount: newTx.amount,
                        type: newTx.type,
                        projectId: newTx.projectId || undefined,
                        category: newTx.category,
                        method: newTx.method,
                        pocketId: newTx.pocketId || undefined,
                        cardId: newTx.cardId || undefined,
                    } as Omit<Transaction, 'id' | 'vendorSignature'>);
                    setTransactions(prev => [...prev, created].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    // Jika transaksi terkait kartu, update saldo kartu di DB dan lokal
                    if (created.cardId) {
                        const delta = created.type === TransactionType.INCOME ? created.amount : -created.amount;
                        try { await updateCardBalance(created.cardId, delta); } catch {}
                        setCards(prev => prev.map(c => c.id === created.cardId ? { ...c, balance: c.balance + delta } : c));
                    }
                    showNotification('Transaksi berhasil ditambahkan.');
                } catch (err) {
                    alert('Gagal menyimpan transaksi ke database. Coba lagi.');
                    return;
                }
            } else {
                try {
                    const before = transactions.find(t => t.id === data.id);
                    const updated = await updateTransactionRow(data.id, {
                        date: newTx.date,
                        description: newTx.description,
                        amount: newTx.amount,
                        type: newTx.type,
                        projectId: newTx.projectId,
                        category: newTx.category,
                        method: newTx.method,
                        pocketId: newTx.pocketId,
                        cardId: newTx.cardId,
                    });
                    // Adjust card balance if card/amount/type changed
                    if (before) {
                        // remove previous impact
                        if (before.cardId) {
                            const prevDelta = before.type === TransactionType.INCOME ? before.amount : -before.amount;
                            try { await updateCardBalance(before.cardId, -prevDelta); } catch {}
                            setCards(prev => prev.map(c => c.id === before.cardId ? { ...c, balance: c.balance - prevDelta } : c));
                        }
                        // add new impact
                        if (updated.cardId) {
                            const newDelta = updated.type === TransactionType.INCOME ? updated.amount : -updated.amount;
                            try { await updateCardBalance(updated.cardId, newDelta); } catch {}
                            setCards(prev => prev.map(c => c.id === updated.cardId ? { ...c, balance: c.balance + newDelta } : c));
                        }
                    }
                    setTransactions(prev => prev.map(t => t.id === data.id ? updated : t).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    showNotification('Transaksi berhasil diperbarui.');
                } catch (err) {
                    alert('Gagal memperbarui transaksi di database. Coba lagi.');
                    return;
                }
            }
        }
        
        if (type === 'pocket') {
            if (mode === 'add') {
                try {
                    const created = await createPocketRow({
                        name: form.name,
                        description: form.description || '',
                        icon: form.icon,
                        type: form.type,
                        amount: 0,
                        sourceCardId: form.sourceCardId || undefined,
                        goalAmount: form.goalAmount || undefined,
                        lockEndDate: form.lockEndDate || undefined,
                    } as Omit<FinancialPocket, 'id' | 'members'>);
                    setPockets(prev => [...prev, created]);
                    showNotification('Kantong berhasil dibuat.');
                } catch (err) {
                    alert('Gagal menyimpan kantong ke database. Coba lagi.');
                    return;
                }
            } else {
                try {
                    const updated = await updatePocketRow(data.id, {
                        name: form.name,
                        description: form.description,
                        icon: form.icon,
                        type: form.type,
                        amount: form.amount,
                        sourceCardId: form.sourceCardId,
                        goalAmount: form.goalAmount,
                        lockEndDate: form.lockEndDate,
                    } as Partial<FinancialPocket>);
                    setPockets(prev => prev.map(p => p.id === data.id ? updated : p));
                    showNotification('Kantong berhasil diperbarui.');
                } catch (err) {
                    alert('Gagal memperbarui kantong di database. Coba lagi.');
                    return;
                }
            }
        }
        
        if (type === 'card') {
            const initialBalance = Number(form.initialBalance || 0);
            if (mode === 'add') {
                try {
                    const created = await createCardRow({
                        card_holder_name: form.cardHolderName,
                        bank_name: form.bankName,
                        card_type: form.cardType,
                        last_four_digits: form.lastFourDigits,
                        expiry_date: form.expiryDate || null,
                        balance: 0, // start at 0, then add initial via transaction
                        color_gradient: form.colorGradient || null,
                    });
                    // Map to UI Card type
                    const uiCard: Card = {
                        id: created.id,
                        cardHolderName: created.card_holder_name,
                        bankName: created.bank_name,
                        cardType: created.card_type as CardType,
                        lastFourDigits: created.last_four_digits,
                        expiryDate: created.expiry_date || '',
                        colorGradient: created.color_gradient || '',
                        balance: Number(created.balance || 0),
                    };
                    setCards(prev => [...prev, uiCard]);

                    if (initialBalance > 0) {
                        try {
                            const tx = await createTransactionRow({
                                date: new Date().toISOString().split('T')[0],
                                description: `Saldo Awal - ${uiCard.bankName} ${uiCard.cardType !== CardType.TUNAI ? uiCard.lastFourDigits : ''}`.trim(),
                                amount: initialBalance,
                                type: TransactionType.INCOME,
                                projectId: undefined,
                                category: 'Modal',
                                method: 'Sistem',
                                pocketId: undefined,
                                cardId: uiCard.id,
                            } as Omit<Transaction, 'id' | 'vendorSignature'>);
                            setTransactions(prev => [...prev, tx].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                            // Update UI card balance locally
                            setCards(prev => prev.map(c => c.id === uiCard.id ? { ...c, balance: c.balance + initialBalance } : c));
                            // Update balance in DB
                            try { await updateCardBalance(uiCard.id, initialBalance); } catch {}
                        } catch (err) {
                            console.warn('[Supabase] Gagal membuat transaksi saldo awal kartu, fallback lokal.', err);
                            const initialTx: Transaction = {
                                id: `TRN-INIT-${uiCard.id}`,
                                date: new Date().toISOString().split('T')[0],
                                description: `Saldo Awal - ${uiCard.bankName} ${uiCard.cardType !== CardType.TUNAI ? uiCard.lastFourDigits : ''}`.trim(),
                                amount: initialBalance,
                                type: TransactionType.INCOME,
                                category: 'Modal',
                                method: 'Sistem',
                                cardId: uiCard.id,
                            };
                            setTransactions(prev => [...prev, initialTx].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                            setCards(prev => prev.map(c => c.id === uiCard.id ? { ...c, balance: c.balance + initialBalance } : c));
                        }
                    }
                    showNotification('Kartu baru berhasil ditambahkan.');
                } catch (err) {
                    alert('Gagal menambahkan kartu ke database. Coba lagi.');
                    return;
                }
            } else if (mode === 'edit' && data?.id) {
                try {
                    const updated = await updateCardRow(data.id, {
                        card_holder_name: form.cardHolderName,
                        bank_name: form.bankName,
                        card_type: form.cardType,
                        last_four_digits: form.lastFourDigits,
                        expiry_date: form.expiryDate || null,
                        color_gradient: form.colorGradient || null,
                    } as any);
                    const uiCard: Card = {
                        id: updated.id,
                        cardHolderName: updated.card_holder_name,
                        bankName: updated.bank_name,
                        cardType: updated.card_type as CardType,
                        lastFourDigits: updated.last_four_digits,
                        expiryDate: updated.expiry_date || '',
                        colorGradient: updated.color_gradient || '',
                        balance: Number(updated.balance || 0),
                    };
                    setCards(prev => prev.map(c => c.id === uiCard.id ? { ...c, ...uiCard } : c));
                    showNotification('Kartu berhasil diperbarui.');
                } catch (err) {
                    alert('Gagal memperbarui kartu di database. Coba lagi.');
                    return;
                }
            }
        }
        
        if (type === 'transfer') {
            const amount = Number(form.amount);
            const fromCardId = form.fromCardId;
            const toPocketId = form.toPocketId;
            const transferType = form.type;
            
            if (transferType === 'deposit') {
                try {
                    const transferTx = await createTransactionRow({
                        date: new Date().toISOString().split('T')[0],
                        description: 'Transfer ke kantong',
                        amount,
                        type: TransactionType.EXPENSE,
                        category: 'Transfer Internal',
                        method: 'Sistem',
                        cardId: fromCardId,
                        projectId: undefined,
                        pocketId: undefined,
                    } as Omit<Transaction, 'id' | 'vendorSignature'>);
                    setTransactions(prev => [...prev, transferTx].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    setPockets(prev => prev.map(p => p.id === toPocketId ? { ...p, amount: p.amount + amount } : p));
                    // Persist increased pocket balance to DB
                    try {
                        const pocketTo = pockets.find(p => p.id === toPocketId);
                        await updatePocketRow(toPocketId, { amount: (pocketTo?.amount || 0) + amount });
                    } catch (e) {
                        console.warn('[Supabase] Gagal memperbarui saldo kantong saat deposit transfer.', e);
                    }
                    // Kurangi saldo kartu sumber
                    try { await updateCardBalance(fromCardId, -amount); } catch {}
                    setCards(prev => prev.map(c => c.id === fromCardId ? { ...c, balance: c.balance - amount } : c));
                    showNotification('Transfer berhasil.');
                } catch (err) {
                    alert('Gagal menyimpan transaksi transfer (deposit) ke database. Coba lagi.');
                    return;
                }
            } else {
                const pocket = pockets.find(p => p.id === toPocketId);
                if (pocket && pocket.amount < amount) {
                    alert(`Saldo kantong tidak mencukupi. Saldo: ${formatCurrency(pocket.amount)}`);
                    return;
                }
                try {
                    const withdrawTx = await createTransactionRow({
                        date: new Date().toISOString().split('T')[0],
                        description: 'Penarikan dari kantong',
                        amount,
                        type: TransactionType.INCOME,
                        category: 'Transfer Internal',
                        method: 'Sistem',
                        cardId: fromCardId,
                        projectId: undefined,
                        pocketId: undefined,
                    } as Omit<Transaction, 'id' | 'vendorSignature'>);
                    setTransactions(prev => [...prev, withdrawTx].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    setPockets(prev => prev.map(p => p.id === toPocketId ? { ...p, amount: p.amount - amount } : p));
                    // Persist decreased pocket balance to DB
                    try {
                        await updatePocketRow(toPocketId, { amount: (pocket?.amount || 0) - amount });
                    } catch (e) {
                        console.warn('[Supabase] Gagal memperbarui saldo kantong saat withdraw transfer.', e);
                    }
                    // Tambah saldo kartu tujuan
                    try { await updateCardBalance(fromCardId, amount); } catch {}
                    setCards(prev => prev.map(c => c.id === fromCardId ? { ...c, balance: c.balance + amount } : c));
                    showNotification('Penarikan berhasil.');
                } catch (err) {
                    alert('Gagal menyimpan transaksi transfer (withdraw) ke database. Coba lagi.');
                    return;
                }
            }
        }
        
        if (type === 'topup-cash') {
            const amount = Number(form.amount);
            const fromCardId = form.fromCardId;
            const cashCard = cards.find(c => c.cardType === CardType.TUNAI);
            
            if (cashCard) {
                try {
                    const topupTx = await createTransactionRow({
                        date: new Date().toISOString().split('T')[0],
                        description: 'Top-up Tunai',
                        amount,
                        type: TransactionType.EXPENSE,
                        category: 'Transfer Internal',
                        method: 'Sistem',
                        cardId: fromCardId,
                        projectId: undefined,
                        pocketId: undefined,
                    } as Omit<Transaction, 'id' | 'vendorSignature'>);
                    const cashIncomeTx = await createTransactionRow({
                        date: new Date().toISOString().split('T')[0],
                        description: 'Penerimaan Tunai',
                        amount,
                        type: TransactionType.INCOME,
                        category: 'Transfer Internal',
                        method: 'Sistem',
                        cardId: cashCard.id,
                        projectId: undefined,
                        pocketId: undefined,
                    } as Omit<Transaction, 'id' | 'vendorSignature'>);
                    setTransactions(prev => [...prev, topupTx, cashIncomeTx].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    // Update saldo kartu sumber dan kartu tunai
                    try { await updateCardBalance(fromCardId, -amount); } catch {}
                    try { await updateCardBalance(cashCard.id, amount); } catch {}
                    setCards(prev => prev.map(c => c.id === fromCardId ? { ...c, balance: c.balance - amount } : c));
                    setCards(prev => prev.map(c => c.id === cashCard.id ? { ...c, balance: c.balance + amount } : c));
                    showNotification('Top-up tunai berhasil.');
                } catch (err) {
                    alert('Gagal menyimpan transaksi top-up tunai ke database. Coba lagi.');
                    return;
                }
            }
        }
        
        handleCloseModal();
    };

    const handleDelete = async (type: 'transaction' | 'pocket' | 'card', id: string) => {
        if (type === 'card') {
            const referenced = transactions.some(t => t.cardId === id) || pockets.some(p => p.sourceCardId === id);
            const msg = referenced
                ? 'Kartu ini terhubung dengan transaksi/kantong. Sistem akan melepas keterhubungan lalu menghapus kartu. Lanjutkan?'
                : 'Yakin ingin menghapus kartu ini?';
            if (!window.confirm(msg)) return;
            try {
                if (referenced) {
                    await safeDeleteCard(id);
                } else {
                    await deleteCardRow(id);
                }
                setCards(p => p.filter(i => i.id !== id));
                showNotification('Kartu berhasil dihapus.');
            } catch (err) {
                alert('Gagal menghapus kartu di database. Coba lagi.');
            }
            return;
        }
        if (!window.confirm('Yakin ingin menghapus item ini?')) return;
        if (type === 'transaction') {
            try {
                const tx = transactions.find(t => t.id === id);
                if (!tx) {
                    setTransactions(p => p.filter(i => i.id !== id));
                } else {
                    // reverse impact on card balance if any
                    if (tx.cardId) {
                        const delta = tx.type === TransactionType.INCOME ? -tx.amount : tx.amount; // reverse
                        try { await updateCardBalance(tx.cardId, delta); } catch {}
                        setCards(prev => prev.map(c => c.id === tx.cardId ? { ...c, balance: c.balance + delta } : c));
                    }
                    // delete from DB
                    // lazy import at top already has service; we call it via dynamic import alternative: use updateTransactionRow? No, we added deleteTransaction in services.
                }
            } catch {}
            try {
                const { deleteTransaction } = await import('../services/transactions');
                await deleteTransaction(id);
            } catch (e) {
                alert('Gagal menghapus transaksi di database. Coba lagi.');
                return;
            }
            setTransactions(p => p.filter(i => i.id !== id));
            return;
        }
        if (type === 'pocket') {
            if (!window.confirm('Yakin ingin menghapus kantong ini?')) return;
            try {
                await deletePocketRow(id);
            } catch (e) {
                alert('Gagal menghapus kantong di database. Coba lagi.');
                return;
            }
            setPockets(p => p.filter(i => i.id !== id));
        }
    };

    const handleCloseModal = () => setModalState({ type: null, mode: 'add' });

    const handleFormChange = (e: React.ChangeEvent<any>) => setForm((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleFilterChange = (e: React.ChangeEvent<any>) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleTutupAnggaran = () => {
        if (!monthlyBudgetPocket) { return; }
        if (monthlyBudgetPocket.amount <= 0) {
            alert("Tidak ada sisa anggaran untuk disimpan.");
            return;
        }
        if (window.confirm(`Anda akan menyimpan sisa anggaran sebesar ${formatCurrency(monthlyBudgetPocket.amount)} ke kantong baru. Lanjutkan?`)) {
            handleCloseBudget(monthlyBudgetPocket, false);
        }
    };
    
    const expenseDonutData = useMemo(() => {
        const expenseByCategory = transactions
            .filter(t => t.type === TransactionType.EXPENSE)
            .reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
                return acc;
            }, {} as Record<string, number>);

        const colors = ['#f87171', '#fb923c', '#facc15', '#a3e635', '#34d399', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6'];
        return Object.entries(expenseByCategory)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
    }, [transactions]);
    
    const getTransactionSubDescription = (transaction: Transaction): string => {
        const isInternal = transaction.category === 'Transfer Internal' || transaction.category === 'Penutupan Anggaran' || transaction.method === 'Sistem';
        
        const project = transaction.projectId ? projects.find(p => p.id === transaction.projectId) : null;
        const projectText = project ? project.projectName : null;

        if (isInternal) {
            return projectText ? `Proyek: ${projectText}` : '';
        }

        let sourceDestText = '';
        if (transaction.type === TransactionType.INCOME) {
            const card = cards.find(c => c.id === transaction.cardId);
            if (card) {
                sourceDestText = card.cardType === CardType.TUNAI 
                    ? 'Masuk ke Tunai' 
                    : `Masuk ke ${card.bankName} ${card.lastFourDigits !== 'CASH' ? `**** ${card.lastFourDigits}` : ''}`;
            }
        } else { // EXPENSE
            if (transaction.pocketId) {
                const pocket = pockets.find(p => p.id === transaction.pocketId);
                if (pocket) {
                    sourceDestText = `Dibayar dari kantong "${pocket.name}"`;
                }
            } else if (transaction.cardId) {
                const card = cards.find(c => c.id === transaction.cardId);
                if (card) {
                     sourceDestText = card.cardType === CardType.TUNAI 
                        ? 'Dibayar dari Tunai' 
                        : `Dibayar dari ${card.bankName} ${card.lastFourDigits !== 'CASH' ? `**** ${card.lastFourDigits}` : ''}`;
                }
            } else {
                sourceDestText = `Metode: ${transaction.method}`;
            }
        }

        if (sourceDestText && projectText) {
            return `${sourceDestText} • ${projectText}`;
        }
        
        return sourceDestText || projectText || '';
    };

    const handleDownloadReportCSV = () => {
        // Desired column order and localized values to match the provided example
        const headers = ['ID Transaksi', 'Tanggal', 'Deskripsi', 'Kategori', 'Jumlah', 'Jenis'];
        const data = [...reportTransactions]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(t => [
                t.id,
                new Date(t.date).toLocaleDateString('id-ID'),
                t.description,
                t.category || '-',
                // Keep as plain number for clean CSV numeric column
                Number(t.amount),
                t.type === TransactionType.INCOME ? 'Pemasukan' : 'Pengeluaran'
            ]);
        const clientName = reportFilters.client === 'all' ? 'Semua-Klien' : (reportClientOptions.find(c => c.id === reportFilters.client)?.name || 'Klien').replace(/\s+/g, '-');
        downloadCSV(headers, data, `Laporan-Keuangan-${clientName}-${new Date().toISOString().split('T')[0]}.csv`);
    };

    const handleDownloadTransactionsCSV = () => {
        const headers = ['ID Transaksi', 'Tanggal', 'Deskripsi', 'Kategori', 'Jumlah', 'Jumlah (Numerik)', 'Jenis'];
        const data = [...filteredTransactions]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(t => [
                t.id,
                new Date(t.date).toLocaleDateString('id-ID'),
                t.description,
                t.category || '-',
                // Display currency for better readability in Excel
                formatCurrencyCSV(Number(t.amount)),
                Number(t.amount),
                t.type === TransactionType.INCOME ? 'Pemasukan' : 'Pengeluaran'
            ]);
        // Section: Summary for current filter
        data.push(['', '', '', '', '', '', '']);
        data.push(['', '', 'Ringkasan (Filter)', '', '', '', '']);
        data.push(['', '', 'Total Pemasukan (Filter)', '', formatCurrencyCSV(Number(filteredSummary.income)), Number(filteredSummary.income), '']);
        data.push(['', '', 'Total Pengeluaran (Filter)', '', formatCurrencyCSV(Number(filteredSummary.expense)), Number(filteredSummary.expense), '']);
        data.push(['', '', 'Laba/Rugi Bersih (Filter)', '', formatCurrencyCSV(Number(filteredSummary.net)), Number(filteredSummary.net), '']);
        
        // Section: Summary for all transactions
        const overallIncome = transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
        const overallExpense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
        const overallNet = overallIncome - overallExpense;
        data.push(['', '', '', '', '', '', '']);
        data.push(['', '', 'Ringkasan (Semua)', '', '', '', '']);
        data.push(['', '', 'Total Pemasukan (Semua)', '', formatCurrencyCSV(Number(overallIncome)), Number(overallIncome), '']);
        data.push(['', '', 'Total Pengeluaran (Semua)', '', formatCurrencyCSV(Number(overallExpense)), Number(overallExpense), '']);
        data.push(['', '', 'Laba/Rugi Bersih (Semua)', '', formatCurrencyCSV(Number(overallNet)), Number(overallNet), '']);
        const title = 'Pembiayaan/Transaksi';
        const today = new Date().toLocaleDateString('id-ID');
        const preface = [['', `${title} - ${today}`, '', '', '', '', ''], ['', '', '', '', '', '', '']];
        downloadCSV(headers, data, `Transaksi-${new Date().toISOString().split('T')[0]}.csv`, preface);
    };

    const handleDownloadProfitReportCSV = () => {
        const headers = ['ID Klien', 'Nama Klien', 'Total Pemasukan', 'Total Biaya Produksi', 'Laba Kotor'];
        const data = projectProfitabilityData.map(d => [
            d!.clientId,
            d!.clientName,
            d!.totalIncome,
            d!.totalCost,
            d!.profit
        ]);
        const period = `${profitReportFilters.month + 1}-${profitReportFilters.year}`;
        downloadCSV(headers, data, `Laporan-Laba-Proyek-${period}-${new Date().toISOString().split('T')[0]}.csv`);
    };

    // AI Report Generation
    const generateAIReport = async () => {
        setIsReportLoading(true);
        setError(null);
        setAiReport(null);
        setAiReportRawData(null);

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const transactionsLast30Days = transactions.filter(t => new Date(t.date) >= thirtyDaysAgo);
        const projectsCompletedLast30Days = projects.filter(p => p.status === 'Selesai' && p.deadlineDate && new Date(p.deadlineDate) >= thirtyDaysAgo);

        const incomeLast30Days = transactionsLast30Days.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
        const expenseLast30Days = transactionsLast30Days.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);

        const weeklyData = Array.from({ length: 4 }, (_, i) => ({ week: `Minggu ${i + 1}`, income: 0, expense: 0 }));
        transactionsLast30Days.forEach(t => {
            const transactionDate = new Date(t.date);
            const daysAgo = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24);
            const weekIndex = Math.floor(daysAgo / 7);
            if (weekIndex >= 0 && weekIndex < 4) {
                if (t.type === TransactionType.INCOME) weeklyData[3 - weekIndex].income += t.amount;
                else weeklyData[3 - weekIndex].expense += t.amount;
            }
        });


        const incomeByCategory = transactionsLast30Days.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {} as Record<string, number>);
        const expenseByCategory = transactionsLast30Days.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {} as Record<string, number>);
        
        const projectProfitability = projectsCompletedLast30Days.map(p => {
            const projectIncome = transactions.filter(t => t.projectId === p.id && t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
            const projectExpense = transactions.filter(t => t.projectId === p.id && t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
            return { name: p.projectName, profit: projectIncome - projectExpense };
        });

        const totalAssetValue = cards.reduce((sum, c) => sum + c.balance, 0);

        const rawDataForReport = { incomeLast30Days, expenseLast30Days, weeklyData, incomeByCategory, expenseByCategory, projectProfitability, totalAssetValue };
        setAiReportRawData(rawDataForReport);

        const dataSummary = `
            - Periode Analisis: 30 Hari Terakhir (${thirtyDaysAgo.toLocaleDateString('id-ID')} - ${now.toLocaleDateString('id-ID')})
            - Total Pemasukan: ${formatCurrency(incomeLast30Days)}
            - Total Pengeluaran: ${formatCurrency(expenseLast30Days)}
            - Laba/Rugi Bersih: ${formatCurrency(incomeLast30Days - expenseLast30Days)}
            - Data Grafik Arus Kas Mingguan (4 minggu terakhir): ${JSON.stringify(weeklyData)}
            - Pemasukan per Kategori: ${JSON.stringify(incomeByCategory)}
            - Pengeluaran per Kategori: ${JSON.stringify(expenseByCategory)}
            - Total Nilai Aset (Saldo Kartu & Tunai): ${formatCurrency(totalAssetValue)}
            - Profitabilitas Proyek Selesai: ${JSON.stringify(projectProfitability)}
        `;

        const prompt = `Anda adalah 'Vena Finance AI', seorang analis keuangan ahli untuk bisnis fotografi Vena Pictures. Analisis data keuangan komprehensif untuk 30 hari terakhir berikut ini. Analisis harus mencakup data grafik mingguan, rincian kategori, dan profitabilitas proyek untuk menghasilkan laporan keuangan bulanan yang mendalam. Laporan harus dalam Bahasa Indonesia.

        Data Komprehensif:
        ${dataSummary}

        Tugas Anda adalah menghasilkan laporan dalam format JSON dengan struktur yang ditentukan di bawah ini. Pastikan setiap bagian diisi dengan analisis yang tajam, wawasan yang berguna, dan saran yang dapat ditindaklanjuti berdasarkan SEMUA data yang diberikan.

        Struktur JSON yang Diinginkan:
        {
          "executive_summary": "string",
          "income_analysis": "string",
          "expense_analysis": "string",
          "cash_flow_commentary": "string",
          "asset_health": "string",
          "strategic_recommendations": ["string", "string", "string"]
        }
        
        Detail untuk setiap bagian:
        - executive_summary: 2-3 kalimat ringkasan tingkat tinggi tentang kesehatan keuangan bulan ini.
        - income_analysis: Analisis sumber pendapatan. Sebutkan kategori pendapatan terbesar dan analisis profitabilitas proyek jika ada.
        - expense_analysis: Analisis pengeluaran. Sebutkan kategori pengeluaran terbesar dan area yang perlu diperhatikan.
        - cash_flow_commentary: Komentar tentang arus kas (positif/negatif) berdasarkan data mingguan dan implikasinya.
        - asset_health: Komentar singkat tentang kondisi aset (total saldo) saat ini.
        - strategic_recommendations: Tiga rekomendasi strategis yang paling penting dan konkret berdasarkan data.
        `;
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            executive_summary: { type: Type.STRING },
                            income_analysis: { type: Type.STRING },
                            expense_analysis: { type: Type.STRING },
                            cash_flow_commentary: { type: Type.STRING },
                            asset_health: { type: Type.STRING },
                            strategic_recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["executive_summary", "income_analysis", "expense_analysis", "cash_flow_commentary", "asset_health", "strategic_recommendations"]
                    }
                }
            });
            const result = JSON.parse(response.text.trim());
            setAiReport(result);
        } catch (err) {
            console.error("AI Report Error:", err);
            setError("Gagal membuat laporan AI. Silakan coba lagi.");
        } finally {
            setIsReportLoading(false);
        }
    };

    const handleDownloadAIReportCSV = () => {
        if (!aiReport || !aiReportRawData) return;
        
        const headers = ["Bagian Laporan", "Detail", "Nilai"];
        
        let data: (string | number | undefined)[][] = [
            ["Ringkasan Eksekutif", aiReport.executive_summary],
            ["Analisis Pemasukan", aiReport.income_analysis],
            ["Analisis Pengeluaran", aiReport.expense_analysis],
            ["Komentar Arus Kas", aiReport.cash_flow_commentary],
            ["Kesehatan Aset", aiReport.asset_health],
            ...aiReport.strategic_recommendations.map((rec: string, index: number) => 
                [index === 0 ? "Rekomendasi Strategis" : "", rec]
            ),
            [], // blank row
            ["DATA MENTAH YANG DIGUNAKAN UNTUK ANALISIS"],
            ["Total Pemasukan (30 hari)", "", aiReportRawData.incomeLast30Days],
            ["Total Pengeluaran (30 hari)", "", aiReportRawData.expenseLast30Days],
            ["Laba/Rugi Bersih (30 hari)", "", aiReportRawData.incomeLast30Days - aiReportRawData.expenseLast30Days],
            ["Total Aset Saat Ini", "", aiReportRawData.totalAssetValue],
            [],
            ["ARUS KAS MINGGUAN", "Pemasukan", "Pengeluaran"],
            ...aiReportRawData.weeklyData.map((d: any) => [d.week, d.income, d.expense]),
            [],
            ["PEMASUKAN PER KATEGORI", "Jumlah"],
            ...Object.entries(aiReportRawData.incomeByCategory).map(([cat, amount]) => [cat, amount]),
            [],
            ["PENGELUARAN PER KATEGORI", "Jumlah"],
            ...Object.entries(aiReportRawData.expenseByCategory).map(([cat, amount]) => [cat, amount]),
            [],
            ["PROFITABILITAS PROYEK SELESAI", "Laba"],
            ...aiReportRawData.projectProfitability.map((p: any) => [p.name, p.profit])
        ];
    
        downloadCSV(headers, data, `Laporan-AI-Keuangan-Lengkap-${new Date().toISOString().split('T')[0]}.csv`);
    };

    const AIReportTab: React.FC = () => {
        const AILoadingSkeleton: React.FC = () => (
            <div className="p-6 animate-pulse">
                <div className="h-6 w-3/4 bg-brand-bg rounded-md mb-4"></div>
                <div className="space-y-2"><div className="h-4 bg-brand-bg rounded-md"></div><div className="h-4 bg-brand-bg rounded-md w-5/6"></div></div>
                <div className="mt-6 pt-4 border-t border-brand-border/50"><div className="h-5 w-1/3 bg-brand-bg rounded-md mb-3"></div><div className="space-y-3"><div className="h-8 bg-brand-bg rounded-md"></div><div className="h-8 bg-brand-bg rounded-md"></div></div></div>
            </div>
        );

        return (
            <div className="space-y-6">
                {!aiReport && !isReportLoading && (
                    <div className="text-center p-8 bg-brand-bg rounded-lg">
                        <h3 className="text-xl font-bold text-brand-text-light">Laporan Keuangan Bulanan dengan AI</h3>
                        <p className="mt-2 text-brand-text-secondary max-w-lg mx-auto">Klik tombol di bawah untuk membiarkan AI menganalisis data keuangan Anda dalam sebulan terakhir dan menghasilkan laporan komprehensif dengan wawasan strategis.</p>
                        <button onClick={generateAIReport} className="mt-6 button-primary inline-flex items-center gap-2">
                            <SparkleIcon className="w-5 h-5" /> Buat Laporan Sekarang
                        </button>
                    </div>
                )}
                {isReportLoading && <AILoadingSkeleton />}
                {error && <p className="text-red-500 bg-red-500/10 p-4 rounded-lg">{error}</p>}
                {aiReport && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-bold text-gradient">Laporan AI untuk Bulan Ini</h3>
                            <div className="flex gap-2">
                                <button onClick={generateAIReport} className="button-secondary text-sm">Buat Ulang</button>
                                <button onClick={handleDownloadAIReportCSV} className="button-primary text-sm inline-flex items-center gap-2">
                                    <DownloadIcon className="w-4 h-4" /> Unduh CSV
                                </button>
                            </div>
                        </div>
                        <div className="bg-brand-bg p-6 rounded-lg">
                            <h4 className="font-semibold text-brand-text-light mb-2">Ringkasan Eksekutif</h4>
                            <p className="text-brand-text-primary">{aiReport.executive_summary}</p>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-brand-bg p-6 rounded-lg">
                                <h4 className="font-semibold text-brand-text-light mb-2">Analisis Pemasukan & Pengeluaran</h4>
                                <p className="text-sm text-brand-text-primary border-b border-brand-border pb-2 mb-2">{aiReport.income_analysis}</p>
                                <p className="text-sm text-brand-text-primary">{aiReport.expense_analysis}</p>
                            </div>
                            <div className="bg-brand-bg p-6 rounded-lg">
                                <h4 className="font-semibold text-brand-text-light mb-2">Arus Kas & Aset</h4>
                                <p className="text-sm text-brand-text-primary border-b border-brand-border pb-2 mb-2">{aiReport.cash_flow_commentary}</p>
                                <p className="text-sm text-brand-text-primary">{aiReport.asset_health}</p>
                            </div>
                        </div>
                        <div className="bg-brand-bg p-6 rounded-lg">
                            <h4 className="font-semibold text-brand-text-light mb-2">Rekomendasi Strategis</h4>
                            <ul className="list-disc list-inside space-y-2 text-brand-text-primary">
                                {aiReport.strategic_recommendations.map((rec: string, index: number) => <li key={index}>{rec}</li>)}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        );
    };


    const renderTabContent = () => {
        switch (activeTab) {
            case 'transactions':
                const CategoryButton = ({ type, categoryName, amount, isActive, onClick }: {type: TransactionType, categoryName: string, amount: number, isActive: boolean, onClick: ()=>void}) => (
                    <button
                        onClick={onClick}
                        className={`w-full flex justify-between items-center text-left p-3 rounded-lg text-sm transition-colors ${
                            isActive
                                ? 'bg-blue-500/10 text-brand-accent font-semibold'
                                : 'text-brand-text-primary hover:bg-brand-input'
                        }`}
                    >
                        <span className="truncate">{categoryName}</span>
                        <span className={`font-medium ${amount > 0 ? (type === TransactionType.INCOME ? 'text-brand-success/80' : 'text-brand-danger/80') : 'text-brand-text-secondary'}`}>
                            {new Intl.NumberFormat('id-ID', {notation: 'compact'}).format(amount)}
                        </span>
                    </button>
                );
    
                const allIncomeTotal: number = Object.keys(categoryTotals.income).reduce((sum: number, key: string) => sum + categoryTotals.income[key], 0);
                const allExpenseTotal: number = Object.keys(categoryTotals.expense).reduce((sum: number, key: string) => sum + categoryTotals.expense[key], 0);

                return (
                     <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                        {/* Left Column: Category Filters & Budget */}
                        <div className="lg:col-span-1 space-y-6">
                            {monthlyBudgetPocket && (
                                <div className="bg-brand-surface p-4 rounded-2xl shadow-lg border border-brand-border">
                                    <h4 className="font-semibold text-gradient mb-2">{monthlyBudgetPocket.name}</h4>
                                    <p className="text-2xl font-bold text-blue-400">{formatCurrency(monthlyBudgetPocket.amount)}</p>
                                    <p className="text-xs text-brand-text-secondary mt-1">dari {formatCurrency(monthlyBudgetPocket.goalAmount || 0)}</p>
                                    <button onClick={handleTutupAnggaran} className="w-full mt-3 button-secondary text-sm">Tutup & Simpan Sisa</button>
                                </div>
                            )}
                            <div className="bg-brand-surface p-4 rounded-2xl shadow-lg border border-brand-border">
                                <h4 className="font-semibold text-gradient mb-3 px-2">Pemasukan</h4>
                                <div className="space-y-1">
                                    <CategoryButton type={TransactionType.INCOME} categoryName="Semua" amount={allIncomeTotal} isActive={categoryFilter.type === TransactionType.INCOME && categoryFilter.category === 'Semua'} onClick={() => setCategoryFilter({ type: TransactionType.INCOME, category: 'Semua' })} />
                                    {Object.entries(categoryTotals.income).map(([name, amount]: [string, number]) => (
                                        <React.Fragment key={name}>
                                            <CategoryButton type={TransactionType.INCOME} categoryName={name} amount={amount} isActive={categoryFilter.type === TransactionType.INCOME && categoryFilter.category === name} onClick={() => setCategoryFilter({ type: TransactionType.INCOME, category: name })} />
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-brand-surface p-4 rounded-2xl shadow-lg border border-brand-border">
                                <h4 className="font-semibold text-gradient mb-3 px-2">Pengeluaran</h4>
                                 <div className="space-y-1">
                                    <CategoryButton type={TransactionType.EXPENSE} categoryName="Semua" amount={allExpenseTotal} isActive={categoryFilter.type === TransactionType.EXPENSE && categoryFilter.category === 'Semua'} onClick={() => setCategoryFilter({ type: TransactionType.EXPENSE, category: 'Semua' })} />
                                    {Object.entries(categoryTotals.expense).map(([name, amount]: [string, number]) => (
                                        <React.Fragment key={name}>
                                            <CategoryButton type={TransactionType.EXPENSE} categoryName={name} amount={amount} isActive={categoryFilter.type === TransactionType.EXPENSE && categoryFilter.category === name} onClick={() => setCategoryFilter({ type: TransactionType.EXPENSE, category: name })} />
                                        </React.Fragment>
                                    ))}
                                 </div>
                            </div>
                        </div>
                        {/* Right Column: Main Content */}
                        <div className="lg:col-span-3 bg-brand-surface p-4 sm:p-6 rounded-2xl shadow-lg border border-brand-border">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
                                <input name="searchTerm" value={filters.searchTerm} onChange={handleFilterChange} placeholder="Cari deskripsi, kategori..." className="input-field !rounded-lg !border p-2.5 md:col-span-1"/>
                                <input name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange} type="date" className="input-field !rounded-lg !border p-2.5"/>
                                <input name="dateTo" value={filters.dateTo} onChange={handleFilterChange} type="date" className="input-field !rounded-lg !border p-2.5"/>
                                <div className="non-printable flex md:justify-end">
                                    <button onClick={handleDownloadTransactionsCSV} className="button-secondary inline-flex items-center gap-2 w-full md:w-auto justify-center">
                                        <DownloadIcon className="w-5 h-5"/> Unduh CSV
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-brand-bg rounded-xl">
                                <div><p className="text-sm text-brand-text-secondary">Total Pemasukan (Filter)</p><p className="text-lg font-bold text-brand-success">{formatCurrency(filteredSummary.income)}</p></div>
                                <div><p className="text-sm text-brand-text-secondary">Total Pengeluaran (Filter)</p><p className="text-lg font-bold text-brand-danger">{formatCurrency(filteredSummary.expense)}</p></div>
                                <div><p className="text-sm text-brand-text-secondary">Laba/Rugi Bersih (Filter)</p><p className="text-lg font-bold text-brand-text-light">{formatCurrency(filteredSummary.net)}</p></div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-brand-text-secondary uppercase"><tr><th className="p-3 text-left">Tanggal</th><th className="p-3 text-left">Deskripsi</th><th className="p-3 text-left">Kategori</th><th className="p-3 text-right">Jumlah</th><th className="p-3 text-center">Aksi</th></tr></thead>
                                    <tbody className="divide-y divide-brand-border">
                                        {filteredTransactions.map(t => {
                                          const subDescription = getTransactionSubDescription(t);
                                          return (
                                            <tr key={t.id} className="hover:bg-brand-bg">
                                                <td className="p-3">{new Date(t.date).toLocaleDateString('id-ID')}</td>
                                                <td className="p-3">
                                                    <p className="font-semibold text-brand-text-light">{t.description}</p>
                                                    {subDescription && <p className="text-xs text-brand-text-secondary">{subDescription}</p>}
                                                </td>
                                                <td className="p-3"><span className="px-2 py-1 text-xs bg-brand-bg text-brand-text-primary rounded-full">{t.category}</span></td>
                                                <td className={`p-3 text-right font-semibold ${t.type === TransactionType.INCOME ? 'text-brand-success' : 'text-brand-danger'}`}>{formatCurrency(t.amount)}</td>
                                                <td className="p-3 text-center">
                                                    <div className="flex items-center justify-center space-x-1">
                                                        <button onClick={() => handleOpenModal('transaction', 'edit', t)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full"><PencilIcon className="w-4 h-4"/></button>
                                                        <button onClick={() => handleDelete('transaction', t.id)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full"><Trash2Icon className="w-4 h-4"/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                          );
                                        })}
                                    </tbody>
                                </table>
                                {filteredTransactions.length === 0 && <p className="text-center py-10 text-brand-text-secondary">Tidak ada transaksi yang cocok.</p>}
                            </div>
                        </div>
                    </div>
                );
            case 'pockets': 
                return (
                <div className="widget-animate">
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                       <StatCard icon={<ClipboardListIcon className="w-6 h-6"/>} title="Total Dana di Kantong" value={formatCurrency(summary.pocketsTotal)} subtitle="Total dana yang dialokasikan (non-hadiah)." />
                       <StatCard icon={<StarIcon className="w-6 h-6"/>} title="Total Hadiah Freelancer" value={formatCurrency(summary.totalRewards)} subtitle="Total saldo hadiah yang belum ditarik." />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {pockets.map(p => {
                            const sourceCard = p.sourceCardId ? cards.find(c => c.id === p.sourceCardId) : null;
                            const isRewardPool = p.type === PocketType.REWARD_POOL;
                            const amount = isRewardPool ? summary.totalRewards : p.amount;
                            return (
                                <div key={p.id} className="bg-brand-surface p-6 rounded-2xl shadow-lg flex flex-col cursor-pointer border border-brand-border" onClick={() => setHistoryModalState({type: isRewardPool ? 'reward_pool' : 'pocket', item: p})}>
                                    <div className="flex justify-between items-start">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-brand-bg text-brand-accent`}>{pocketIcons[p.icon]}</div>
                                        <div className="flex gap-1 non-printable"><button onClick={(e) => { e.stopPropagation(); handleOpenModal('pocket', 'edit', p);}} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full"><PencilIcon className="w-4 h-4"/></button><button onClick={(e) => { e.stopPropagation(); handleDelete('pocket', p.id);}} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full"><Trash2Icon className="w-4 h-4"/></button></div>
                                    </div>
                                    <div className="flex-grow mt-4"><h4 className="font-bold text-lg text-gradient">{p.name}</h4><p className="text-sm text-brand-text-secondary">{p.description}</p></div>
                                    <div className="mt-4">
                                        <p className="text-2xl font-bold text-brand-text-light">{formatCurrency(amount)}</p>
                                        {p.goalAmount && !isRewardPool ? (<div className="mt-2"><div className="w-full bg-brand-bg rounded-full h-2"><div className="bg-brand-accent h-2 rounded-full" style={{width: `${Math.min((amount/p.goalAmount)*100, 100)}%`}}></div></div><p className="text-xs text-brand-text-secondary mt-1 text-right">Target: {formatCurrency(p.goalAmount)}</p></div>) : null}
                                        {sourceCard && <p className="text-xs text-brand-text-secondary mt-1">Disimpan di: {sourceCard.bankName}</p>}
                                    </div>
                                    {!isRewardPool && (<div className="flex gap-2 mt-4 pt-4 border-t border-brand-border non-printable">
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenModal('transfer', 'add', { ...p, transferType: 'withdraw' }); }} className="button-secondary text-sm flex-1">Tarik Dana</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenModal('transfer', 'add', { ...p, transferType: 'deposit' }); }} className="button-primary text-sm flex-1">Setor Dana</button>
                                    </div>)}
                                </div>
                            );
                        })}
                        <button onClick={() => handleOpenModal('pocket', 'add')} className="border-2 border-dashed border-brand-border rounded-2xl flex flex-col items-center justify-center text-brand-text-secondary hover:bg-brand-input hover:border-brand-accent hover:text-brand-accent transition-colors min-h-[250px]"><PlusIcon className="w-8 h-8"/><span className="mt-2 font-semibold">Buat Kantong Baru</span></button>
                    </div>
                </div>
            );
            case 'cards': 
                return (
                    <div className="widget-animate space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard icon={<CreditCardIcon className="w-6 h-6"/>} title="Total Utang Kartu Kredit" value={formatCurrency(Math.abs(cardStats.creditDebt))} iconBgColor="bg-red-500/20" iconColor="text-red-400" />
                            <StatCard icon={<DollarSignIcon className="w-6 h-6"/>} title="Total Aset (Debit & Tunai)" value={formatCurrency(cardStats.debitAndCashAssets)} iconBgColor="bg-green-500/20" iconColor="text-green-400" />
                            <StatCard icon={<TrendingUpIcon className="w-6 h-6"/>} title="Kartu Paling Sering Digunakan" value={cardStats.mostUsedCardName} subtitle={`${cardStats.mostUsedCardTxCount} transaksi`} iconBgColor="bg-blue-500/20" iconColor="text-blue-400" />
                            <StatCard icon={<CashIcon className="w-6 h-6"/>} title="Total Saldo Tunai" value={formatCurrency(cardStats.cashBalance)} iconBgColor="bg-yellow-500/20" iconColor="text-yellow-400" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {cards.map(card => {
                                const connectedPockets = pockets.filter(p => p.sourceCardId === card.id);
                                return (
                                    <div key={card.id}>
                                        {card.cardType === CardType.TUNAI 
                                            ? <CashWidget card={card} onClick={() => setHistoryModalState({type: 'card', item: card})} onTopUp={() => handleOpenModal('topup-cash', 'add')} onEdit={() => handleOpenModal('card', 'edit', card)} connectedPockets={connectedPockets} /> 
                                            : <CardWidget card={card} onEdit={() => handleOpenModal('card', 'edit', card)} onDelete={() => handleDelete('card', card.id)} onClick={() => setHistoryModalState({type: 'card', item: card})} connectedPockets={connectedPockets} />
                                        }
                                    </div>
                                );
                            })}
                            <button onClick={() => handleOpenModal('card', 'add')} className="group aspect-[1.586] border-2 border-dashed border-brand-border rounded-2xl flex flex-col items-center justify-center text-brand-text-secondary hover:bg-brand-input hover:border-brand-accent hover:text-brand-accent transition-all duration-300">
                                <div className="w-16 h-16 rounded-full bg-brand-bg group-hover:bg-brand-accent/10 flex items-center justify-center transition-colors">
                                    <PlusIcon className="w-8 h-8 transition-transform group-hover:scale-110"/>
                                </div>
                                <span className="mt-4 font-semibold">Tambah Kartu / Akun</span>
                            </button>
                        </div>
                    </div>
                );
            case 'cashflow': return (
                 <div className="space-y-6 widget-animate">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard icon={<ShieldIcon className="w-6 h-6"/>} title="Ketahanan Keuangan (Runway)" value={cashflowMetrics.runway} subtitle={`Estimasi operasional berdasarkan burn rate. Burn Rate: ${formatCurrency(cashflowMetrics.burnRate)}/bln`} iconBgColor="bg-yellow-500/20" iconColor="text-yellow-400" />
                        <StatCard icon={<DollarSignIcon className="w-6 h-6"/>} title="Total Laba/Rugi" value={formatCurrency(filteredSummary.net)} subtitle="Berdasarkan filter transaksi saat ini" iconBgColor="bg-indigo-500/20" iconColor="text-indigo-400" />
                        <StatCard icon={<TrendingUpIcon className="w-6 h-6"/>} title="Rata-rata Pemasukan/bln" value={formatCurrency(cashflowMetrics.avgIncome)} subtitle="Selama periode data tersedia" iconBgColor="bg-green-500/20" iconColor="text-green-400" />
                        <StatCard icon={<TrendingDownIcon className="w-6 h-6"/>} title="Rata-rata Pengeluaran/bln" value={formatCurrency(cashflowMetrics.avgExpense)} subtitle="Selama periode data tersedia" iconBgColor="bg-red-500/20" iconColor="text-red-400" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border"><h4 className="text-lg font-bold text-gradient mb-4">Grafik Arus Kas</h4><InteractiveCashflowChart data={cashflowChartData} /></div>
                        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border"><h4 className="text-lg font-bold text-gradient mb-4">Pengeluaran per Kategori</h4><DonutChart data={expenseDonutData} /></div>
                    </div>
                     <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
                        <h4 className="text-lg font-bold text-gradient mb-4">Data Arus Kas Bulanan</h4>
                        <div className="overflow-x-auto max-h-96">
                             <table className="w-full text-sm">
                                <thead className="text-xs uppercase print-bg-slate bg-brand-input">
                                    <tr className="print-text-black">
                                        <th className="p-3 text-left">Periode</th>
                                        <th className="p-3 text-right">Pemasukan</th>
                                        <th className="p-3 text-right">Pengeluaran</th>
                                        <th className="p-3 text-right">Laba/Rugi</th>
                                        <th className="p-3 text-right">Saldo Akhir</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-border">
                                    {cashflowChartData.map(d => (
                                    <tr key={d.label}>
                                        <td className="p-3 font-semibold">{d.label}</td>
                                        <td className="p-3 text-right text-brand-success">{formatCurrency(d.income)}</td>
                                        <td className="p-3 text-right text-brand-danger">{formatCurrency(d.expense)}</td>
                                        <td className={`p-3 text-right font-semibold ${d.income - d.expense >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>{formatCurrency(d.income - d.expense)}</td>
                                        <td className="p-3 text-right font-bold text-brand-text-light">{formatCurrency(d.balance)}</td>
                                    </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
            case 'laporan':
                return (
                    <div className="space-y-6 printable-area widget-animate">
                        <div className="bg-brand-surface p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center non-printable border border-brand-border">
                            <h4 className="text-md font-semibold text-gradient whitespace-nowrap">Filter Laporan:</h4>
                             <select name="client" value={reportFilters.client} onChange={e => setReportFilters(p => ({...p, client: e.target.value}))} className="input-field !rounded-lg !border p-2.5 w-full md:w-auto"><option value="all">Semua Klien</option>{reportClientOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                            <input type="date" name="dateFrom" value={reportFilters.dateFrom} onChange={e => setReportFilters(p => ({...p, dateFrom: e.target.value}))} className="input-field !rounded-lg !border p-2.5 w-full md:w-auto"/>
                            <input type="date" name="dateTo" value={reportFilters.dateTo} onChange={e => setReportFilters(p => ({...p, dateTo: e.target.value}))} className="input-field !rounded-lg !border p-2.5 w-full md:w-auto"/>
                            <div className="flex items-center gap-2 ml-auto">
                                <button onClick={handleDownloadReportCSV} className="button-secondary inline-flex items-center gap-2"><DownloadIcon className="w-5 h-5"/>Unduh CSV</button>
                                <button onClick={() => window.print()} className="button-primary inline-flex items-center gap-2"><PrinterIcon className="w-5 h-5"/>Cetak PDF</button>
                            </div>
                        </div>
                        {reportFilters.client !== 'all' ? (
                           <ClientProfitabilityReport
                                transactions={reportTransactions}
                                clientName={reportClientOptions.find(c=>c.id === reportFilters.client)?.name || ''}
                                periodText={`${reportFilters.dateFrom || ''} - ${reportFilters.dateTo || ''}`}
                                profile={profile}
                             />
                        ) : (
                            generalReportMetrics && <GeneralFinancialReport 
                                metrics={generalReportMetrics} 
                                transactions={reportTransactions}
                                periodText={`${reportFilters.dateFrom || ''} - ${reportFilters.dateTo || ''}`}
                                profile={profile}
                            />
                        )}
                    </div>
                );
            case 'laporanKartu':
                return <CardReportTab transactions={transactions} cards={cards} profile={profile} />;
            case 'labaProyek':
                const monthOptions = Array.from({length: 12}, (_, i) => ({ value: i, name: new Date(0, i).toLocaleString('id-ID', { month: 'long' }) }));
                const yearOptions: number[] = Array.from(new Set<number>(projects.map(p => new Date(p.date).getFullYear()))).sort((a: number, b: number) => b - a);

                return (
                    <div className="space-y-6 printable-area widget-animate">
                        <div className="bg-brand-surface p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center non-printable border border-brand-border">
                            <h4 className="text-md font-semibold text-gradient whitespace-nowrap">Filter Laporan Laba:</h4>
                            <select name="year" value={profitReportFilters.year} onChange={e => setProfitReportFilters(p => ({...p, year: Number(e.target.value)}))} className="input-field !rounded-lg !border p-2.5 w-full md:w-auto">
                                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select name="month" value={profitReportFilters.month} onChange={e => setProfitReportFilters(p => ({...p, month: Number(e.target.value)}))} className="input-field !rounded-lg !border p-2.5 w-full md:w-auto">
                                {monthOptions.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                            </select>
                             <div className="flex items-center gap-2 ml-auto">
                                <button onClick={handleDownloadProfitReportCSV} className="button-secondary inline-flex items-center gap-2"><DownloadIcon className="w-5 h-5"/>Unduh CSV</button>
                                <button onClick={() => window.print()} className="button-primary inline-flex items-center gap-2"><PrinterIcon className="w-5 h-5"/>Cetak PDF</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 non-printable">
                            <StatCard icon={<DollarSignIcon className="w-6 h-6"/>} title="Total Laba Periode Ini" value={formatCurrency(profitReportMetrics.totalProfit)} iconBgColor="bg-blue-500/20" iconColor="text-blue-400" />
                            <StatCard icon={<UsersIcon className="w-6 h-6"/>} title="Klien Paling Profit" value={profitReportMetrics.mostProfitableClient} iconBgColor="bg-green-500/20" iconColor="text-green-400" />
                            <StatCard icon={<TrendingUpIcon className="w-6 h-6"/>} title="Jumlah Proyek Profit" value={`${profitReportMetrics.profitableProjectsCount} dari ${projectProfitabilityData.length}`} iconBgColor="bg-yellow-500/20" iconColor="text-yellow-400" />
                            <StatCard icon={<TargetIcon className="w-6 h-6"/>} title="Rata-rata Laba/Proyek" value={formatCurrency(profitReportMetrics.avgProfit)} iconBgColor="bg-indigo-500/20" iconColor="text-indigo-400" />
                        </div>
                        <div className="printable-report">
                            <div className="hidden print:block text-black mb-6">
                                <h1 className="text-xl font-bold">{profile.companyName}</h1>
                                <p className="text-sm">{profile.address}</p>
                                <div className="mt-4 pt-4 border-t-2 border-black">
                                    <h2>Laporan Laba per Klien</h2>
                                    <p>Periode: {monthOptions.find(m => m.value === profitReportFilters.month)?.name} {profitReportFilters.year}</p>
                                </div>
                            </div>
                            <div className="bg-brand-surface p-6 rounded-2xl shadow-lg mt-6 border border-brand-border print:shadow-none print:border-none print:p-0 print:mt-0">
                                <div className="print:hidden">
                                    <h3 className="text-lg font-bold text-gradient mb-4">Laporan Laba per Klien</h3>
                                    <p className="text-sm text-brand-text-secondary mb-4">Menampilkan profitabilitas untuk proyek yang dieksekusi pada <strong>{monthOptions.find(m => m.value === profitReportFilters.month)?.name} {profitReportFilters.year}</strong>.</p>
                                </div>
                                <div className="overflow-x-auto max-h-[500px] print:max-h-none print:overflow-visible">
                                    <table className="w-full text-sm">
                                        <thead className="text-xs uppercase print-bg-slate bg-brand-input"><tr className="print-text-black"><th className="p-3 text-left">ID Klien</th><th className="p-3 text-left">Nama Klien</th><th className="p-3 text-right">Total Pemasukan</th><th className="p-3 text-right">Total Biaya Produksi</th><th className="p-3 text-right">Laba Kotor</th></tr></thead>
                                        <tbody className="divide-y divide-brand-border">
                                            {projectProfitabilityData.map(data => (
                                                <tr key={data!.clientId}>
                                                    <td className="p-3 font-mono text-xs">{data!.clientId}</td>
                                                    <td className="p-3 font-semibold">{data!.clientName}</td>
                                                    <td className="p-3 text-right text-brand-success">{formatCurrency(data!.totalIncome)}</td>
                                                    <td className="p-3 text-right text-brand-danger">{formatCurrency(data!.totalCost)}</td>
                                                    <td className={`p-3 text-right font-bold ${data!.profit >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>{formatCurrency(data!.profit)}</td>
                                                </tr>
                                            ))}
                                            {projectProfitabilityData.length === 0 && (
                                                <tr><td colSpan={5} className="text-center p-8 text-brand-text-secondary">Tidak ada data proyek untuk periode ini.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'laporanAI':
                return <AIReportTab />;

        }
    };
    
    // --- REPORT SUB-COMPONENTS ---
    const GeneralFinancialReport: React.FC<{metrics: any, transactions: Transaction[], periodText: string, profile: Profile}> = ({metrics, transactions, periodText, profile}) => (
        <div className="printable-report space-y-6">
            {/* Print Header */}
            <div className="hidden print:block text-black mb-6">
                <h1 className="text-xl font-bold">{profile.companyName}</h1>
                <p className="text-sm">{profile.address}</p>
                <div className="mt-4 pt-4 border-t-2 border-black">
                    <h2>Laporan Keuangan Umum</h2>
                    <p>Periode: {periodText}</p>
                </div>
            </div>

            {/* Screen Header */}
            <div className="print:hidden">
                <h2 className="text-2xl font-bold mb-2 text-gradient">Laporan Keuangan Umum</h2>
                <p className="mb-6 text-brand-text-primary">Periode: {periodText}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 StatCard-container">
                <StatCard icon={<ArrowUpIcon className="w-6 h-6"/>} title="Total Pemasukan" value={formatCurrency(metrics.reportIncome)} iconBgColor="bg-brand-success/20" iconColor="text-brand-success" />
                <StatCard icon={<ArrowDownIcon className="w-6 h-6"/>} title="Total Pengeluaran" value={formatCurrency(metrics.reportExpense)} iconBgColor="bg-brand-danger/20" iconColor="text-brand-danger" />
                <StatCard icon={<DollarSignIcon className="w-6 h-6"/>} title="Laba / Rugi Bersih" value={formatCurrency(metrics.reportIncome - metrics.reportExpense)} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 charts-container">
                <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border chart-wrapper"><h3 className="text-lg font-bold text-gradient mb-4">Analisis Pemasukan</h3><DonutChart data={metrics.incomeDonut}/></div>
                <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border chart-wrapper"><h3 className="text-lg font-bold text-gradient mb-4">Analisis Pengeluaran</h3><DonutChart data={metrics.expenseDonut}/></div>
            </div>
            <div className="bg-brand-surface p-6 rounded-2xl shadow-lg mt-6 border border-brand-border">
                <h3 className="text-lg font-bold text-gradient mb-4">Rincian Semua Transaksi</h3>
                <div className="overflow-x-auto max-h-[500px] print:max-h-none print:overflow-visible"><TransactionTable transactions={transactions} /></div>
            </div>
        </div>
    );
    
    const ClientProfitabilityReport: React.FC<{transactions: Transaction[], clientName: string, periodText: string, profile: Profile}> = ({ transactions, clientName, periodText, profile }) => {
        const clientIncome = transactions.filter(t => t.type === TransactionType.INCOME);
        const clientCost = transactions.filter(t => t.type === TransactionType.EXPENSE && PRODUCTION_COST_CATEGORIES.includes(t.category));
        const totalIncome = clientIncome.reduce((sum, t) => sum + t.amount, 0);
        const totalCost = clientCost.reduce((sum, t) => sum + t.amount, 0);
        const profit = totalIncome - totalCost;
        
        return (
            <div className="printable-report space-y-6">
                {/* Print Header */}
                <div className="hidden print:block text-black mb-6">
                    <h1 className="text-xl font-bold">{profile.companyName}</h1>
                    <p className="text-sm">{profile.address}</p>
                    <div className="mt-4 pt-4 border-t-2 border-black">
                        <h2>Laporan Profitabilitas Klien</h2>
                        <p>Klien: {clientName} | Periode: {periodText}</p>
                    </div>
                </div>
                
                {/* Screen Header */}
                <div className="print:hidden">
                    <h2 className="text-2xl font-bold mb-2 text-gradient">Laporan Profitabilitas Klien</h2>
                    <p className="mb-6 text-brand-text-primary">Klien: <span className="font-semibold">{clientName}</span> | Periode: {periodText}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 StatCard-container">
                    <StatCard icon={<ArrowUpIcon className="w-6 h-6"/>} title="Total Pemasukan" value={formatCurrency(totalIncome)} iconBgColor="bg-brand-success/20" iconColor="text-brand-success" />
                    <StatCard icon={<ArrowDownIcon className="w-6 h-6"/>} title="Total Biaya Produksi" value={formatCurrency(totalCost)} iconBgColor="bg-brand-danger/20" iconColor="text-brand-danger" />
                    <StatCard icon={<DollarSignIcon className="w-6 h-6"/>} title="Laba Kotor" value={formatCurrency(profit)} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border chart-wrapper">
                        <h3 className="text-lg font-bold text-gradient mb-4">Rincian Pemasukan dari Klien</h3>
                        <div className="overflow-x-auto max-h-[400px] print:max-h-none print:overflow-visible"><TransactionTable transactions={clientIncome} /></div>
                    </div>
                    <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border chart-wrapper">
                        <h3 className="text-lg font-bold text-gradient mb-4">Rincian Biaya Produksi</h3>
                        <div className="overflow-x-auto max-h-[400px] print:max-h-none print:overflow-visible"><TransactionTable transactions={clientCost} /></div>
                    </div>
                </div>
            </div>
        );
    }
    
    const CardReportTab: React.FC<{
        transactions: Transaction[];
        cards: Card[];
        profile: Profile;
    }> = ({ transactions, cards, profile }) => {
        const [filters, setFilters] = useState({ cardId: 'all', dateFrom: '', dateTo: '' });
    
        const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
            setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
        };
    
        const filteredTransactions = useMemo(() => {
            return transactions.filter(t => {
                const date = new Date(t.date);
                const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
                const to = filters.dateTo ? new Date(filters.dateTo) : null;
                if (from) from.setHours(0, 0, 0, 0);
                if (to) to.setHours(23, 59, 59, 999);
    
                const dateMatch = (!from || date >= from) && (!to || date <= to);
                const cardMatch = filters.cardId === 'all' || t.cardId === filters.cardId;
                
                return dateMatch && cardMatch;
            });
        }, [transactions, filters]);
    
        const reportStats = useMemo(() => {
            const income = filteredTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
            const expense = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
            return { income, expense, net: income - expense };
        }, [filteredTransactions]);
    
        const expenseDonutData = useMemo(() => {
            const expenseByCategory = filteredTransactions
                .filter(t => t.type === TransactionType.EXPENSE)
                .reduce((acc, t) => {
                    acc[t.category] = (acc[t.category] || 0) + t.amount;
                    return acc;
                }, {} as Record<string, number>);

            const colors = ['#f87171', '#fb923c', '#facc15', '#a3e635', '#34d399', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6'];
            const entries = Object.entries(expenseByCategory as Record<string, number>) as [string, number][];
            return entries
                .sort(([, a], [, b]) => b - a)
                .map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
        }, [filteredTransactions]);
    
        return (
            <div className="space-y-6 printable-area widget-animate">
                <div className="bg-brand-surface p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center non-printable border border-brand-border">
                    <h4 className="text-md font-semibold text-gradient whitespace-nowrap">Filter Laporan:</h4>
                    <select name="cardId" value={filters.cardId} onChange={handleFilterChange} className="input-field !rounded-lg !border p-2.5 w-full md:w-auto">
                        <option value="all">Semua Kartu/Akun</option>
                        {cards.map(c => <option key={c.id} value={c.id}>{c.bankName} {c.lastFourDigits !== 'CASH' ? `**** ${c.lastFourDigits}` : '(Tunai)'}</option>)}
                    </select>
                    <input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange} className="input-field !rounded-lg !border p-2.5 w-full md:w-auto"/>
                    <input type="date" name="dateTo" value={filters.dateTo} onChange={handleFilterChange} className="input-field !rounded-lg !border p-2.5 w-full md:w-auto"/>
                    <button onClick={() => window.print()} className="ml-auto button-primary inline-flex items-center gap-2"><PrinterIcon className="w-5 h-5"/>Cetak</button>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 StatCard-container">
                    <StatCard icon={<ArrowUpIcon className="w-6 h-6"/>} title="Total Pemasukan" value={formatCurrency(reportStats.income)} iconBgColor="bg-brand-success/20" iconColor="text-brand-success" />
                    <StatCard icon={<ArrowDownIcon className="w-6 h-6"/>} title="Total Pengeluaran" value={formatCurrency(reportStats.expense)} iconBgColor="bg-brand-danger/20" iconColor="text-brand-danger" />
                    <StatCard icon={<DollarSignIcon className="w-6 h-6"/>} title="Arus Kas Bersih" value={formatCurrency(reportStats.net)} />
                </div>
                 <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-2 bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border chart-wrapper">
                        <h3 className="text-lg font-bold text-gradient mb-4">Pengeluaran per Kategori</h3>
                        <DonutChart data={expenseDonutData}/>
                    </div>
                    <div className="lg:col-span-3 bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
                         <h3 className="text-lg font-bold text-gradient mb-4">Rincian Transaksi</h3>
                         <div className="overflow-x-auto max-h-[400px]"><TransactionTable transactions={filteredTransactions} /></div>
                    </div>
                </div>
            </div>
        );
    };

    const statModalTitles: { [key: string]: string } = {
        assets: 'Rincian Total Aset',
        pockets: 'Rincian Dana di Kantong',
        income: `Pemasukan Bulan ${new Date().toLocaleString('id-ID', { month: 'long' })}`,
        expense: `Pengeluaran Bulan ${new Date().toLocaleString('id-ID', { month: 'long' })}`
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Manajemen Keuangan" subtitle="Pantau kesehatan finansial bisnis Anda dari transaksi hingga proyeksi masa depan.">
                <div className="flex items-center gap-2 non-printable">
                     <button onClick={() => setIsAiModalOpen(true)} className="button-primary inline-flex items-center gap-2">
                        <SparkleIcon className="w-5 h-5"/> Analisis AI Keuangan Vena
                    </button>
                    <button onClick={() => handleOpenModal('transaction', 'add')} className="button-secondary inline-flex items-center gap-2">
                        <PlusIcon className="w-5 h-5"/>Tambah Transaksi
                    </button>
                </div>
            </PageHeader>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '100ms' }} onClick={() => setActiveStatModal('assets')}>
                    <StatCard icon={<CreditCardIcon className="w-6 h-6"/>} title="Total Aset" value={formatCurrency(summary.totalAssets)} subtitle="Total gabungan saldo di semua kartu & tunai Anda." />
                </div>
                <div className="widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '200ms' }} onClick={() => setActiveStatModal('pockets')}>
                    <StatCard icon={<ClipboardListIcon className="w-6 h-6"/>} title="Dana di Kantong" value={formatCurrency(summary.pocketsTotal)} subtitle="Total dana yang dialokasikan di semua kantong." />
                </div>
                <div className="widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '300ms' }} onClick={() => setActiveStatModal('income')}>
                    <StatCard icon={<ArrowUpIcon className="w-6 h-6"/>} title="Pemasukan Bulan Ini" value={formatCurrency(summary.totalIncomeThisMonth)} subtitle="Total pemasukan yang tercatat bulan ini." />
                </div>
                <div className="widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '400ms' }} onClick={() => setActiveStatModal('expense')}>
                    <StatCard icon={<ArrowDownIcon className="w-6 h-6"/>} title="Pengeluaran Bulan Ini" value={formatCurrency(summary.totalExpenseThisMonth)} subtitle="Total pengeluaran yang tercatat bulan ini." />
                </div>
            </div>
            <div className="border-b border-brand-border non-printable widget-animate" style={{ animationDelay: '500ms' }}><nav className="-mb-px flex space-x-6 overflow-x-auto"><button onClick={() => setActiveTab('transactions')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab==='transactions'?'border-brand-accent text-brand-accent':'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><FileTextIcon className="w-5 h-5"/>Transaksi</button><button onClick={() => setActiveTab('pockets')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab==='pockets'?'border-brand-accent text-brand-accent':'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><ClipboardListIcon className="w-5 h-5"/>Kantong</button><button onClick={() => setActiveTab('cards')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab==='cards'?'border-brand-accent text-brand-accent':'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><CreditCardIcon className="w-5 h-5"/>Kartu Saya</button><button onClick={() => setActiveTab('cashflow')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab==='cashflow'?'border-brand-accent text-brand-accent':'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><TrendingUpIcon className="w-5 h-5"/>Arus Kas</button><button onClick={() => setActiveTab('laporan')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab==='laporan'?'border-brand-accent text-brand-accent':'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><BarChart2Icon className="w-5 h-5"/>Laporan Umum</button><button onClick={() => setActiveTab('laporanKartu')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab==='laporanKartu'?'border-brand-accent text-brand-accent':'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><CreditCardIcon className="w-5 h-5"/>Laporan Kartu</button><button onClick={() => setActiveTab('labaProyek')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab==='labaProyek'?'border-brand-accent text-brand-accent':'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><TargetIcon className="w-5 h-5"/>Laba Proyek</button><button onClick={() => setActiveTab('laporanAI')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab==='laporanAI'?'border-brand-accent text-brand-accent':'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><SparkleIcon className="w-5 h-5"/>Laporan AI</button></nav></div>
            <div className="widget-animate" style={{ animationDelay: '600ms' }}>{renderTabContent()}</div>

            <Modal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} title="Panduan Halaman Keuangan">
                <div className="space-y-4 text-sm text-brand-text-primary">
                    <p>Halaman ini adalah pusat komando finansial bisnis Anda. Gunakan berbagai tab untuk mendapatkan gambaran lengkap.</p>
                    <ul className="list-disc list-inside space-y-2">
                        <li><strong>Transaksi:</strong> Catat semua pemasukan dan pengeluaran. Gunakan filter di sisi kiri untuk menganalisis berdasarkan kategori.</li>
                        <li><strong>Kantong:</strong> Buat "kantong" virtual untuk mengalokasikan dana, seperti tabungan alat atau anggaran operasional bulanan.</li>
                        <li><strong>Kartu Saya:</strong> Daftarkan semua akun bank, kartu kredit, dan kas tunai Anda untuk melacak saldo secara akurat.</li>
                        <li><strong>Arus Kas:</strong> Lihat grafik interaktif yang menunjukkan tren pemasukan, pengeluaran, dan saldo akhir Anda dari waktu ke waktu.</li>
                        <li><strong>Laporan:</strong> Hasilkan laporan keuangan profesional. Anda bisa memfilter berdasarkan klien dan rentang tanggal, lalu mencetaknya sebagai PDF.</li>
                    </ul>
                </div>
            </Modal>

            {modalState.type && <Modal
                isOpen={!!modalState.type}
                onClose={handleCloseModal}
                title={`${modalState.mode === 'add' ? 'Tambah' : 'Edit'} ${
                    modalState.type === 'transaction' ? 'Transaksi' :
                    modalState.type === 'pocket' ? 'Kantong' :
                    modalState.type === 'card' ? 'Kartu/Akun' :
                    modalState.type === 'topup-cash' ? 'Top-up Tunai' :
                    (modalState.type === 'transfer' && form.type === 'withdraw') ? `Tarik Dana dari "${modalState.data?.name}"` :
                    (modalState.type === 'transfer' && form.type === 'deposit') ? `Setor Dana ke "${modalState.data?.name}"` :
                    'Transfer'
                }`}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {modalState.type === 'transaction' && <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="input-group"><select id="type" name="type" value={form.type} onChange={handleFormChange} className="input-field"><option value={TransactionType.EXPENSE}>Pengeluaran</option><option value={TransactionType.INCOME}>Pemasukan</option></select><label htmlFor="type" className="input-label">Jenis</label></div>
                            <div className="input-group"><input type="date" id="date" name="date" value={form.date} onChange={handleFormChange} className="input-field" placeholder=" "/><label htmlFor="date" className="input-label">Tanggal</label></div>
                        </div>
                        <div className="input-group"><input type="text" id="description" name="description" value={form.description} onChange={handleFormChange} className="input-field" placeholder=" " required/><label htmlFor="description" className="input-label">Deskripsi</label></div>
                        <div className="input-group"><input type="number" id="amount" name="amount" value={form.amount} onChange={handleFormChange} className="input-field" placeholder=" " required/><label htmlFor="amount" className="input-label">Jumlah (IDR)</label></div>
                        <div className="input-group"><select id="category" name="category" value={form.category} onChange={handleFormChange} className="input-field" required><option value="">Pilih Kategori...</option>{(form.type === TransactionType.INCOME ? profile.incomeCategories : profile.expenseCategories).map(cat => (<option key={cat} value={cat}>{cat}</option>))}</select><label htmlFor="category" className="input-label">Kategori</label></div>
                        {form.type === TransactionType.INCOME ? (
                            <div className="input-group"><select id="cardId" name="cardId" value={form.cardId || ''} onChange={handleFormChange} className="input-field" required><option value="">Pilih Tujuan...</option>{cards.map(c => (<option key={c.id} value={c.id}>{c.cardHolderName} {c.cardType !== CardType.TUNAI ? `(${c.bankName} **** ${c.lastFourDigits})` : '(Tunai)'} (Saldo: {formatCurrency(c.balance)})</option>))}</select><label htmlFor="cardId" className="input-label">Setor Ke</label></div>
                        ) : (
                             <div className="input-group"><select id="sourceId" name="sourceId" value={form.sourceId} onChange={handleFormChange} className="input-field" required><option value="">Pilih Sumber...</option>{cards.map(c => (<option key={c.id} value={`card-${c.id}`}>{c.cardHolderName} {c.cardType !== CardType.TUNAI ? `(${c.bankName} **** ${c.lastFourDigits})` : '(Tunai)'} (Saldo: {formatCurrency(c.balance)})</option>))}{(pockets.filter(p=>p.type === PocketType.EXPENSE).map(p => (<option key={p.id} value={`pocket-${p.id}`}>{p.name} (Sisa: {formatCurrency(p.amount)})</option>)))}</select><label htmlFor="sourceId" className="input-label">Sumber Dana</label></div>
                        )}
                    </>}
                    {modalState.type === 'card' && <>
                        <div className="input-group"><select id="cardType" name="cardType" value={form.cardType} onChange={handleFormChange} className="input-field">{Object.values(CardType).map(ct => <option key={ct} value={ct}>{ct}</option>)}</select><label htmlFor="cardType" className="input-label">Jenis Akun</label></div>
                        <div className="input-group"><input type="text" id="cardHolderName" name="cardHolderName" value={form.cardHolderName} onChange={handleFormChange} className="input-field" placeholder=" " required /><label htmlFor="cardHolderName" className="input-label">{form.cardType === CardType.TUNAI ? 'Nama Akun Kas' : 'Nama Pemegang Kartu'}</label></div>
                        {modalState.mode === 'add' && <div className="input-group"><input type="number" id="initialBalance" name="initialBalance" value={form.initialBalance} onChange={handleFormChange} className="input-field" placeholder=" "/><label htmlFor="initialBalance" className="input-label">Saldo Awal (Opsional)</label></div>}
                        
                        {form.cardType !== CardType.TUNAI ? (
                            <>
                                <div className="input-group"><input type="text" id="bankName" name="bankName" value={form.bankName} onChange={handleFormChange} className="input-field" placeholder=" " required /><label htmlFor="bankName" className="input-label">Nama Bank</label></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="input-group"><input type="text" id="lastFourDigits" name="lastFourDigits" value={form.lastFourDigits} onChange={handleFormChange} className="input-field" placeholder=" " maxLength={4} required/><label htmlFor="lastFourDigits" className="input-label">4 Digit Terakhir</label></div>
                                    <div className="input-group"><input type="text" id="expiryDate" name="expiryDate" value={form.expiryDate} onChange={handleFormChange} className="input-field" placeholder="MM/YY"/><label htmlFor="expiryDate" className="input-label">Kadaluwarsa</label></div>
                                </div>
                            </>
                        ) : ( <div className="p-3 bg-brand-bg rounded-lg text-sm text-brand-text-secondary">Anda sedang membuat akun kas tunai. Detail lainnya akan diisi secara otomatis.</div> )}
                        
                        {modalState.mode === 'edit' && (
                             <div className="p-4 bg-brand-bg rounded-lg mt-6">
                                <h4 className="font-semibold text-gradient mb-2">Penyesuaian Saldo (Opsional)</h4>
                                <p className="text-xs text-brand-text-secondary mb-3">Isi untuk menambah atau mengurangi saldo. Gunakan angka negatif untuk mengurangi (misal: -50000).</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="input-group !mt-0"><input type="number" id="adjustmentAmount" name="adjustmentAmount" value={form.adjustmentAmount} onChange={handleFormChange} className="input-field" placeholder=" "/><label htmlFor="adjustmentAmount" className="input-label">Jumlah Penyesuaian</label></div>
                                    <div className="input-group !mt-0"><input type="text" id="adjustmentReason" name="adjustmentReason" value={form.adjustmentReason} onChange={handleFormChange} className="input-field" placeholder=" "/><label htmlFor="adjustmentReason" className="input-label">Alasan (e.g., Koreksi)</label></div>
                                </div>
                            </div>
                        )}
                    </>}
                    {modalState.type === 'pocket' && <>
                        <div className="input-group"><input type="text" id="name" name="name" value={form.name} onChange={handleFormChange} className="input-field" placeholder=" " required /><label htmlFor="name" className="input-label">Nama Kantong</label></div>
                        <div className="input-group"><textarea id="description" name="description" value={form.description} onChange={handleFormChange} className="input-field" placeholder=" " rows={2}/><label htmlFor="description" className="input-label">Deskripsi</label></div>
                        <div className="input-group"><select id="sourceCardId" name="sourceCardId" value={form.sourceCardId} onChange={handleFormChange} className="input-field"><option value="">Pilih Kartu...</option>{cards.map(c => <option key={c.id} value={c.id}>{c.bankName} {c.cardType !== CardType.TUNAI && `**** ${c.lastFourDigits}`}</option>)}</select><label htmlFor="sourceCardId" className="input-label">Sumber Dana (Kartu)</label></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="input-group"><select id="icon" name="icon" value={form.icon} onChange={handleFormChange} className="input-field">{Object.keys(pocketIcons).map(i => <option key={i} value={i}>{i}</option>)}</select><label htmlFor="icon" className="input-label">Ikon</label></div>
                            <div className="input-group">
                                <select name="type" id="type" value={form.type} onChange={handleFormChange} className="input-field">
                                    {Object.values(PocketType).map(pt => <option key={pt} value={pt}>{pt}</option>)}
                                </select>
                                <label htmlFor="type" className="input-label">Tipe Kantong</label>
                            </div>
                        </div>
                        {(form.type === PocketType.SAVING || form.type === PocketType.EXPENSE) &&
                            <div className="input-group">
                                <input type="number" id="goalAmount" name="goalAmount" value={form.goalAmount || ''} onChange={handleFormChange} className="input-field" placeholder=" "/>
                                <label htmlFor="goalAmount" className="input-label">Target Jumlah (Opsional)</label>
                            </div>
                        }
                        {form.type === PocketType.LOCKED &&
                            <div className="input-group">
                                <input type="date" id="lockEndDate" name="lockEndDate" value={form.lockEndDate || ''} onChange={handleFormChange} className="input-field" placeholder=" "/>
                                <label htmlFor="lockEndDate" className="input-label">Tgl. Kunci Berakhir (Opsional)</label>
                            </div>
                        }
                    </>}
                    {modalState.type === 'transfer' && <>
                        <div className="input-group">
                            <select id="fromCardId" name="fromCardId" value={form.fromCardId} onChange={handleFormChange} className="input-field" required>
                                <option value="">Pilih Kartu Sumber...</option>
                                {cards.filter(c => c.cardType !== CardType.TUNAI).map(c => <option key={c.id} value={c.id}>{c.bankName} **** {c.lastFourDigits} (Saldo: {formatCurrency(c.balance)})</option>)}
                            </select>
                            <label htmlFor="fromCardId" className="input-label">Sumber Dana</label>
                        </div>
                        <div className="input-group">
                            <input type="number" id="amount" name="amount" value={form.amount} onChange={handleFormChange} className="input-field" placeholder=" " required />
                            <label htmlFor="amount" className="input-label">Jumlah (IDR)</label>
                        </div>
                    </>}
                    {modalState.type === 'topup-cash' && <>
                        <div className="input-group">
                            <select id="fromCardId" name="fromCardId" value={form.fromCardId} onChange={handleFormChange} className="input-field" required>
                                <option value="">Pilih Kartu Sumber...</option>
                                {cards.filter(c => c.cardType !== CardType.TUNAI).map(c => <option key={c.id} value={c.id}>{c.bankName} **** {c.lastFourDigits} (Saldo: {formatCurrency(c.balance)})</option>)}
                            </select>
                            <label htmlFor="fromCardId" className="input-label">Ambil dari Kartu</label>
                        </div>
                        <div className="input-group">
                            <input type="number" id="amount" name="amount" value={form.amount} onChange={handleFormChange} className="input-field" placeholder=" " required />
                            <label htmlFor="amount" className="input-label">Jumlah (IDR)</label>
                        </div>
                    </>}
                    <div className="flex justify-end gap-3 pt-6 border-t border-brand-border">
                        <button type="button" onClick={handleCloseModal} className="button-secondary">Batal</button>
                        <button type="submit" className="button-primary">{modalState.mode === 'add' ? 'Simpan' : 'Update'}</button>
                    </div>
                </form>
            </Modal>}
            {historyModalState && <Modal
                isOpen={!!historyModalState}
                onClose={() => setHistoryModalState(null)}
                title={`Riwayat: ${historyModalState.type === 'card' ? (historyModalState.item as Card).cardHolderName : (historyModalState.item as FinancialPocket).name}`}
                size="3xl"
            >
                <div>
                    <div className="overflow-y-auto max-h-[60vh]">
                        {historyModalState.type === 'reward_pool' ? (
                             <table className="w-full text-sm">
                                <thead className="text-xs text-brand-text-secondary uppercase">
                                    <tr>
                                        <th className="p-3 text-left">Tanggal</th>
                                        <th className="p-3 text-left">Freelancer</th>
                                        <th className="p-3 text-left">Deskripsi</th>
                                        <th className="p-3 text-right">Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-border">
                                    {rewardLedgerEntries.map(t => (
                                    <tr key={t.id} className="hover:bg-brand-bg">
                                        <td className="p-3">{new Date(t.date).toLocaleDateString('id-ID')}</td>
                                        <td className="p-3 font-semibold text-brand-text-light">{teamMembers.find(tm => tm.id === t.teamMemberId)?.name || 'N/A'}</td>
                                        <td className="p-3">{t.description}</td>
                                        <td className={`p-3 text-right font-semibold ${t.amount >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>
                                            {t.amount >= 0 ? '+' : ''}{formatCurrency(t.amount)}
                                        </td>
                                    </tr>
                                    ))}
                                    {rewardLedgerEntries.length === 0 &&
                                        <tr><td colSpan={4} className="text-center p-8 text-brand-text-secondary">Tidak ada riwayat hadiah.</td></tr>
                                    }
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="text-xs text-brand-text-secondary uppercase">
                                    <tr>
                                        <th className="p-3 text-left">Tanggal</th>
                                        <th className="p-3 text-left">Deskripsi</th>
                                        <th className="p-3 text-left">Sumber/Tujuan</th>
                                        <th className="p-3 text-right">Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-border">
                                    {transactions
                                        .filter(t => (historyModalState.type === 'card' && t.cardId === historyModalState.item?.id) || (historyModalState.type === 'pocket' && t.pocketId === historyModalState.item?.id))
                                        .map(t => {
                                            const card = cards.find(c => c.id === t.cardId);
                                            let sourceDestText = '';
                                            if (t.category.includes('Transfer') || t.category.includes('Penutupan')) {
                                                if (t.description.includes('Setor ke')) {
                                                    sourceDestText = `Dari: ${card?.bankName || 'N/A'}`;
                                                } else if (t.description.includes('Tarik dari')) {
                                                    sourceDestText = `Ke: ${card?.bankName || 'N/A'}`;
                                                } else {
                                                    sourceDestText = 'Sistem Internal';
                                                }
                                            } else if (t.type === TransactionType.INCOME) {
                                                sourceDestText = `Ke: ${card?.bankName || 'N/A'}`;
                                            } else if (t.type === TransactionType.EXPENSE) {
                                                sourceDestText = `Dari: ${card?.bankName || 'N/A'}`;
                                            }
                                            return (
                                                <tr key={t.id} className="hover:bg-brand-bg">
                                                    <td className="p-3">{new Date(t.date).toLocaleDateString('id-ID')}</td>
                                                    <td className="p-3 font-semibold text-brand-text-light">{t.description}</td>
                                                    <td className="p-3 text-brand-text-secondary">{sourceDestText}</td>
                                                    <td className={`p-3 text-right font-semibold ${t.type === TransactionType.INCOME ? 'text-brand-success' : 'text-brand-danger'}`}>
                                                        {t.type === TransactionType.EXPENSE ? '-' : ''}{formatCurrency(t.amount)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    {transactions.filter(t => (historyModalState.type === 'card' && t.cardId === historyModalState.item?.id) || (historyModalState.type === 'pocket' && t.pocketId === historyModalState.item?.id)).length === 0 &&
                                        <tr><td colSpan={4} className="text-center p-8 text-brand-text-secondary">Tidak ada riwayat transaksi.</td></tr>
                                    }
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </Modal>}
            <Modal isOpen={!!activeStatModal} onClose={() => setActiveStatModal(null)} title={activeStatModal ? statModalTitles[activeStatModal] : ''} size="2xl">
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    {activeStatModal === 'assets' && (
                        <div className="space-y-3">
                            {cards.map(card => (
                                <div key={card.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                                    <p className="font-semibold text-brand-text-light">{card.cardHolderName} {card.cardType !== CardType.TUNAI ? `(${card.bankName} **** ${card.lastFourDigits})` : '(Tunai)'}</p>
                                    <p className="font-semibold text-brand-text-light">{formatCurrency(card.balance)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {activeStatModal === 'pockets' && (
                        <div className="space-y-3">
                            {pockets.map(pocket => (
                                <div key={pocket.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                                    <p className="font-semibold text-brand-text-light">{pocket.name}</p>
                                    <p className="font-semibold text-brand-text-light">{formatCurrency(pocket.amount)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {activeStatModal === 'income' && (
                         <div className="space-y-3">
                            {thisMonthIncome.length > 0 ? thisMonthIncome.map(tx => (
                                <div key={tx.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-brand-text-light">{tx.description}</p>
                                        <p className="text-xs text-brand-text-secondary">{new Date(tx.date).toLocaleDateString('id-ID')}</p>
                                    </div>
                                    <p className="font-semibold text-brand-success">{formatCurrency(tx.amount)}</p>
                                </div>
                            )) : <p className="text-center text-brand-text-secondary py-8">Tidak ada pemasukan bulan ini.</p>}
                        </div>
                    )}
                    {activeStatModal === 'expense' && (
                        <div className="space-y-3">
                           {thisMonthExpense.length > 0 ? thisMonthExpense.map(tx => (
                                <div key={tx.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-brand-text-light">{tx.description}</p>
                                        <p className="text-xs text-brand-text-secondary">{new Date(tx.date).toLocaleDateString('id-ID')}</p>
                                    </div>
                                    <p className="font-semibold text-brand-danger">{formatCurrency(tx.amount)}</p>
                                </div>
                            )) : <p className="text-center text-brand-text-secondary py-8">Tidak ada pengeluaran bulan ini.</p>}
                        </div>
                    )}
                </div>
            </Modal>
             <Modal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} title="Asisten AI Keuangan Vena" size="5xl">
                <AIFinanceInsight 
                    transactions={transactions} 
                    projects={projects}
                    cards={cards}
                    pockets={pockets}
                    teamMembers={teamMembers}
                    rewardLedgerEntries={rewardLedgerEntries}
                />
            </Modal>
        </div>
    );
};

export default Finance;
