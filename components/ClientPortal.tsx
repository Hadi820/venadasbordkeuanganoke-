import React, { useState, useMemo, useEffect } from 'react';
import { Client, Project, ClientFeedback, SatisfactionLevel, Contract, Transaction, Profile, Package, SubStatusConfig, Revision, RevisionStatus, TransactionType, ClientPortalProps } from '../types';
import { FolderKanbanIcon, ClockIcon, StarIcon, FileTextIcon, HomeIcon, CreditCardIcon, CheckCircleIcon, SendIcon, DownloadIcon, GalleryHorizontalIcon, MessageSquareIcon, PrinterIcon } from '../constants';
import Modal from './Modal';
import SignaturePad from './SignaturePad';
import { createClientFeedback } from '../services/clientFeedback';
import HelpBox from './HelpBox';

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

const getSatisfactionFromRating = (rating: number): SatisfactionLevel => {
    if (rating >= 5) return SatisfactionLevel.VERY_SATISFIED;
    if (rating >= 4) return SatisfactionLevel.SATISFIED;
    if (rating >= 3) return SatisfactionLevel.NEUTRAL;
    return SatisfactionLevel.UNSATISFIED;
};


const ClientPortal: React.FC<ClientPortalProps> = ({ accessId, clients, projects, contracts, transactions, setClientFeedback, showNotification, userProfile, packages, onClientConfirmation, onClientSubStatusConfirmation, onSignContract }) => {
    const profile = userProfile;
    const client = useMemo(() => clients.find(c => c.portalAccessId === accessId), [clients, accessId]);
    const isVendorClient = client?.clientType === 'Vendor';

    const [activeTab, setActiveTab] = useState(isVendorClient ? 'proyek' : 'beranda');
    const clientProjects = useMemo(() => projects.filter(p => p.clientId === client?.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [projects, client]);
    const clientContracts = useMemo(() => contracts.filter(c => c.clientId === client?.id), [contracts, client]);
    const [viewingDocument, setViewingDocument] = useState<{ type: 'invoice' | 'receipt' | 'contract', project: Project, data: any } | null>(null);
    const template = profile.publicPageConfig.template || 'classic';

    // Tabs config and memo MUST come before any conditional return to preserve hooks order across renders
    const allTabs = [
        { id: 'beranda', label: 'Beranda', icon: HomeIcon },
        { id: 'proyek', label: 'Proyek Saya', icon: FolderKanbanIcon },
        { id: 'galeri', label: 'Galeri & File', icon: GalleryHorizontalIcon },
        { id: 'keuangan', label: 'Keuangan', icon: CreditCardIcon },
        { id: 'kontrak', label: 'Kontrak', icon: FileTextIcon },
        { id: 'umpan-balik', label: 'Umpan Balik', icon: MessageSquareIcon },
    ];

    const tabs = useMemo(() => {
        if (isVendorClient) {
            return allTabs.filter(tab => ['proyek', 'galeri', 'umpan-balik'].includes(tab.id));
        }
        return allTabs;
    }, [isVendorClient]);

    if (!client) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4 bg-public-bg">
                <div className="w-full max-w-lg p-8 text-center bg-public-surface rounded-2xl shadow-lg">
                    <h1 className="text-2xl font-bold text-red-500">Portal Tidak Ditemukan</h1>
                    <p className="mt-4 text-public-text-primary">Tautan yang Anda gunakan tidak valid atau sudah tidak berlaku.</p>
                </div>
            </div>
        );
    }
    
    const renderContent = () => {
        switch(activeTab) {
            case 'beranda':
                return <DashboardTab client={client} projects={clientProjects} profile={profile} packages={packages} />;
            case 'proyek':
                return <ProjectsTab projects={clientProjects} profile={profile} onConfirm={onClientSubStatusConfirmation} />;
            case 'galeri':
                return <GalleryTab projects={clientProjects} packages={packages} />;
            case 'keuangan':
                 return <FinanceTab projects={clientProjects} contracts={contracts} transactions={transactions} onSignContract={onSignContract} profile={profile} packages={packages} client={client} onViewDocument={setViewingDocument} />;
            case 'kontrak':
                 return <ContractsTab contracts={clientContracts} projects={clientProjects} onViewContract={(contract) => setViewingDocument({type: 'contract', project: clientProjects.find(p => p.id === contract.projectId)!, data: contract})} />;
            case 'umpan-balik':
                return <FeedbackTab client={client} setClientFeedback={setClientFeedback} showNotification={showNotification} />;
            default:
                return null;
        }
    }

    return (
        <div className={`template-wrapper template-${template} min-h-screen`}>
            <style>{`
                .template-wrapper { background-color: var(--public-bg); color: var(--public-text-primary); }
                .portal-surface { background-color: var(--public-surface); border-color: var(--public-border); }
                .portal-text-primary { color: var(--public-text-primary); }
                .portal-text-secondary { color: var(--public-text-secondary); }
                .portal-border { border-color: var(--public-border); }
                .portal-accent-text { color: var(--public-accent); }
                .portal-accent-bg { background-color: var(--public-accent); }
                .portal-accent-bg-light { background-color: hsla(var(--public-accent-hsl), 0.1); }
            `}</style>
            <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-12 lg:gap-8">
                {/* --- Sidebar (Desktop) --- */}
                <aside className="hidden lg:block lg:col-span-3 xl:col-span-2 py-8">
                    <div className="sticky top-8">
                        <div className="px-4 mb-8">
                            <h1 className="text-2xl font-bold text-gradient">{profile.companyName}</h1>
                        </div>
                        <nav className="space-y-2 px-2">
                             {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                                        activeTab === tab.id ? 'portal-accent-bg-light portal-accent-text' : 'portal-text-secondary hover:bg-slate-200'
                                    }`}
                                >
                                    <tab.icon className="w-5 h-5" />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* --- Main Content --- */}
                <main className="lg:col-span-9 xl:col-span-10 p-4 lg:py-8 lg:px-6">
                    <header className="mb-8 widget-animate">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div>
                                <h2 className="text-3xl font-bold portal-text-primary">Selamat Datang, {client.name.split(' ')[0]}!</h2>
                                <p className="portal-text-secondary mt-1">Ini adalah pusat informasi untuk semua proyek Anda bersama kami.</p>
                            </div>
                            <div className="lg:w-[360px]">
                                <HelpBox variant="public" phone="085693762240" />
                            </div>
                        </div>
                    </header>
                    <div>
                        {renderContent()}
                    </div>
                </main>
            </div>
            
            {/* --- Bottom Nav (Mobile) --- */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 portal-surface border-t portal-border shadow-up-lg">
                <div className="flex justify-around">
                     {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex flex-col items-center justify-center w-full py-2 transition-colors ${
                                activeTab === tab.id ? 'portal-accent-text' : 'portal-text-secondary'
                            }`}
                        >
                            <tab.icon className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-bold">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </nav>
            {/* Add padding to the bottom of the body to prevent content from being hidden by the bottom nav */}
            <div className="h-20 lg:hidden"></div> 
            <DocumentViewerModal 
                viewingDocument={viewingDocument} 
                onClose={() => setViewingDocument(null)} 
                profile={profile} 
                packages={packages} 
                client={client} 
                onSignContract={onSignContract}
            />
        </div>
    );
};

// --- Portal Tabs as Components ---

const DashboardTab: React.FC<{ client: Client; projects: Project[], profile: Profile, packages: Package[] }> = ({ client, projects, profile, packages }) => {
    const activeProject = useMemo(() => projects.find(p => p.status !== 'Selesai' && p.status !== 'Dibatalkan'), [projects]);
    const upcomingProject = useMemo(() => projects.filter(p => new Date(p.date) >= new Date()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0], [projects]);

    const financialSummary = useMemo(() => {
        const totalValue = projects.reduce((sum, p) => sum + p.totalCost, 0);
        const totalPaid = projects.reduce((sum, p) => sum + p.amountPaid, 0);
        return { totalValue, totalPaid, totalDue: totalValue - totalPaid };
    }, [projects]);
    const activePackage = useMemo(() => {
        if (!activeProject) return null;
        return packages.find(pk => pk.id === activeProject.packageId) || null;
    }, [activeProject, packages]);
    const addOnsTotal = useMemo(() => {
        if (!activeProject) return 0;
        return (activeProject.addOns || []).reduce((s, a) => s + (a.price || 0), 0);
    }, [activeProject]);
    
    return (
        <div className="space-y-6">
            {upcomingProject && (
                 <div className="portal-surface p-4 sm:p-6 rounded-2xl shadow-md border widget-animate" style={{ animationDelay: '100ms' }}>
                    <h3 className="text-lg font-bold portal-text-primary mb-4">Proyek Mendatang</h3>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <p className="font-semibold text-xl portal-accent-text">{upcomingProject.projectName}</p>
                            <p className="text-sm portal-text-secondary mt-1">{upcomingProject.location}</p>
                        </div>
                        <p className="font-semibold portal-text-primary text-right bg-slate-100 px-4 py-2 rounded-lg">{formatDate(upcomingProject.date)}</p>
                    </div>
                </div>
            )}
             <div className="portal-surface p-4 sm:p-6 rounded-2xl shadow-md border widget-animate" style={{ animationDelay: '200ms' }}>
                <h3 className="text-lg font-bold portal-text-primary mb-4">Ringkasan Keuangan</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 widget-animate" style={{ animationDelay: '300ms' }}>
                        <p className="text-sm text-slate-500 font-medium">Total Nilai Proyek</p>
                        <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(financialSummary.totalValue)}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 widget-animate" style={{ animationDelay: '400ms' }}>
                        <p className="text-sm text-slate-500 font-medium">Total Terbayar</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(financialSummary.totalPaid)}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 widget-animate" style={{ animationDelay: '500ms' }}>
                        <p className="text-sm text-slate-500 font-medium">Sisa Tagihan</p>
                        <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(financialSummary.totalDue)}</p>
                    </div>
                </div>
            </div>
            {activeProject && (
                <div className="portal-surface p-4 sm:p-6 rounded-2xl shadow-md border widget-animate" style={{ animationDelay: '600ms' }}>
                    <h3 className="text-lg font-bold portal-text-primary mb-4">Progres Proyek Aktif: {activeProject.projectName}</h3>
                     <div className="flex items-center gap-4">
                        <div className="relative w-full bg-slate-200 rounded-full h-3.5">
                            <div className="portal-accent-bg h-3.5 rounded-full" style={{width: `${activeProject.progress}%`}}></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`text-xs font-bold ${activeProject.progress >= 35 ? 'text-white' : 'text-public-text-primary'}`}>{activeProject.progress}%</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-center text-sm portal-text-secondary mt-2">Status saat ini: <span className="font-semibold portal-text-primary">{activeProject.status}</span></p>
                </div>
            )}

            {activeProject && (
                <div className="portal-surface p-4 sm:p-6 rounded-2xl shadow-md border widget-animate" style={{ animationDelay: '700ms' }}>
                    <h3 className="text-lg font-bold portal-text-primary mb-4">Paket & Tambahan yang Diambil</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white rounded-xl border border-public-border">
                            <p className="text-sm font-semibold text-public-text-secondary mb-1">Paket</p>
                            <p className="text-lg font-bold text-public-text-primary">{activeProject.packageName || activePackage?.name || 'N/A'}</p>
                            <div className="mt-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-public-text-secondary">Harga Paket</span>
                                    <span className="font-semibold text-public-text-primary">{formatCurrency(activePackage?.price || 0)}</span>
                                </div>
                                <div className="flex justify-between mt-1">
                                    <span className="text-public-text-secondary">Subtotal Add-On</span>
                                    <span className="font-semibold text-public-text-primary">{formatCurrency(addOnsTotal)}</span>
                                </div>
                                {Boolean(activeProject.discountAmount) && (
                                    <div className="flex justify-between mt-1">
                                        <span className="text-public-text-secondary">Diskon</span>
                                        <span className="font-semibold text-red-700">- {formatCurrency(activeProject.discountAmount || 0)}</span>
                                    </div>
                                )}
                                <hr className="my-2 border-public-border" />
                                <div className="flex justify-between">
                                    <span className="font-bold text-public-text-primary">Total Proyek</span>
                                    <span className="font-extrabold text-public-text-primary">{formatCurrency(activeProject.totalCost)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-public-border">
                            <p className="text-sm font-semibold text-public-text-secondary mb-2">Add-On</p>
                            {activeProject.addOns && activeProject.addOns.length > 0 ? (
                                <ul className="space-y-2">
                                    {activeProject.addOns.map(ao => (
                                        <li key={ao.id} className="flex items-center justify-between text-sm">
                                            <span className="text-public-text-primary">{ao.name}</span>
                                            <span className="font-semibold text-public-text-primary">{formatCurrency(ao.price)}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-public-text-secondary italic">Tidak ada tambahan.</p>
                            )}
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-public-border">
                            <p className="text-sm font-semibold text-public-text-secondary mb-2">Ringkasan Pembayaran</p>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-public-text-secondary">Total Proyek</span><span className="font-bold text-public-text-primary">{formatCurrency(activeProject.totalCost)}</span></div>
                                <div className="flex justify-between"><span className="text-public-text-secondary">Sudah Dibayar</span><span className="font-semibold text-green-700">{formatCurrency(activeProject.amountPaid)}</span></div>
                                <div className="flex justify-between"><span className="text-public-text-secondary">Sisa Pembayaran</span><span className="font-semibold text-red-700">{formatCurrency(activeProject.totalCost - activeProject.amountPaid)}</span></div>
                            </div>
                        </div>
                    </div>
                    {activePackage && (
                        <div className="mt-4 p-4 bg-white rounded-xl border border-public-border">
                            <p className="text-sm font-semibold text-public-text-secondary mb-2">Isi Paket</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="font-semibold text-public-text-primary mb-1">Digital</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        {(activePackage.digitalItems || []).map((it, idx) => (
                                            <li key={idx} className="text-public-text-primary">{it}</li>
                                        ))}
                                        {(activePackage.digitalItems || []).length === 0 && <li className="text-public-text-secondary italic">Tidak ada</li>}
                                    </ul>
                                </div>
                                <div>
                                    <p className="font-semibold text-public-text-primary mb-1">Output Fisik</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        {(activePackage.physicalItems || []).map((it, idx) => (
                                            <li key={idx} className="text-public-text-primary">{it.name}</li>
                                        ))}
                                        {(activePackage.physicalItems || []).length === 0 && <li className="text-public-text-secondary italic">Tidak ada</li>}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const ProjectsTab: React.FC<{projects: Project[], profile: Profile, onConfirm: (projectId: string, subStatusName: string, note: string) => void}> = ({ projects, profile, onConfirm }) => {
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projects[0]?.id || null);
    const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);
    // Optional note per sub-status to be sent with confirmation
    const [notes, setNotes] = useState<Record<string, string>>({});

    const getRevisionStatusClass = (status: RevisionStatus) => {
      switch (status) {
          case RevisionStatus.COMPLETED: return 'bg-green-100 text-green-800';
          case RevisionStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-800';
          case RevisionStatus.PENDING: return 'bg-yellow-100 text-yellow-800';
          default: return 'bg-gray-100 text-gray-800';
      }
    };

    return (
         <div className="space-y-6">
             {projects.length > 1 && (
                <div className="portal-surface p-4 rounded-2xl shadow-md border widget-animate">
                    <label htmlFor="project-selector" className="text-sm font-medium portal-text-primary">Pilih Proyek:</label>
                    <select
                        id="project-selector"
                        value={selectedProjectId || ''}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="w-full mt-1 p-2 border portal-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50"
                    >
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.projectName}</option>
                        ))}
                    </select>
                </div>
            )}
            
            {!selectedProject ? (
                <div className="portal-surface p-8 rounded-2xl shadow-md border text-center widget-animate">
                    <p className="portal-text-secondary">Pilih proyek untuk melihat perjalanannya.</p>
                </div>
            ) : (
                <div className="portal-surface p-4 sm:p-6 rounded-2xl shadow-md border widget-animate" style={{ animationDelay: '100ms' }}>
                    <h3 className="text-xl font-bold portal-text-primary mb-6">Perjalanan Proyek: {selectedProject.projectName}</h3>
                    {profile.projectStatusConfig.map((statusConfig, statusIndex) => {
                        // Don't show empty stages unless it's the active one
                        if (statusConfig.subStatuses.length === 0 && selectedProject.status !== statusConfig.name && (statusConfig.name !== "Revisi" || (selectedProject.revisions || []).length === 0)) {
                            return null;
                        }

                        return (
                        <div key={statusConfig.id} className="mb-8 widget-animate" style={{ animationDelay: `${statusIndex * 150}ms`}}>
                            <h4 className="text-lg font-bold portal-text-primary mb-4 flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: statusConfig.color }}></span>
                                {statusConfig.name}
                            </h4>
                            <div className="relative border-l-2 portal-border">
                                {statusConfig.subStatuses.map((subStatus, subIndex) => {
                                    const isConfirmed = selectedProject.confirmedSubStatuses?.includes(subStatus.name);
                                    const isActive = selectedProject.activeSubStatuses?.includes(subStatus.name) && selectedProject.status === statusConfig.name;
                                    const clientNote = selectedProject.clientSubStatusNotes?.[subStatus.name];
                                    const totalDelay = statusIndex * 150 + (subIndex + 1) * 100;
                                    
                                    let iconClass = 'bg-gray-300';
                                    if (isConfirmed) iconClass = 'bg-green-500';
                                    else if (isActive) iconClass = 'portal-accent-bg active-pulse';
                                    
                                    return (
                                        <div className="timeline-item widget-animate" style={{ '--animation-delay': `${totalDelay}ms`, animationDelay: `${totalDelay}ms` } as React.CSSProperties} key={subStatus.name}>
                                            <div className={`timeline-icon-container ${iconClass}`}>
                                                {isConfirmed && <CheckCircleIcon className="w-4 h-4 text-white" />}
                                            </div>
                                            <div className="ml-4">
                                                <p className={`font-semibold ${!isConfirmed && !isActive ? 'portal-text-secondary' : 'portal-text-primary'}`}>{subStatus.name}</p>
                                                <p className="text-sm portal-text-secondary">{subStatus.note}</p>
                                                {clientNote && <blockquote className="mt-2 p-2 bg-slate-100 rounded-md border-l-4 border-slate-400"><p className="text-xs font-semibold text-slate-600">Catatan Anda:</p><p className="text-sm text-slate-800 italic">"{clientNote}"</p></blockquote>}
                                                {isActive && !isConfirmed && (
                                                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                        <p className="text-sm font-semibold text-blue-800">Tugas ini memerlukan konfirmasi Anda</p>
                                                        <div className="mt-3">
                                                            <label htmlFor={`note-${subStatus.name}`} className="text-xs font-medium text-blue-900">Tambahkan catatan (opsional)</label>
                                                            <textarea
                                                                id={`note-${subStatus.name}`}
                                                                className="w-full mt-1 p-2 rounded-md border border-blue-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                                rows={3}
                                                                value={notes[subStatus.name] || ''}
                                                                onChange={(e) => setNotes(prev => ({ ...prev, [subStatus.name]: e.target.value }))}
                                                                placeholder="Tulis catatan singkat untuk tim..."
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => { if(selectedProject) onConfirm(selectedProject.id, subStatus.name, notes[subStatus.name] || '')}}
                                                            className="mt-3 text-sm font-semibold text-white portal-accent-bg hover:bg-opacity-80 px-4 py-2 rounded-lg inline-flex items-center gap-2"
                                                        >
                                                            <SendIcon className="w-4 h-4" /> Konfirmasi
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {statusConfig.name === "Revisi" && (selectedProject.revisions || []).length > 0 && (
                                    (selectedProject.revisions || []).map((rev, revIndex) => {
                                        const isCompleted = rev.status === RevisionStatus.COMPLETED;
                                        let iconClass = isCompleted ? 'bg-green-500' : 'portal-accent-bg';
                                        const totalDelay = statusIndex * 150 + (statusConfig.subStatuses.length + revIndex + 1) * 100;

                                        return (
                                        <div className="timeline-item widget-animate" style={{ '--animation-delay': `${totalDelay}ms`, animationDelay: `${totalDelay}ms` } as React.CSSProperties} key={rev.id}>
                                            <div className={`timeline-icon-container ${iconClass}`}>
                                                {isCompleted && <CheckCircleIcon className="w-4 h-4 text-white" />}
                                            </div>
                                            <div className="ml-4 p-3 bg-slate-50 rounded-lg">
                                                <div className="flex justify-between items-center">
                                                    <p className="font-semibold portal-text-primary">Tugas Revisi</p>
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${getRevisionStatusClass(rev.status)}`}>{rev.status}</span>
                                                </div>
                                                <p className="text-sm portal-text-secondary mt-2"><strong>Catatan:</strong> {rev.adminNotes}</p>
                                                <p className="text-xs portal-text-secondary mt-1"><strong>Deadline:</strong> {formatDate(rev.deadline)}</p>
                                            </div>
                                        </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    )})}
                </div>
            )}
        </div>
    );
};

const GalleryTab: React.FC<{ projects: Project[], packages: Package[] }> = ({ projects, packages }) => (
    <div className="space-y-6">
        {projects.map((project, index) => {
            const pkg = packages.find(p => p.id === project.packageId);
            return (
                <div key={project.id} className="portal-surface p-4 sm:p-6 rounded-2xl shadow-md border widget-animate" style={{ animationDelay: `${index * 100}ms` }}>
                    <h3 className="text-lg font-bold portal-text-primary mb-4">File & Deliverables: {project.projectName}</h3>
                    <div className="space-y-4">
                        <h4 className="font-semibold portal-text-primary text-md">Tautan Penting</h4>
                         <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <div><p className="font-medium portal-text-primary">Hasil Akhir Foto & Video</p><p className="text-xs portal-text-secondary">Tautan final untuk semua hasil editan.</p></div>
                            {project.finalDriveLink ? <a href={project.finalDriveLink} target="_blank" rel="noopener noreferrer" className="button-primary text-sm px-4 py-2">Buka Galeri</a> : <span className="text-sm font-medium portal-text-secondary">Belum Tersedia</span>}
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <div><p className="font-medium portal-text-primary">Moodboard/Brief Proyek</p></div>
                            {project.driveLink ? <a href={project.driveLink} target="_blank" rel="noopener noreferrer" className="button-secondary text-sm px-4 py-2">Lihat Tautan</a> : <span className="text-sm font-medium portal-text-secondary">N/A</span>}
                        </div>
                         <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <div><p className="font-medium portal-text-primary">File dari Anda</p></div>
                            {project.clientDriveLink ? <a href={project.clientDriveLink} target="_blank" rel="noopener noreferrer" className="button-secondary text-sm px-4 py-2">Lihat Tautan</a> : <span className="text-sm font-medium portal-text-secondary">N/A</span>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 mt-4 border-t portal-border">
                             <div className="p-4 bg-slate-50 rounded-lg">
                                <h4 className="font-semibold portal-text-primary mb-3">Checklist Digital</h4>
                                <div className="space-y-2 text-sm">
                                    {(pkg?.digitalItems || []).map((item, index) => {
                                        const isCompleted = project.completedDigitalItems?.includes(item);
                                        return (
                                            <div key={index} className="flex items-center gap-3 p-2">
                                                <CheckCircleIcon className={`w-5 h-5 flex-shrink-0 ${isCompleted ? 'text-green-500' : 'text-gray-300'}`} />
                                                <span className={`portal-text-primary ${isCompleted ? 'line-through portal-text-secondary' : ''}`}>{item}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <h4 className="font-semibold portal-text-primary mb-3">Output Fisik</h4>
                                <ul className="space-y-2 text-sm list-disc list-inside">
                                    {(project.printingDetails || pkg?.physicalItems || []).map((item, index) => (
                                        <li key={index} className="portal-text-primary">
                                            {(item as any).customName || item.name}
                                        </li>
                                    ))}
                                    {(project.printingDetails || pkg?.physicalItems || []).length === 0 && <p className="text-xs portal-text-secondary italic">Tidak ada output fisik.</p>}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            );
        })}
    </div>
);

const FinanceTab: React.FC<{projects: Project[], contracts: Contract[], transactions: Transaction[], onSignContract: (id: string, sig: string, signer: 'vendor'|'client') => void, profile: Profile, packages: Package[], client: Client, onViewDocument: (doc: any) => void}> = ({ projects, contracts, transactions, profile, client, onViewDocument }) => {
    return (
        <div className="space-y-6">
             {projects.map((project, index) => {
                const projectTransactions = transactions.filter(t => t.projectId === project.id && t.type === 'Pemasukan');
                const projectContract = contracts.find(c => c.projectId === project.id);

                return (
                <div key={project.id} className="portal-surface p-4 sm:p-6 rounded-2xl shadow-md border widget-animate" style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                        <h3 className="text-lg font-bold portal-text-primary mb-2 sm:mb-0">{project.projectName}</h3>
                        <div className="flex items-center gap-2">
                             <button onClick={() => onViewDocument({type:'invoice', project, data: project})} className="button-primary text-sm px-3 py-1.5">Lihat Invoice</button>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t portal-border">
                        <h4 className="font-semibold portal-text-primary mb-2">Riwayat Pembayaran</h4>
                        <div className="space-y-2">
                            {projectTransactions.map(tx => (
                                <div key={tx.id} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-medium portal-text-primary">{tx.description}</p>
                                        <p className="text-xs portal-text-secondary">{formatDate(tx.date)}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <p className="font-semibold text-green-600">{formatCurrency(tx.amount)}</p>
                                        <button onClick={() => onViewDocument({type: 'receipt', project, data: tx})} className="p-1 text-slate-500 hover:text-blue-600" title="Lihat Tanda Terima"><PrinterIcon className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            ))}
                            {projectTransactions.length === 0 && <p className="text-sm portal-text-secondary">Belum ada pembayaran.</p>}
                        </div>
                    </div>
                </div>
                )
             })}
        </div>
    );
};

const ContractsTab: React.FC<{ contracts: Contract[], projects: Project[], onViewContract: (contract: Contract) => void }> = ({ contracts, projects, onViewContract }) => (
    <div className="portal-surface p-4 sm:p-6 rounded-2xl shadow-md border widget-animate">
        <h3 className="text-lg font-bold portal-text-primary mb-4">Kontrak Kerja Anda</h3>
        <div className="space-y-3">
            {contracts.length > 0 ? contracts.map(contract => {
                const project = projects.find(p => p.id === contract.projectId);
                return (
                    <div key={contract.id} className="p-4 bg-slate-50 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-semibold portal-text-primary">{contract.contractNumber}</p>
                            <p className="text-sm portal-text-secondary">Proyek: {project?.projectName || 'N/A'}</p>
                        </div>
                        <button onClick={() => onViewContract(contract)} className="button-secondary text-sm px-4 py-2">Lihat Dokumen</button>
                    </div>
                )
            }) : (
                <p className="portal-text-secondary text-center py-8">Belum ada kontrak yang tersedia.</p>
            )}
        </div>
    </div>
);


const FeedbackTab: React.FC<{client: Client, setClientFeedback: any, showNotification: any}> = ({ client, setClientFeedback, showNotification }) => {
    const [rating, setRating] = useState(0);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) { alert('Mohon berikan peringkat.'); return; }
        setIsSubmitting(true);
        try {
            const payload = {
                clientName: client!.name,
                rating,
                satisfaction: getSatisfactionFromRating(rating),
                feedback: feedbackText,
                date: new Date().toISOString(),
            } as Omit<ClientFeedback, 'id'>;
            const created = await createClientFeedback(payload);
            setClientFeedback((prev: ClientFeedback[]) => [created, ...prev]);
            showNotification('Terima kasih! Masukan Anda telah tersimpan.');
            setRating(0);
            setFeedbackText('');
        } catch (err) {
            console.error('[ClientPortal] Failed to create client feedback:', err);
            showNotification('Gagal menyimpan masukan. Coba lagi.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="portal-surface p-4 sm:p-6 rounded-2xl shadow-md border flex flex-col widget-animate">
            <h3 className="text-lg font-bold portal-text-primary">Berikan Masukan</h3>
            <p className="text-sm portal-text-secondary mt-1">Masukan Anda sangat berharga untuk kami menjadi lebih baik.</p>
            <div className="mt-6"><label className="text-sm font-medium portal-text-primary">Peringkat Kepuasan</label><div className="flex items-center gap-1 mt-2">{[1, 2, 3, 4, 5].map(star => (<button key={star} type="button" onClick={() => setRating(star)} aria-label={`Beri ${star} bintang`}><StarIcon className={`w-8 h-8 transition-colors ${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} /></button>))}</div></div>
            <div className="mt-4 flex-grow flex flex-col"><label htmlFor="feedbackText" className="text-sm font-medium portal-text-primary">Saran & masukan...</label><textarea id="feedbackText" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} className="w-full mt-2 p-3 border portal-border rounded-lg flex-grow focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50" rows={5}></textarea></div>
            <button type="submit" disabled={isSubmitting} className="mt-4 w-full py-3 px-4 portal-accent-bg text-white font-semibold rounded-full shadow-md hover:bg-opacity-80 transition-all duration-300 disabled:opacity-50">{isSubmitting ? 'Mengirim...' : 'Kirim Masukan'}</button>
        </form>
    );
};

const DocumentViewerModal: React.FC<{viewingDocument: any, onClose: any, profile: Profile, packages: Package[], client: Client, onSignContract: any}> = ({viewingDocument, onClose, profile, packages, client, onSignContract}) => {
    const [isSigning, setIsSigning] = useState(false);
        
    const handleSaveSignature = (signature: string) => {
        if (viewingDocument?.type === 'contract') {
            onSignContract(viewingDocument.data.id, signature, 'client');
        }
        setIsSigning(false);
    }
    
    // Open a separate print window to avoid Chrome fixed/transform print bugs
    const handlePrintFull = () => {
        try {
            const area = document.querySelector('.printable-area') as HTMLElement | null;
            if (!area) { window.print(); return; }
            const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
                .map(el => (el as HTMLElement).outerHTML)
                .join('\n');
            const baseHref = `${window.location.origin}${window.location.pathname}`;
            const docTitle = viewingDocument ? `${viewingDocument.type} - ${viewingDocument.project?.projectName || ''}` : 'Dokumen';
            const extraStyles = `
                <style>
                  @page { size: A4; margin: 12mm; }
                  html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  .print-a4 { width: 210mm; margin: 0 auto; }
                </style>
            `;
            const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${docTitle}</title><base href="${baseHref}">${headStyles}${extraStyles}</head><body class="print-a4"><div class="printable-area">${area.innerHTML}</div></body></html>`;
            const w = window.open('', '_blank', 'noopener,noreferrer');
            if (!w) { window.print(); return; }
            w.document.open();
            w.document.write(html);
            w.document.close();
            w.focus();
            w.onload = () => { try { w.print(); setTimeout(() => w.close(), 300); } catch { /* no-op */ } };
        } catch {
            window.print();
        }
    };
    
     const renderDocumentBody = () => {
        if (!viewingDocument) return null;
        
        const { type, project, data } = viewingDocument;
        const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

        if (type === 'invoice') {
            const selectedPackage = packages.find(p => p.id === project.packageId);
            const subtotal = project.totalCost + (project.discountAmount || 0);
            const remaining = project.totalCost - project.amountPaid;
            return (
                <div id="invoice-content" className="p-1 print-a4">
                    <div className="printable-content bg-slate-50 font-sans text-slate-800 printable-area">
                        <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 shadow-lg">
                            <header className="flex justify-between items-start mb-12">
                                <div>
                                    <h1 className="text-3xl font-extrabold text-slate-900">{profile.companyName}</h1>
                                    <p className="text-sm text-slate-500">{profile.address}</p>
                                    <p className="text-sm text-slate-500">{profile.phone} | {profile.email}</p>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-2xl font-bold uppercase text-slate-400 tracking-widest">Invoice</h2>
                                    <p className="text-sm text-slate-500 mt-1">No: <span className="font-semibold text-slate-700">INV-{project.id.slice(-6)}</span></p>
                                    <p className="text-sm text-slate-500">Tanggal: <span className="font-semibold text-slate-700">{new Date().toLocaleDateString('id-ID')}</span></p>
                                </div>
                            </header>

                            <section className="grid md:grid-cols-3 gap-6 mb-12">
                                <div className="bg-slate-50 p-6 rounded-xl"><h3 className="text-xs font-semibold uppercase text-slate-400 mb-2">Ditagihkan Kepada</h3><p className="font-bold text-slate-800">{client.name}</p><p className="text-sm text-slate-600">{client.email}</p><p className="text-sm text-slate-600">{client.phone}</p></div>
                                <div className="bg-slate-50 p-6 rounded-xl"><h3 className="text-xs font-semibold uppercase text-slate-400 mb-2">Diterbitkan Oleh</h3><p className="font-bold text-slate-800">{profile.companyName}</p><p className="text-sm text-slate-600">{profile.email}</p><p className="text-sm text-slate-600">{profile.phone}</p></div>
                                <div className="bg-blue-600 text-white p-6 rounded-xl printable-bg-blue printable-text-white"><h3 className="text-xs font-semibold uppercase text-blue-200 mb-2">Sisa Tagihan</h3><p className="font-extrabold text-3xl tracking-tight">{formatCurrency(remaining)}</p><p className="text-sm text-blue-200 mt-1">Jatuh Tempo: {formatDate(project.date)}</p></div>
                            </section>

                            <section><table className="w-full text-left">
                                <thead><tr className="border-b-2 border-slate-200"><th className="p-3 text-sm font-semibold uppercase text-slate-500">Deskripsi</th><th className="p-3 text-sm font-semibold uppercase text-slate-500 text-center">Jml</th><th className="p-3 text-sm font-semibold uppercase text-slate-500 text-right">Harga</th><th className="p-3 text-sm font-semibold uppercase text-slate-500 text-right">Total</th></tr></thead>
                                <tbody>
                                    <tr><td className="p-3 align-top"><p className="font-semibold text-slate-800">{project.packageName}</p><p className="text-xs text-slate-500">{selectedPackage?.digitalItems.join(', ')}</p></td><td className="p-3 text-center align-top">1</td><td className="p-3 text-right align-top">{formatCurrency(selectedPackage?.price || 0)}</td><td className="p-3 text-right align-top">{formatCurrency(selectedPackage?.price || 0)}</td></tr>
                                    {project.addOns.map(addon => (<tr key={addon.id}><td className="p-3 text-slate-600 align-top">- {addon.name}</td><td className="p-3 text-center align-top">1</td><td className="p-3 text-right align-top">{formatCurrency(addon.price)}</td><td className="p-3 text-right align-top">{formatCurrency(addon.price)}</td></tr>))}
                                </tbody>
                            </table></section>

                            <section className="mt-12">
                                <div className="flex justify-between">
                                    <div className="w-2/5"><h4 className="font-semibold text-slate-600">Tanda Tangan</h4>{project.invoiceSignature ? (<img src={project.invoiceSignature} alt="Tanda Tangan" className="h-20 mt-2 object-contain" />) : (<div className="h-20 mt-2 flex items-center justify-center text-xs text-slate-400 italic border border-dashed rounded-lg">Belum Ditandatangani</div>)}</div>
                                    <div className="w-2/5 space-y-2 text-sm">
                                        <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span></div>
                                        {project.discountAmount && project.discountAmount > 0 && (<div className="flex justify-between"><span className="text-slate-500">Diskon</span><span className="font-semibold text-green-600 print-text-green">-{formatCurrency(project.discountAmount)}</span></div>)}
                                        <div className="flex justify-between"><span className="text-slate-500">Telah Dibayar</span><span className="font-semibold text-slate-800">-{formatCurrency(project.amountPaid)}</span></div>
                                        <div className="flex justify-between font-bold text-lg text-slate-900 border-t-2 border-slate-300 pt-2 mt-2"><span>Sisa Tagihan</span><span>{formatCurrency(remaining)}</span></div>
                                    </div>
                                </div>
                            </section>
                            
                            <footer className="mt-12 pt-8 border-t-2 border-slate-200"><p className="text-xs text-slate-500 text-center">Jika Anda memiliki pertanyaan, silakan hubungi kami di {profile.phone}</p><div className="w-full h-2 bg-blue-600 mt-6 rounded"></div></footer>
                        </div>
                    </div>
                </div>
            );
        } else if (type === 'receipt') {
            const transaction = data as Transaction;
            return (
                <div id="receipt-content" className="p-1 print-a4">
                     <div className="printable-content bg-slate-50 font-sans text-slate-800 printable-area">
                        <div className="max-w-md mx-auto bg-white p-8 shadow-lg rounded-xl">
                            <header className="text-center mb-8"><h1 className="text-2xl font-bold text-slate-900">KWITANSI PEMBAYARAN</h1><p className="text-sm text-slate-500">{profile.companyName}</p></header>
                            <div className="p-4 bg-green-500/10 border border-green-200 rounded-lg text-center mb-8 printable-bg-green-light"><p className="text-sm font-semibold text-green-700 print-text-green">PEMBAYARAN DITERIMA</p><p className="text-3xl font-bold text-green-800 print-text-green mt-1">{formatCurrency(transaction.amount)}</p></div>
                            <div className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-slate-500">No. Kwitansi</span><span className="font-semibold text-slate-700 font-mono">{transaction.id.slice(0,12)}</span></div><div className="flex justify-between"><span className="text-slate-500">Tanggal Bayar</span><span className="font-semibold text-slate-700">{formatDate(transaction.date)}</span></div><div className="flex justify-between"><span className="text-slate-500">Diterima dari</span><span className="font-semibold text-slate-700">{client.name}</span></div><div className="flex justify-between"><span className="text-slate-500">Metode</span><span className="font-semibold text-slate-700">{transaction.method}</span></div></div>
                            <div className="mt-6 pt-6 border-t border-slate-200"><p className="text-sm text-slate-500">Untuk pembayaran:</p><p className="font-semibold text-slate-800 mt-1">{transaction.description}</p>{project && (<div className="mt-2 text-xs text-slate-500"><p>Proyek: {project.projectName}</p><p>Total Tagihan: {formatCurrency(project.totalCost)} | Sisa: {formatCurrency(project.totalCost - project.amountPaid)}</p></div>)}</div>
                            <footer className="mt-12 flex justify-between items-end"><p className="text-xs text-slate-400">Terima kasih.</p><div className="text-center">{transaction.vendorSignature ? (<img src={transaction.vendorSignature} alt="Tanda Tangan" className="h-16 object-contain" />) : (<div className="h-16 flex items-center justify-center text-xs text-slate-400 italic border-b border-dashed">Belum Ditandatangani</div>)}<p className="text-xs font-semibold text-slate-600 mt-1">({profile.authorizedSigner || profile.companyName})</p></div></footer>
                        </div>
                    </div>
                </div>
            );
        } else if (type === 'contract') {
            const contract = data as Contract;
            if (!project) {
                return (
                    <div className="text-center p-8">
                        <p className="text-red-500">Error: Data proyek tidak ditemukan untuk kontrak ini.</p>
                    </div>
                );
            }
             return (
                <div className="printable-content bg-white text-black p-8 font-serif leading-relaxed text-sm">
                    <h2 className="text-xl font-bold text-center mb-1">SURAT PERJANJIAN KERJA SAMA</h2>
                    <h3 className="text-lg font-bold text-center mb-6">JASA {project.projectType.toUpperCase()}</h3>
                    <p>Pada hari ini, {formatDate(contract.signingDate)}, bertempat di {contract.signingLocation}, telah dibuat dan disepakati perjanjian kerja sama antara:</p>
                    
                    <div className="my-4">
                        <p className="font-bold">PIHAK PERTAMA</p>
                        <table>
                            <tbody>
                                <tr><td className="pr-4 align-top">Nama</td><td>: {profile.authorizedSigner}</td></tr>
                                <tr><td className="pr-4 align-top">Jabatan</td><td>: Pemilik Usaha</td></tr>
                                <tr><td className="pr-4 align-top">Alamat</td><td>: {profile.address}</td></tr>
                                <tr><td className="pr-4 align-top">Nomor Telepon</td><td>: {profile.phone}</td></tr>
                                {profile.idNumber && <tr><td className="pr-4 align-top">Nomor Identitas</td><td>: {profile.idNumber}</td></tr>}
                            </tbody>
                        </table>
                        <p className="mt-1">Dalam hal ini bertindak atas nama perusahaannya, <strong>{profile.companyName}</strong>, selanjutnya disebut sebagai <strong>PIHAK PERTAMA</strong>.</p>
                    </div>

                    <div className="my-4">
                        <p className="font-bold">PIHAK KEDUA</p>
                         <table>
                            <tbody>
                                <tr><td className="pr-4 align-top">Nama</td><td>: {contract.clientName1}</td></tr>
                                <tr><td className="pr-4 align-top">Alamat</td><td>: {contract.clientAddress1}</td></tr>
                                <tr><td className="pr-4 align-top">Nomor Telepon</td><td>: {contract.clientPhone1}</td></tr>
                                {contract.clientName2 && <>
                                    <tr><td className="pr-4 align-top">Nama</td><td>: {contract.clientName2}</td></tr>
                                    <tr><td className="pr-4 align-top">Alamat</td><td>: {contract.clientAddress2}</td></tr>
                                    <tr><td className="pr-4 align-top">Nomor Telepon</td><td>: {contract.clientPhone2}</td></tr>
                                </>}
                            </tbody>
                        </table>
                        <p className="mt-1">Dalam hal ini bertindak atas nama pribadi/bersama, selanjutnya disebut sebagai <strong>PIHAK KEDUA</strong>.</p>
                    </div>
                    
                    <div className="space-y-4 mt-6">
                        <div><h4 className="font-bold text-center my-3">PASAL 1: DEFINISI</h4><p>Pekerjaan adalah jasa {project.projectType.toLowerCase()} yang diberikan oleh PIHAK PERTAMA untuk acara PIHAK KEDUA. Hari Pelaksanaan adalah tanggal {formatDate(project.date)}. Lokasi Pelaksanaan adalah {project.location}.</p></div>
                        <div><h4 className="font-bold text-center my-3">PASAL 2: RUANG LINGKUP PEKERJAAN</h4><p>PIHAK PERTAMA akan memberikan jasa fotografi sesuai dengan paket {project.packageName} yang mencakup: Durasi pemotretan {contract.shootingDuration}, Jumlah foto {contract.guaranteedPhotos}, {contract.albumDetails}, File digital {contract.digitalFilesFormat}, dan {contract.otherItems}. PIHAK PERTAMA akan menyediakan {contract.personnelCount}. Penyerahan hasil akhir dilakukan maksimal {contract.deliveryTimeframe} setelah acara.</p></div>
                        <div><h4 className="font-bold text-center my-3">PASAL 3: HAK DAN KEWAJIBAN PIHAK PERTAMA</h4><p>Hak: Menerima pembayaran sesuai kesepakatan; Menggunakan hasil foto untuk promosi/portofolio dengan persetujuan PIHAK KEDUA. Kewajiban: Melaksanakan pekerjaan secara profesional; Menyerahkan hasil tepat waktu; Menjaga privasi PIHAK KEDUA.</p></div>
                        <div><h4 className="font-bold text-center my-3">PASAL 4: HAK DAN KEWAJIBAN PIHAK KEDUA</h4><p>Hak: Menerima hasil pekerjaan sesuai paket; Meminta revisi minor jika ada kesalahan teknis. Kewajiban: Melakukan pembayaran sesuai jadwal; Memberikan informasi yang dibutuhkan; Menjamin akses kerja di lokasi.</p></div>
                        <div><h4 className="font-bold text-center my-3">PASAL 5: BIAYA DAN CARA PEMBAYARAN</h4><p>Total biaya jasa adalah sebesar {formatCurrency(project.totalCost)}. Pembayaran dilakukan dengan sistem: Uang Muka (DP) sebesar {formatCurrency(project.amountPaid)} dibayarkan pada {formatDate(contract.dpDate)}; Pelunasan sebesar {formatCurrency(project.totalCost - project.amountPaid)} dibayarkan paling lambat pada {formatDate(contract.finalPaymentDate)}. Pembayaran dapat ditransfer ke rekening: {profile.bankAccount}.</p></div>
                        <div><h4 className="font-bold text-center my-3">PASAL 6: PEMBATALAN</h4><p dangerouslySetInnerHTML={{ __html: contract.cancellationPolicy.replace(/\n/g, '<br/>') }}></p></div>
                        <div><h4 className="font-bold text-center my-3">PASAL 7: PENYELESAIAN SENGKETA</h4><p>Segala sengketa yang timbul akan diselesaikan secara musyawarah. Apabila tidak tercapai, maka akan diselesaikan secara hukum di wilayah hukum {contract.jurisdiction}.</p></div>
                        <div><h4 className="font-bold text-center my-3">PASAL 8: PENUTUP</h4><p>Demikian surat perjanjian ini dibuat dalam 2 (dua) rangkap bermaterai cukup dan mempunyai kekuatan hukum yang sama, ditandatangani dengan penuh kesadaran oleh kedua belah pihak.</p></div>
                    </div>

                    <div className="flex justify-between items-end mt-16">
                        <div className="text-center w-2/5">
                            <p>PIHAK PERTAMA</p>
                            <div className="h-28 my-1 flex flex-col items-center justify-center text-gray-400 text-xs">
                                {contract.vendorSignature ? <img src={contract.vendorSignature} alt="Tanda Tangan Vendor" className="h-24 object-contain" /> : <span className="italic">(Menunggu TTD Vendor)</span>}
                            </div>
                            <p className="border-t-2 border-dotted w-4/5 mx-auto pt-1">({profile.authorizedSigner})</p>
                        </div>
                         <div className="text-center w-2/5">
                            <p>PIHAK KEDUA</p>
                            <div className="h-28 w-full mx-auto my-1 flex items-center justify-center text-gray-400 text-xs italic">
                                {contract.clientSignature ? (
                                    <img src={contract.clientSignature} alt="Tanda Tangan Klien" className="h-24 object-contain" />
                                ) : (
                                    <span className="italic">Belum Ditandatangani</span>
                                )}
                            </div>
                            <p className="border-t-2 border-dotted w-4/5 mx-auto pt-1">({contract.clientName1}{contract.clientName2 ? ` & ${contract.clientName2}` : ''})</p>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };


    return (
        <>
            <Modal isOpen={!!viewingDocument} onClose={onClose} title={viewingDocument ? `${viewingDocument.type.charAt(0).toUpperCase() + viewingDocument.type.slice(1)}: ${viewingDocument.project.projectName}` : ''} size="4xl">
                 {viewingDocument && (
                     <div>
                        <div className="printable-area max-h-[65vh] overflow-y-auto pr-4">{renderDocumentBody()}</div>
                         <div className="mt-6 flex justify-between items-center non-printable border-t border-public-border pt-4">
                            {viewingDocument.type === 'contract' && (
                                <div className="text-sm">
                                    <p className={`font-semibold ${viewingDocument.data.clientSignature ? 'text-green-500' : 'text-yellow-500'}`}>
                                        Status Anda: {viewingDocument.data.clientSignature ? 'Sudah TTD' : 'Belum TTD'}
                                    </p>
                                    <p className={`font-semibold ${viewingDocument.data.vendorSignature ? 'text-green-500' : 'text-yellow-500'}`}>
                                        Status {profile.companyName}: {viewingDocument.data.vendorSignature ? 'Sudah TTD' : 'Belum TTD'}
                                    </p>
                                </div>
                            )}
                            <div className="space-x-2">
                                {viewingDocument.type === 'contract' && !viewingDocument.data.clientSignature && (
                                    <button onClick={() => setIsSigning(true)} className="button-primary">
                                        Tanda Tangani Kontrak
                                    </button>
                                )}
                                <button type="button" onClick={handlePrintFull} className="button-secondary inline-flex items-center gap-2">
                                    <PrinterIcon className="w-4 h-4"/> Cetak / Simpan PDF
                                </button>
                            </div>
                        </div>
                     </div>
                 )}
             </Modal>
             <Modal isOpen={isSigning} onClose={() => setIsSigning(false)} title="Bubuhkan Tanda Tangan Anda">
                <SignaturePad onSave={handleSaveSignature} onClose={() => setIsSigning(false)} />
            </Modal>
        </>
    );
}

export default ClientPortal;