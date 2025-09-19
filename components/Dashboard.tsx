

import React, { useMemo, useState } from 'react';
import { Project, Client, Transaction, TransactionType, ViewType, TeamMember, Card, FinancialPocket, PocketType, Lead, LeadStatus, TeamProjectPayment, Package, Asset, AssetStatus, ClientFeedback, Contract, ClientStatus, NavigationAction, User, ProjectStatusConfig } from '../types';
import StatCard from './StatCard';
import Modal from './Modal';
import { NAV_ITEMS, DollarSignIcon, FolderKanbanIcon, UsersIcon, BriefcaseIcon, ChevronRightIcon, CreditCardIcon, CalendarIcon, ClipboardListIcon, LightbulbIcon, TargetIcon, StarIcon, CameraIcon, FileTextIcon } from '../constants';
import AIInsightWidget from './AIInsightWidget';

// Helper Functions
const formatCurrency = (amount: number, minimumFractionDigits = 0) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits }).format(amount);
};

const getStatusClass = (status: string, config: ProjectStatusConfig[]) => {
    const statusConfig = config.find(c => c.name === status);
    const color = statusConfig ? statusConfig.color : '#64748b'; // slate-500
    // Note: Tailwind purge might not see this. Inline styles are safer for dynamic colors.
    // This is a simplified approach.
    const colorMap: { [key: string]: string } = {
        '#10b981': 'bg-brand-success/20 text-brand-success',
        '#3b82f6': 'bg-blue-500/20 text-blue-400',
        '#8b5cf6': 'bg-purple-500/20 text-purple-400',
        '#f97316': 'bg-orange-500/20 text-orange-400',
        '#06b6d4': 'bg-teal-500/20 text-teal-400',
        '#eab308': 'bg-yellow-500/20 text-yellow-400',
        '#6366f1': 'bg-gray-500/20 text-gray-300',
        '#ef4444': 'bg-brand-danger/20 text-brand-danger'
    };
    return colorMap[color] || 'bg-gray-500/20 text-gray-400';
};


// --- Sub-components for Dashboard ---

const QuickLinksWidget: React.FC<{ handleNavigation: (view: ViewType) => void; currentUser: User | null; }> = ({ handleNavigation, currentUser }) => {
    const quickLinks = useMemo(() => {
        const allLinks = NAV_ITEMS.filter(item => item.view !== ViewType.DASHBOARD);
        if (!currentUser || currentUser.role === 'Admin') {
            return allLinks;
        }
        const memberPermissions = new Set(currentUser.permissions || []);
        return allLinks.filter(link => memberPermissions.has(link.view));
    }, [currentUser]);


    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
            <h3 className="font-bold text-lg text-gradient mb-4">Akses Cepat</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-4">
                {quickLinks.map(link => (
                    <button 
                        key={link.view} 
                        onClick={() => handleNavigation(link.view)} 
                        className="flex flex-col items-center justify-center p-4 bg-brand-bg rounded-xl text-center hover:bg-brand-input hover:shadow-md transition-all duration-200"
                        aria-label={`Buka ${link.label}`}
                    >
                        <link.icon className="w-8 h-8 text-brand-accent mb-2" />
                        <span className="text-xs font-semibold text-brand-text-primary">{link.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const IncomeChartWidget: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
    const [chartView, setChartView] = useState<'monthly' | 'yearly'>('monthly');

    const chartData = useMemo(() => {
        if (chartView === 'yearly') {
            const incomeByYear: { [year: string]: number } = {};
            transactions.forEach(t => {
                if (t.type === TransactionType.INCOME) {
                    const year = new Date(t.date).getFullYear().toString();
                    if (!incomeByYear[year]) {
                        incomeByYear[year] = 0;
                    }
                    incomeByYear[year] += t.amount;
                }
            });
            return Object.entries(incomeByYear)
                .sort(([yearA], [yearB]) => parseInt(yearA) - parseInt(yearB))
                .map(([year, income]) => ({ name: year, value: income }));
        } else { // monthly
            const currentYear = new Date().getFullYear();
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const data = months.map(month => ({ name: month, value: 0 }));

            transactions.forEach(t => {
                const transactionDate = new Date(t.date);
                if (t.type === TransactionType.INCOME && transactionDate.getFullYear() === currentYear) {
                    const monthIndex = transactionDate.getMonth();
                    data[monthIndex].value += t.amount;
                }
            });
            return data;
        }
    }, [transactions, chartView]);

    const maxIncome = Math.max(...chartData.map(d => d.value), 1);
    const currentLabel = chartView === 'monthly' 
        ? new Date().toLocaleString('default', { month: 'short' })
        : new Date().getFullYear().toString();

    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg h-full border border-brand-border">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-gradient">Grafik Pemasukan</h3>
                <div className="p-1 bg-brand-bg rounded-lg flex items-center h-fit">
                    <button 
                        onClick={() => setChartView('monthly')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${chartView === 'monthly' ? 'bg-brand-surface shadow-sm text-brand-text-light' : 'text-brand-text-secondary'}`}
                    >
                        Bulanan
                    </button>
                    <button 
                        onClick={() => setChartView('yearly')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${chartView === 'yearly' ? 'bg-brand-surface shadow-sm text-brand-text-light' : 'text-brand-text-secondary'}`}
                    >
                        Tahunan
                    </button>
                </div>
            </div>
            <div className="h-48 flex justify-between items-end gap-2">
                {chartData.length > 0 && chartData.some(d => d.value > 0) ? chartData.map(item => {
                    const height = Math.max((item.value / maxIncome) * 100, 2);
                    const isCurrent = item.name === currentLabel;
                    return (
                        <div key={item.name} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                             <div className="absolute -top-8 text-xs bg-brand-accent text-white font-bold py-1 px-2 rounded-md mb-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{formatCurrency(item.value, 0)}</div>
                            <div
                                className={`${isCurrent ? 'bg-brand-accent' : 'bg-brand-text-primary/20'} w-full rounded-md transition-colors hover:bg-brand-accent/80`}
                                style={{ height: `${height}%` }}
                            ></div>
                            <span className="text-xs text-brand-text-secondary mt-2">{item.name}</span>
                        </div>
                    );
                }) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <p className="text-brand-text-secondary">Tidak ada data pemasukan untuk periode ini.</p>
                    </div>
                )}
            </div>
        </div>
    );
};


const RecentTransactionsWidget: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => (
    <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-gradient">Transaksi Terbaru</h3>
            <button className="text-brand-text-secondary hover:text-brand-text-light"><ChevronRightIcon className="w-6 h-6" /></button>
        </div>
        <div className="space-y-4">
            {transactions.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-bg flex-shrink-0 flex items-center justify-center">
                      <DollarSignIcon className={`w-5 h-5 ${t.type === TransactionType.INCOME ? 'text-brand-success' : 'text-brand-danger'}`} />
                    </div>
                    <div className="flex-grow overflow-hidden">
                        <p className="font-medium text-brand-text-light truncate text-sm">{t.description}</p>
                        <p className="text-xs text-brand-text-secondary">{new Date(t.date).toLocaleDateString('en-US', {day: 'numeric', month: 'long'})}</p>
                    </div>
                    <div className={`font-semibold text-sm ${t.type === TransactionType.INCOME ? 'text-brand-success' : 'text-brand-text-light'}`}>
                        {t.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(t.amount, 0)}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const CardWidget: React.FC<{ card: Card }> = ({ card }) => {
    const gradient = card.colorGradient || 'from-slate-700 to-slate-900';
    const isLight = gradient.includes('slate-100') || gradient.includes('slate-200') || gradient.includes('white');
    const textColor = isLight ? 'text-slate-800' : 'text-white';
    
    return (
        <div className={`p-4 rounded-xl ${textColor} shadow-md flex flex-col justify-between h-40 flex-1 min-w-64 bg-gradient-to-br ${gradient}`}>
             <div>
                <div className="flex justify-between items-center">
                    <p className="font-bold text-sm">{card.bankName}</p>
                    <p className="text-xs">{card.cardType}</p>
                </div>
            </div>
            <div>
                <p className="text-xl font-mono tracking-wider">**** {card.lastFourDigits}</p>
                <p className="text-2xl font-bold tracking-tight">{formatCurrency(card.balance)}</p>
            </div>
        </div>
    );
};

const MyCardsWidget: React.FC<{ cards: Card[], handleNavigation: (view: ViewType) => void }> = ({ cards, handleNavigation }) => (
    <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-gradient flex items-center gap-2"><CreditCardIcon className="w-5 h-5"/> Kartu Saya</h3>
            <button onClick={() => handleNavigation(ViewType.FINANCE)} className="text-sm font-semibold text-brand-accent hover:underline">Kelola Kartu &rarr;</button>
        </div>
        <div className="flex flex-wrap gap-4">
            {cards.map(card => <CardWidget key={card.id} card={card} />)}
        </div>
    </div>
);

const UpcomingCalendarWidget: React.FC<{ projects: Project[], handleNavigation: (view: ViewType, action?: NavigationAction) => void }> = ({ projects, handleNavigation }) => {
    const upcoming = projects
        .filter(p => new Date(p.date) >= new Date())
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);
    
    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gradient flex items-center gap-2"><CalendarIcon className="w-5 h-5"/>Kalender Mendatang</h3>
                <button onClick={() => handleNavigation(ViewType.CALENDAR)} className="text-sm font-semibold text-brand-accent hover:underline">Lihat Semua &rarr;</button>
            </div>
            <div className="space-y-3">
                 {upcoming.map(p => (
                     <div key={p.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-brand-bg cursor-pointer" onClick={() => handleNavigation(ViewType.PROJECTS, { type: 'VIEW_PROJECT_DETAILS', id: p.id })}>
                        <div className="w-11 h-11 rounded-lg bg-brand-bg flex-shrink-0 flex flex-col items-center justify-center">
                            <p className="text-xs font-bold text-brand-text-secondary -mb-1">{new Date(p.date).toLocaleString('default', { month: 'short' })}</p>
                            <p className="text-xl font-extrabold text-brand-text-light">{new Date(p.date).getDate()}</p>
                        </div>
                        <div className="flex-grow overflow-hidden">
                            <p className="font-medium text-brand-text-light truncate text-sm">{p.projectName}</p>
                            <p className="text-xs text-brand-text-secondary">{p.projectType}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                             <p className="text-xs text-brand-text-secondary">{p.location}</p>
                             <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 mt-1 inline-block">{p.status}</span>
                        </div>
                    </div>
                ))}
                {upcoming.length === 0 && <p className="text-center text-sm text-brand-text-secondary py-8">Tidak ada acara mendatang.</p>}
            </div>
        </div>
    )
}

const ProjectStatusWidget: React.FC<{ projects: Project[], projectStatusConfig: ProjectStatusConfig[], handleNavigation: (view: ViewType) => void }> = ({ projects, projectStatusConfig, handleNavigation }) => {
    const statusOrder = projectStatusConfig.map(s => s.name).filter(name => name !== 'Selesai' && name !== 'Dibatalkan');

    const statusCounts = useMemo(() => {
        return statusOrder.map(statusName => {
            const count = projects.filter(p => p.status === statusName).length;
            const config = projectStatusConfig.find(s => s.name === statusName);
            return {
                name: statusName,
                count: count,
                color: config ? config.color : '#64748b'
            };
        }).filter(s => s.count > 0);

    }, [projects, statusOrder, projectStatusConfig]);
    
    const total = statusCounts.reduce((sum, item) => sum + item.count, 0);

    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full flex flex-col">
            <h3 className="font-bold text-lg text-gradient mb-4">Status Proyek Aktif</h3>
            <div className="space-y-3 flex-grow">
                {statusCounts.map(status => (
                    <div key={status.name} className="text-sm">
                        <div className="flex justify-between mb-1">
                            <span className="text-brand-text-primary font-medium">{status.name}</span>
                            <span className="text-brand-text-secondary font-semibold">{status.count}</span>
                        </div>
                        <div className="w-full bg-brand-bg rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${total > 0 ? (status.count / total) * 100 : 0}%`, backgroundColor: status.color }}></div></div>
                    </div>
                ))}
            </div>
            <button onClick={() => handleNavigation(ViewType.PROJECTS)} className="mt-4 text-sm font-semibold text-brand-accent hover:underline self-start">Kelola Proyek &rarr;</button>
        </div>
    );
};

const LeadsSummaryWidget: React.FC<{ leads: Lead[]; handleNavigation: (view: ViewType) => void }> = ({ leads, handleNavigation }) => {
    const newLeadsThisMonth = leads.filter(l => new Date(l.date).getMonth() === new Date().getMonth() && new Date(l.date).getFullYear() === new Date().getFullYear()).length;
    const convertedLeads = leads.filter(l => l.status === LeadStatus.CONVERTED).length;
    const conversionRate = leads.length > 0 ? (convertedLeads / leads.length) * 100 : 0;
    
    const SmallStat: React.FC<{icon: React.ReactNode; title: string; value: string;}> = ({icon, title, value}) => (
        <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-brand-bg flex items-center justify-center text-brand-accent">{icon}</div><div><p className="text-sm text-brand-text-secondary">{title}</p><p className="font-bold text-lg text-brand-text-light">{value}</p></div></div>
    );

    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full flex flex-col justify-between">
            <h3 className="font-bold text-lg text-gradient mb-4">Ringkasan Prospek</h3>
            <div className="space-y-4 flex-grow">
                <SmallStat icon={<LightbulbIcon className="w-5 h-5"/>} title="Prospek Baru Bulan Ini" value={newLeadsThisMonth.toString()} />
                <SmallStat icon={<TargetIcon className="w-5 h-5"/>} title="Tingkat Konversi" value={`${conversionRate.toFixed(1)}%`} />
            </div>
            <button onClick={() => handleNavigation(ViewType.PROSPEK)} className="mt-4 text-sm font-semibold text-brand-accent hover:underline self-start">Kelola Prospek &rarr;</button>
        </div>
    );
};

const ClientSatisfactionWidget: React.FC<{ feedback: ClientFeedback[]; handleNavigation: (view: ViewType) => void }> = ({ feedback, handleNavigation }) => {
    const totalFeedback = feedback.length;
    const avgRating = totalFeedback > 0 ? feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback : 0;
    const StarRatingDisplay = ({ rating }: { rating: number }) => (<div className="flex items-center">{[1, 2, 3, 4, 5].map(star => (<StarIcon key={star} className={`w-5 h-5 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} />))}</div>);

    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full flex flex-col justify-between">
            <div><h3 className="font-bold text-lg text-gradient mb-2">Kepuasan Klien</h3><div className="flex items-baseline gap-2"><p className="text-3xl font-bold text-brand-text-light">{avgRating.toFixed(1)}</p><p className="text-brand-text-secondary">/ 5.0</p></div><div className="my-3"><StarRatingDisplay rating={avgRating} /></div><p className="text-sm text-brand-text-secondary">Berdasarkan {totalFeedback} ulasan.</p></div>
            <button onClick={() => handleNavigation(ViewType.CLIENT_REPORTS)} className="mt-4 text-sm font-semibold text-brand-accent hover:underline self-start">Lihat Laporan &rarr;</button>
        </div>
    );
};

const AssetSummaryWidget: React.FC<{ assets: Asset[]; handleNavigation: (view: ViewType) => void }> = ({ assets, handleNavigation }) => {
    const totalValue = assets.reduce((sum, a) => sum + a.purchasePrice, 0);
    const inMaintenance = assets.filter(a => a.status === AssetStatus.MAINTENANCE).length;
    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full flex flex-col justify-between">
            <div><h3 className="font-bold text-lg text-gradient mb-4">Ringkasan Aset</h3><p className="text-sm text-brand-text-secondary">Total Nilai Aset</p><p className="font-bold text-xl text-brand-text-light mb-3">{formatCurrency(totalValue)}</p><p className="text-sm text-brand-text-secondary">Dalam Perbaikan</p><p className="font-bold text-xl text-brand-text-light">{inMaintenance} item</p></div>
            <button onClick={() => handleNavigation(ViewType.ASSETS)} className="mt-4 text-sm font-semibold text-brand-accent hover:underline self-start">Kelola Aset &rarr;</button>
        </div>
    );
};


// --- Main Dashboard Component ---

interface DashboardProps {
  projects: Project[];
  clients: Client[];
  transactions: Transaction[];
  teamMembers: TeamMember[];
  cards: Card[];
  pockets: FinancialPocket[];
  handleNavigation: (view: ViewType, action?: NavigationAction) => void;
  leads: Lead[];
  teamProjectPayments: TeamProjectPayment[];
  packages: Package[];
  assets: Asset[];
  clientFeedback: ClientFeedback[];
  contracts: Contract[];
  currentUser: User | null;
  projectStatusConfig: ProjectStatusConfig[];
}

const Dashboard: React.FC<DashboardProps> = ({ projects, clients, transactions, teamMembers, cards, pockets, handleNavigation, leads, teamProjectPayments, packages, assets, clientFeedback, contracts, currentUser, projectStatusConfig }) => {
  const [activeModal, setActiveModal] = useState<'balance' | 'projects' | 'clients' | 'freelancers' | 'payments' | 'contracts' | null>(null);
  
  const getSubStatusDisplay = (project: Project) => {
    if (project.activeSubStatuses?.length) {
        return `${project.status}: ${project.activeSubStatuses.join(', ')}`;
    }
    if (project.status === 'Dikirim' && project.shippingDetails) {
        return `Dikirim: ${project.shippingDetails}`;
    }
    return project.status;
  };

  const summary = useMemo(() => {
    return {
      totalBalance: cards.reduce((sum, c) => sum + c.balance, 0),
      activeProjects: projects.filter(p => p.status !== 'Selesai' && p.status !== 'Dibatalkan').length,
      activeClients: clients.filter(c => c.status === ClientStatus.ACTIVE).length,
      totalFreelancers: teamMembers.length,
    };
  }, [cards, projects, clients, teamMembers]);

  const activeProjects = useMemo(() => projects.filter(p => p.status !== 'Selesai' && p.status !== 'Dibatalkan'), [projects]);
  const activeClients = useMemo(() => clients.filter(c => c.status === ClientStatus.ACTIVE), [clients]);
  const unpaidTeamPayments = useMemo(() => teamProjectPayments.filter(p => p.status === 'Unpaid'), [teamProjectPayments]);
  
  const modalTitles: { [key: string]: string } = {
    balance: 'Rincian Saldo',
    projects: 'Daftar Proyek Aktif',
    clients: 'Daftar Klien Aktif',
    freelancers: 'Daftar Semua Freelancer',
    payments: 'Rincian Sisa Pembayaran Tim',
    contracts: 'Daftar Semua Kontrak'
  };
  
  return (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        <div className="col-span-1 xl:col-span-12 widget-animate" style={{ animationDelay: '0ms' }}>
            <AIInsightWidget 
                projects={projects}
                leads={leads}
                transactions={transactions}
                teamProjectPayments={teamProjectPayments}
                handleNavigation={handleNavigation}
            />
        </div>
        
        <div className="col-span-1 xl:col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '100ms' }} onClick={() => setActiveModal('balance')}><StatCard icon={<DollarSignIcon className="w-6 h-6" />} iconBgColor="bg-blue-500/20" iconColor="text-blue-400" title="Total Saldo" value={formatCurrency(summary.totalBalance)} /></div>
            <div className="widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '200ms' }} onClick={() => setActiveModal('projects')}><StatCard icon={<FolderKanbanIcon className="w-6 h-6" />} iconBgColor="bg-indigo-500/20" iconColor="text-indigo-400" title="Proyek Aktif" value={summary.activeProjects.toString()} /></div>
            <div className="widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '300ms' }} onClick={() => setActiveModal('clients')}><StatCard icon={<UsersIcon className="w-6 h-6" />} iconBgColor="bg-brand-success/20" iconColor="text-brand-success" title="Klien Aktif" value={summary.activeClients.toString()} /></div>
            <div className="widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '400ms' }} onClick={() => setActiveModal('freelancers')}><StatCard icon={<BriefcaseIcon className="w-6 h-6" />} iconBgColor="bg-orange-500/20" iconColor="text-orange-400" title="Total Freelancer" value={summary.totalFreelancers.toString()} /></div>
        </div>

        <div className="col-span-1 xl:col-span-8 widget-animate" style={{ animationDelay: '500ms' }}><IncomeChartWidget transactions={transactions} /></div>
        <div className="col-span-1 xl:col-span-4 widget-animate" style={{ animationDelay: '600ms' }}><UpcomingCalendarWidget projects={projects} handleNavigation={handleNavigation} /></div>

        <div className="col-span-1 xl:col-span-7 widget-animate" style={{ animationDelay: '700ms' }}><MyCardsWidget cards={cards} handleNavigation={handleNavigation} /></div>
        <div className="col-span-1 xl:col-span-5 widget-animate" style={{ animationDelay: '800ms' }}><RecentTransactionsWidget transactions={transactions} /></div>

        <div className="col-span-1 xl:col-span-4 widget-animate" style={{ animationDelay: '900ms' }}><ProjectStatusWidget projects={projects} projectStatusConfig={projectStatusConfig} handleNavigation={handleNavigation} /></div>
        <div className="col-span-1 xl:col-span-4 widget-animate" style={{ animationDelay: '1000ms' }}><LeadsSummaryWidget leads={leads} handleNavigation={handleNavigation}/></div>
        <div className="col-span-1 xl:col-span-4 widget-animate" style={{ animationDelay: '1100ms' }}><ClientSatisfactionWidget feedback={clientFeedback} handleNavigation={handleNavigation} /></div>
        
        <div className="col-span-1 xl:col-span-3 widget-animate" style={{ animationDelay: '1200ms' }}><AssetSummaryWidget assets={assets} handleNavigation={handleNavigation}/></div>
        <div className="col-span-1 xl:col-span-3 widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '1300ms' }} onClick={() => setActiveModal('payments')}>
            <StatCard icon={<BriefcaseIcon className="w-6 h-6" />} title="Sisa Pembayaran Tim" value={formatCurrency(teamProjectPayments.filter(p=>p.status === 'Unpaid').reduce((s,p)=>s+p.fee, 0))} iconBgColor="bg-brand-danger/20" iconColor="text-brand-danger" />
        </div>
        <div className="col-span-1 xl:col-span-3 widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '1400ms' }} onClick={() => setActiveModal('contracts')}>
             <StatCard icon={<FileTextIcon className="w-6 h-6" />} title="Total Kontrak" value={contracts.length.toString()} iconBgColor="bg-slate-500/20" iconColor="text-slate-400" />
        </div>
         <div className="col-span-1 xl:col-span-3 widget-animate" style={{ animationDelay: '1500ms' }}>
            <StatCard 
                icon={<CameraIcon className="w-6 h-6" />} 
                title="Paket Terpopuler" 
                value={
                    (() => {
                        const counts = projects.reduce((acc, p) => { acc[p.packageName] = (acc[p.packageName] || 0) + 1; return acc; }, {} as Record<string, number>);
                        return Object.keys(counts).sort((a,b) => counts[b] - counts[a])[0] || 'N/A';
                    })()
                } 
                iconBgColor="bg-rose-500/20" iconColor="text-rose-400" />
        </div>

        <div className="col-span-1 xl:col-span-12 widget-animate" style={{ animationDelay: '1600ms' }}><QuickLinksWidget handleNavigation={handleNavigation} currentUser={currentUser} /></div>

         <Modal isOpen={!!activeModal} onClose={() => setActiveModal(null)} title={activeModal ? modalTitles[activeModal] : ''} size="2xl">
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    {activeModal === 'balance' && (
                         <div className="space-y-4">
                            <h4 className="font-semibold text-gradient border-b border-brand-border pb-2">Kartu & Tunai</h4>
                            <div className="space-y-3">
                                {cards.map(card => (
                                    <div key={card.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                                        <p className="font-semibold text-brand-text-light">{card.bankName} {card.id !== 'CARD_CASH' ? `**** ${card.lastFourDigits}` : '(Tunai)'}</p>
                                        <p className="font-semibold text-brand-text-light">{formatCurrency(card.balance)}</p>
                                    </div>
                                ))}
                            </div>
                            <h4 className="font-semibold text-gradient border-b border-brand-border pb-2 mt-6">Kantong</h4>
                             <div className="space-y-3">
                                {pockets.map(pocket => (
                                    <div key={pocket.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                                        <p className="font-semibold text-brand-text-light">{pocket.name}</p>
                                        <p className="font-semibold text-brand-text-light">{formatCurrency(pocket.type === PocketType.REWARD_POOL ? teamMembers.reduce((s, m) => s + m.rewardBalance, 0) : pocket.amount)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeModal === 'projects' && (
                        <div className="space-y-3">
                            {activeProjects.length > 0 ? activeProjects.map(project => (
                                <div key={project.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-brand-text-light">{project.projectName}</p>
                                        <p className="text-sm text-brand-text-secondary">{project.clientName}</p>
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(project.status, projectStatusConfig)}`}>
                                        {getSubStatusDisplay(project)}
                                    </span>
                                </div>
                            )) : <p className="text-center text-brand-text-secondary py-8">Tidak ada proyek aktif.</p>}
                        </div>
                    )}
                    {activeModal === 'clients' && (
                        <div className="space-y-3">
                            {activeClients.map(client => (
                                <div key={client.id} className="p-3 bg-brand-bg rounded-lg">
                                    <p className="font-semibold text-brand-text-light">{client.name}</p>
                                    <p className="text-sm text-brand-text-secondary">{client.email}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {activeModal === 'freelancers' && (
                         <div className="space-y-3">
                            {teamMembers.map(member => (
                                <div key={member.id} className="p-3 bg-brand-bg rounded-lg">
                                    <p className="font-semibold text-brand-text-light">{member.name}</p>
                                    <p className="text-sm text-brand-text-secondary">{member.role}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {activeModal === 'payments' && (
                        <div className="space-y-3">
                            {unpaidTeamPayments.length > 0 ? unpaidTeamPayments.map(p => (
                                <div key={p.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-brand-text-light">{p.teamMemberName}</p>
                                        <p className="text-sm text-brand-text-secondary">Proyek: {projects.find(proj => proj.id === p.projectId)?.projectName || 'N/A'}</p>
                                    </div>
                                    <p className="font-semibold text-brand-danger">{formatCurrency(p.fee)}</p>
                                </div>
                            )) : <p className="text-center text-brand-text-secondary py-8">Tidak ada pembayaran yang tertunda.</p>}
                        </div>
                    )}
                    {activeModal === 'contracts' && (
                        <div className="space-y-3">
                            {contracts.length > 0 ? contracts.map(c => (
                                <div key={c.id} className="p-3 bg-brand-bg rounded-lg">
                                    <p className="font-semibold text-brand-text-light">{c.contractNumber}</p>
                                    <p className="text-sm text-brand-text-secondary">Klien: {clients.find(client => client.id === c.clientId)?.name || c.clientName1}</p>
                                </div>
                            )) : <p className="text-center text-brand-text-secondary py-8">Tidak ada kontrak.</p>}
                        </div>
                    )}
                </div>
            </Modal>
    </div>
  );
};

export default Dashboard;