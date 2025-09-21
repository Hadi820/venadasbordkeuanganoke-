

import React, { useState, useMemo, useEffect } from 'react';
import { TeamMember, Project, TeamProjectPayment, FreelancerFeedback, Revision, RevisionStatus, PerformanceNoteType, TeamPaymentRecord, RewardLedgerEntry, PerformanceNote, SOP, Profile, FreelancerPortalProps } from '../types';
import { listRevisionsByProject } from '../services/projectRevisions';
import Modal from './Modal';
import { CalendarIcon, CreditCardIcon, MessageSquareIcon, ClockIcon, UsersIcon, FileTextIcon, MapPinIcon, HomeIcon, FolderKanbanIcon, StarIcon, DollarSignIcon, AlertCircleIcon, BookOpenIcon, PrinterIcon, CheckSquareIcon, Share2Icon } from '../constants';
import StatCard from './StatCard';
import SignaturePad from './SignaturePad';
import HelpBox from './HelpBox';
import PrintButton from './PrintButton';

const formatCurrency = (amount: number, options?: {
    showDecimals?: boolean;
    compact?: boolean;
}) => {
    const { showDecimals = true, compact = false } = options || {};
    
    // Indonesian currency formatting: Rp 10.416.183,30
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: showDecimals ? 2 : 0,
        maximumFractionDigits: showDecimals ? 2 : 0,
        notation: compact ? 'compact' : 'standard'
    }).format(amount);
};

// Utility function for consistent currency display in documents
const formatDocumentCurrency = (amount: number) => {
    // Always show decimals for formal documents
    return formatCurrency(amount, { showDecimals: true });
};

// Utility function for display in tables/lists (no decimals for cleaner look)
const formatDisplayCurrency = (amount: number) => {
    return formatCurrency(amount, { showDecimals: false });
};
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
const getInitials = (name: string) => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();


const FreelancerPortal: React.FC<FreelancerPortalProps> = ({ accessId, teamMembers, projects, teamProjectPayments, teamPaymentRecords, rewardLedgerEntries, showNotification, onUpdateRevision, sops, userProfile }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [slipToView, setSlipToView] = useState<TeamPaymentRecord | null>(null);
    const profile = userProfile;

    const freelancer = useMemo(() => teamMembers.find(m => m.portalAccessId === accessId), [teamMembers, accessId]);
    const assignedProjects = useMemo(() => projects.filter(p => p.team.some(t => t.memberId === freelancer?.id)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [projects, freelancer]);
    
    if (!freelancer) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-public-bg p-4">
                <div className="w-full max-w-lg p-8 text-center bg-public-surface rounded-2xl shadow-lg">
                    <h1 className="text-2xl font-bold text-red-500">Portal Tidak Ditemukan</h1>
                    <p className="mt-4 text-public-text-primary">Tautan yang Anda gunakan tidak valid. Silakan hubungi admin.</p>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'dashboard', label: 'Dasbor', icon: HomeIcon },
        { id: 'projects', label: 'Proyek & Revisi', icon: FolderKanbanIcon },
        { id: 'payments', label: 'Pembayaran', icon: CreditCardIcon },
        { id: 'performance', label: 'Kinerja', icon: StarIcon },
        { id: 'sop', label: 'SOP', icon: BookOpenIcon },
    ];
    
    const renderPaymentSlipBody = (record: TeamPaymentRecord) => {
        if (!freelancer) return null;
        const projectsBeingPaid = teamProjectPayments.filter(p => record.projectPaymentIds.includes(p.id));
    
        return (
            <div id={`payment-slip-content-${record.id}`} className="printable-content bg-slate-50 font-sans text-slate-800 printable-area avoid-break">
                <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 shadow-lg">
                    <header className="flex justify-between items-start mb-12">
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900">{profile.companyName}</h1>
                            <p className="text-sm text-slate-500">{profile.address}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-bold uppercase text-slate-400 tracking-widest">Slip Pembayaran</h2>
                            <p className="text-sm text-slate-500 mt-1">No: <span className="font-semibold text-slate-700">{record.recordNumber}</span></p>
                            <p className="text-sm text-slate-500">Tanggal: <span className="font-semibold text-slate-700">{formatDate(record.date)}</span></p>
                        </div>
                    </header>
    
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 doc-header-grid">
                        <div className="bg-slate-50 p-6 rounded-xl"><h3 className="text-xs font-semibold uppercase text-slate-400 mb-2">Dibayarkan Kepada</h3><p className="font-bold text-slate-800">{freelancer.name}</p><p className="text-sm text-slate-600">{freelancer.role}</p><p className="text-sm text-slate-600">No. Rek: {freelancer.noRek}</p></div>
                        <div className="bg-slate-50 p-6 rounded-xl"><h3 className="text-xs font-semibold uppercase text-slate-400 mb-2">Dibayarkan Oleh</h3><p className="font-bold text-slate-800">{profile.companyName}</p><p className="text-sm text-slate-600">{profile.bankAccount}</p></div>
                    </section>
    
                    <section>
                        <h3 className="font-semibold text-slate-800 mb-3">Rincian Pembayaran</h3>
                        <table className="w-full text-left responsive-table">
                            <thead><tr className="border-b-2 border-slate-200"><th className="p-3 text-sm font-semibold uppercase text-slate-500">Proyek</th><th className="p-3 text-sm font-semibold uppercase text-slate-500">Peran</th><th className="p-3 text-sm font-semibold uppercase text-slate-500 text-right">Fee</th></tr></thead>
                            <tbody className="divide-y divide-slate-200">
                                {projectsBeingPaid.map(p => {
                                    const project = projects.find(proj => proj.id === p.projectId);
                                    return (
                                        <tr key={p.id}>
                                            <td data-label="Proyek" className="p-3 font-semibold text-slate-800">{project?.projectName || 'N/A'}</td>
                                            <td data-label="Peran" className="p-3 text-slate-600">{project?.team.find(t => t.memberId === freelancer.id)?.role || freelancer.role}</td>
                                            <td data-label="Fee" className="p-3 text-right text-slate-800">{formatDocumentCurrency(p.fee)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </section>
    
                    <section className="mt-12 avoid-break totals-section">
                        <div className="flex flex-col sm:flex-row justify-end">
                            <div className="w-full sm:w-2/5 space-y-2 text-sm">
                                <div className="flex justify-between font-bold text-xl text-slate-900 bg-slate-100 p-4 rounded-lg">
                                    <span>TOTAL DIBAYAR</span>
                                    <span>{formatDocumentCurrency(record.totalAmount)}</span>
                                </div>
                            </div>
                        </div>
                    </section>
                    
                    <footer className="mt-12 pt-8 border-t-2 border-slate-200 avoid-break signature-section">
                        <div className="flex justify-between items-end">
                            <div></div>
                            <div className="text-center w-full sm:w-2/5">
                                <p className="text-sm text-slate-600">Diverifikasi oleh,</p>
                                <div className="h-20 mt-2 flex items-center justify-center">{record.vendorSignature ? (<img src={record.vendorSignature} alt="Tanda Tangan" className="h-20 object-contain" />) : (<div className="h-20 flex items-center justify-center text-xs text-slate-400 italic border-b border-dashed w-full">Belum Ditandatangani</div>)}</div>
                                <p className="text-sm font-semibold text-slate-800 mt-1 border-t-2 border-slate-300 pt-1">({profile.authorizedSigner || profile.companyName})</p>
                            </div>
                        </div>
                    </footer>
                </div>
            </div>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardTab freelancer={freelancer} projects={assignedProjects} teamProjectPayments={teamProjectPayments} />;
            case 'projects': return <ProjectsTab projects={assignedProjects} onProjectClick={setSelectedProject} freelancerId={freelancer.id} />;
            case 'payments': return <PaymentsTab freelancer={freelancer} projects={projects} teamProjectPayments={teamProjectPayments} teamPaymentRecords={teamPaymentRecords} onSlipView={setSlipToView} />;
            case 'performance': return <PerformanceTab freelancer={freelancer} />;
            case 'sop': return <SOPsTab sops={sops} assignedProjects={assignedProjects} />;
            default: return null;
        }
    }

    return (
        <div className="min-h-screen bg-public-bg text-public-text-primary p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">
                <header className="mb-8 p-4 sm:p-6 bg-public-surface rounded-2xl shadow-lg border border-public-border widget-animate">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gradient">Portal Freelancer</h1>
                            <p className="text-lg text-public-text-secondary mt-2">Selamat Datang, {freelancer.name}!</p>
                        </div>
                        <div className="lg:w-[360px]">
                            <HelpBox variant="public" phone="085693762240" />
                        </div>
                    </div>
                </header>
                <div className="border-b border-public-border mb-6 widget-animate" style={{ animationDelay: '100ms' }}><nav className="-mb-px flex space-x-6 overflow-x-auto">{tabs.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? 'border-public-accent text-public-accent' : 'border-transparent text-public-text-secondary hover:text-public-text-primary'}`}><tab.icon className="w-5 h-5"/> {tab.label}</button>))}</nav></div>
                <main>{renderTabContent()}</main>
                <Modal isOpen={!!selectedProject} onClose={() => setSelectedProject(null)} title={`Detail Proyek: ${selectedProject?.projectName}`} size="3xl">
                    {selectedProject && <ProjectDetailModal project={selectedProject} freelancer={freelancer} onUpdateRevision={onUpdateRevision} showNotification={showNotification} onClose={() => setSelectedProject(null)} />}
                </Modal>
                <Modal isOpen={!!slipToView} onClose={() => setSlipToView(null)} title={`Slip Pembayaran: ${slipToView?.recordNumber}`} size="3xl">
                    {slipToView && <div className="printable-area">{renderPaymentSlipBody(slipToView)}</div>}
                    <div className="mt-6 text-right non-printable">
                        <PrintButton
                            areaId={`payment-slip-content-${slipToView?.id}`}
                            label="Cetak"
                            title={`Slip Pembayaran - ${slipToView?.recordNumber || ''}`}
                        />
                    </div>
                </Modal>
            </div>
        </div>
    );
};


// --- SUB-COMPONENTS ---

const DashboardTab: React.FC<{freelancer: TeamMember, projects: Project[], teamProjectPayments: TeamProjectPayment[]}> = ({ freelancer, projects, teamProjectPayments }) => {
    const stats = useMemo(() => {
        const unpaidFee = teamProjectPayments.filter(p => p.teamMemberId === freelancer.id && p.status === 'Unpaid').reduce((sum, p) => sum + p.fee, 0);
        const paidFee = teamProjectPayments.filter(p => p.teamMemberId === freelancer.id && p.status === 'Paid').reduce((sum, p) => sum + p.fee, 0);
        const pendingRevisions = projects.flatMap(p => p.revisions || []).filter(r => r.freelancerId === freelancer.id && r.status === RevisionStatus.PENDING).length;
        const completedProjects = projects.filter(p => p.status === 'Selesai' && p.team.some(t => t.memberId === freelancer.id)).length;

        return { unpaidFee, paidFee, pendingRevisions, completedProjects, activeProjects: projects.filter(p => p.status !== 'Selesai' && p.status !== 'Dibatalkan').length };
    }, [freelancer, projects, teamProjectPayments]);
    
     const agendaItems = useMemo(() => {
        const revisions: (Revision & { type: 'revision'; projectName: string; projectId: string; date: string; })[] = projects
            .flatMap(p => (p.revisions || []).map(r => ({ ...r, type: 'revision' as const, projectName: p.projectName, projectId: p.id, date: r.deadline })))
            .filter(r => r.freelancerId === freelancer.id && r.status === RevisionStatus.PENDING);
        
        const nextProject = projects
            .filter(p => new Date(p.date) >= new Date() && p.status !== 'Selesai' && p.status !== 'Dibatalkan')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
            
        const agenda: (typeof revisions[0] | (Project & { type: 'project' }))[] = [...revisions];
        if (nextProject) {
            agenda.push({ ...nextProject, type: 'project' as const });
        }
            
        return agenda.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    }, [projects, freelancer]);


    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="widget-animate" style={{ animationDelay: '200ms' }}><StatCard icon={<CreditCardIcon className="w-6 h-6"/>} title="Total Fee Diterima" value={formatDisplayCurrency(stats.paidFee)} iconBgColor="bg-green-500/20" iconColor="text-green-400" /></div>
                <div className="widget-animate" style={{ animationDelay: '300ms' }}><StatCard icon={<AlertCircleIcon className="w-6 h-6"/>} title="Fee Belum Dibayar" value={formatDisplayCurrency(stats.unpaidFee)} iconBgColor="bg-red-500/20" iconColor="text-red-400" /></div>
                <div className="widget-animate" style={{ animationDelay: '400ms' }}><StatCard icon={<FolderKanbanIcon className="w-6 h-6"/>} title="Proyek Aktif" value={stats.activeProjects.toString()} iconBgColor="bg-blue-500/20" iconColor="text-blue-400" /></div>
                <div className="widget-animate" style={{ animationDelay: '500ms' }}><StatCard icon={<CheckSquareIcon className="w-6 h-6"/>} title="Proyek Selesai" value={stats.completedProjects.toString()} iconBgColor="bg-indigo-500/20" iconColor="text-indigo-400" /></div>
            </div>
             <div className="bg-public-surface p-4 sm:p-6 rounded-2xl shadow-lg border border-public-border widget-animate" style={{ animationDelay: '600ms' }}>
                <h3 className="text-xl font-bold text-public-text-primary mb-4">Agenda & Tugas Mendesak</h3>
                <div className="space-y-3">
                    {agendaItems.length > 0 ? agendaItems.map((item, index) => (
                        <div key={index} className="p-3 bg-public-bg rounded-lg flex justify-between items-center widget-animate" style={{ animationDelay: `${700 + index * 100}ms` }}>
                            <div className="flex items-center gap-3">
                                {item.type === 'revision' ? <ClockIcon className="w-5 h-5 text-purple-400"/> : <CalendarIcon className="w-5 h-5 text-blue-400"/>}
                                <div>
                                    <p className="font-semibold text-public-text-primary">{item.type === 'revision' ? 'Deadline Revisi' : 'Proyek Mendatang'}</p>
                                    <p className="text-sm text-public-text-secondary">{item.projectName}</p>
                                </div>
                            </div>
                            <p className="text-sm font-medium text-public-text-primary">{formatDate(item.date)}</p>
                        </div>
                    )) : <p className="text-center text-public-text-secondary py-8">Tidak ada agenda atau tugas mendesak.</p>}
                </div>
            </div>
        </div>
    );
};

const ProjectsTab: React.FC<{projects: Project[], onProjectClick: (p: Project) => void, freelancerId: string}> = ({ projects, onProjectClick, freelancerId }) => {
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed'>('all');

    const classify = (p: Project) => {
        const today = new Date();
        const d = new Date(p.date);
        const isCompleted = p.status === 'Selesai';
        const isCancelled = p.status === 'Dibatalkan';
        const isUpcoming = !isCompleted && !isCancelled && d >= new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const isOngoing = !isCompleted && !isCancelled && d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return { isCompleted, isUpcoming, isOngoing };
    };

    const counts = useMemo(() => {
        let upcoming = 0, ongoing = 0, completed = 0;
        projects.forEach(p => {
            const c = classify(p);
            if (c.isUpcoming) upcoming++; else if (c.isOngoing) ongoing++; else if (c.isCompleted) completed++;
        });
        return { upcoming, ongoing, completed, all: projects.length };
    }, [projects]);

    const filtered = useMemo(() => {
        let arr = projects.slice();
        if (filter !== 'all') {
            arr = arr.filter(p => {
                const c = classify(p);
                if (filter === 'upcoming') return c.isUpcoming;
                if (filter === 'ongoing') return c.isOngoing;
                if (filter === 'completed') return c.isCompleted;
                return true;
            });
        }
        // Sorting rules
        if (filter === 'completed') {
            arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } else {
            arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
        return arr;
    }, [projects, filter]);

    const FilterButton: React.FC<{ id: typeof filter; label: string; count: number; }> = ({ id, label, count }) => (
        <button
            onClick={() => setFilter(id)}
            aria-pressed={filter === id}
            className={
                `px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ` +
                (filter === id
                    ? 'bg-public-accent text-white border-public-accent shadow-soft'
                    : 'bg-white text-public-text-secondary border-public-border hover:text-public-text-primary')
            }
        >
            {label} ({count})
        </button>
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 bg-public-surface border border-public-border p-3 rounded-xl">
                <FilterButton id="all" label="Semua" count={counts.all} />
                <FilterButton id="upcoming" label="Akan Datang" count={counts.upcoming} />
                <FilterButton id="ongoing" label="Berjalan" count={counts.ongoing} />
                <FilterButton id="completed" label="Selesai" count={counts.completed} />
            </div>

            {filtered.map((p, index) => {
                const pendingRevisionsCount = (p.revisions || []).filter(r => r.freelancerId === freelancerId && r.status === RevisionStatus.PENDING).length;
                const assignmentDetails = p.team.find(t => t.memberId === freelancerId);
                const { isUpcoming, isOngoing, isCompleted } = classify(p);
                const statusBadge = isCompleted
                  ? { text: 'Selesai', cls: 'bg-green-100 text-green-800' }
                  : isUpcoming
                  ? { text: 'Akan Datang', cls: 'bg-blue-100 text-blue-800' }
                  : { text: 'Berjalan', cls: 'bg-yellow-100 text-yellow-800' };
                return (
                    <div key={p.id} onClick={() => onProjectClick(p)} className="p-4 bg-public-surface rounded-xl border border-public-border cursor-pointer hover:border-public-accent flex justify-between items-center transition-all duration-200 hover:shadow-md widget-animate" style={{ animationDelay: `${index * 80}ms` }}>
                        <div>
                            <h3 className="font-semibold text-lg text-public-text-primary">{p.projectName}</h3>
                            <p className="text-sm text-public-text-secondary mt-1">{p.clientName} - {formatDate(p.date)}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusBadge.cls}`}>{statusBadge.text}</span>
                                {assignmentDetails?.subJob && (
                                    <span className="text-[10px] font-semibold text-public-accent bg-public-accent/10 px-2 py-0.5 rounded-md inline-block">{assignmentDetails.subJob}</span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {pendingRevisionsCount > 0 && (
                              <span className="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 flex-shrink-0">
                                <ClockIcon className="w-4 h-4"/>{pendingRevisionsCount} Menunggu Update
                              </span>
                            )}
                        </div>
                    </div>
                );
            })}

            {filtered.length === 0 && <div className="bg-public-surface p-6 rounded-2xl text-center widget-animate"><p className="text-public-text-secondary py-8">Tidak ada proyek pada kategori ini.</p></div>}
        </div>
    );
};

const PaymentsTab: React.FC<{freelancer: TeamMember, projects: Project[], teamProjectPayments: TeamProjectPayment[], teamPaymentRecords: TeamPaymentRecord[], onSlipView: (record: TeamPaymentRecord) => void}> = ({ freelancer, projects, teamProjectPayments, teamPaymentRecords, onSlipView }) => (
    <div className="bg-public-surface p-4 sm:p-6 rounded-2xl shadow-lg border border-public-border widget-animate">
        <h2 className="text-xl font-bold text-public-text-primary mb-4">Riwayat Pembayaran</h2>
        <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-public-bg"><tr><th className="p-3 text-left">Proyek</th><th className="p-3 text-left">Tanggal</th><th className="p-3 text-right">Fee</th><th className="p-3 text-center">Status & Aksi</th></tr></thead>
            <tbody className="divide-y divide-public-border">
                {teamProjectPayments.filter(p => p.teamMemberId === freelancer.id).map((p, index) => {
                    const isPaid = p.status === 'Paid';
                    const paymentRecord = isPaid ? teamPaymentRecords.find(rec => rec.projectPaymentIds.includes(p.id)) : null;
                    return (
                        <tr key={p.id} className="widget-animate" style={{ animationDelay: `${index * 50}ms`}}>
                            <td className="p-3 font-semibold text-public-text-primary">{projects.find(proj => proj.id === p.projectId)?.projectName || 'N/A'}</td>
                            <td className="p-3 text-public-text-secondary">{formatDate(p.date)}</td>
                            <td className="p-3 text-right font-medium text-public-text-primary">{formatDisplayCurrency(p.fee)}</td>
                            <td className="p-3 text-center space-x-2">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${p.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{p.status === 'Paid' ? 'Lunas' : 'Belum Lunas'}</span>
                                {paymentRecord && (
                                    <button onClick={() => onSlipView(paymentRecord)} className="text-xs font-semibold text-public-accent hover:underline">Lihat Slip</button>
                                )}
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </table></div>
    </div>
);

const PerformanceTab: React.FC<{freelancer: TeamMember}> = ({ freelancer }) => (
    <div className="space-y-6">
        <div className="bg-public-surface p-6 rounded-2xl shadow-lg border border-public-border text-center widget-animate" style={{ animationDelay: '100ms' }}>
            <h3 className="text-lg font-bold text-public-text-primary mb-2">Peringkat Kinerja</h3>
            <div className="flex justify-center items-center gap-2"><StarIcon className="w-8 h-8 text-yellow-400 fill-current" /><p className="text-3xl font-bold text-public-text-primary">{freelancer.rating.toFixed(1)} / 5.0</p></div>
        </div>
        <div className="bg-public-surface p-6 rounded-2xl shadow-lg border border-public-border widget-animate" style={{ animationDelay: '200ms' }}>
            <h3 className="text-xl font-bold text-public-text-primary mb-4">Catatan Kinerja dari Admin</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {freelancer.performanceNotes.map((note, index) => (<div key={note.id} className={`p-4 rounded-lg border-l-4 widget-animate ${note.type === PerformanceNoteType.PRAISE ? 'border-green-400 bg-green-500/5' : 'border-yellow-400 bg-yellow-500/5'}`} style={{ animationDelay: `${300 + index * 100}ms`}}>
                    <p className="text-sm text-public-text-primary italic">"{note.note}"</p>
                    <p className="text-right text-xs text-public-text-secondary mt-2">- {formatDate(note.date)}</p>
                </div>))}
                {freelancer.performanceNotes.length === 0 && <p className="text-center text-public-text-secondary py-8">Belum ada catatan kinerja.</p>}
            </div>
        </div>
    </div>
);

const SOPsTab: React.FC<{sops: SOP[], assignedProjects: Project[]}> = ({ sops, assignedProjects }) => {
    const [viewingSop, setViewingSop] = useState<SOP | null>(null);
    const relevantCategories = useMemo(() => new Set(assignedProjects.map(p => p.projectType)), [assignedProjects]);

    const relevantSops = sops.filter(sop => relevantCategories.has(sop.category));
    const otherSops = sops.filter(sop => !relevantCategories.has(sop.category));

    return (
        <div className="space-y-6">
            {relevantSops.length > 0 && (
                <div className="bg-public-surface p-4 sm:p-6 rounded-2xl shadow-lg border border-public-border widget-animate" style={{ animationDelay: '100ms' }}>
                    <h2 className="text-xl font-bold text-public-text-primary mb-4">SOP Relevan untuk Proyek Anda</h2>
                    <div className="space-y-3">
                        {relevantSops.map(sop => (
                            <div key={sop.id} onClick={() => setViewingSop(sop)} className="p-3 bg-public-bg rounded-lg flex justify-between items-center cursor-pointer hover:bg-public-bg/70">
                                <div className="flex items-center gap-3">
                                    <BookOpenIcon className="w-5 h-5 text-public-accent"/>
                                    <p className="font-semibold text-public-text-primary">{sop.title}</p>
                                </div>
                                <span className="text-xs font-medium bg-public-surface text-public-text-secondary px-2 py-1 rounded-full">{sop.category}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="bg-public-surface p-4 sm:p-6 rounded-2xl shadow-lg border border-public-border widget-animate" style={{ animationDelay: '200ms' }}>
                <h2 className="text-xl font-bold text-public-text-primary mb-4">Semua SOP</h2>
                 <div className="space-y-3">
                    {otherSops.map(sop => (
                        <div key={sop.id} onClick={() => setViewingSop(sop)} className="p-3 bg-public-bg rounded-lg flex justify-between items-center cursor-pointer hover:bg-public-bg/70">
                            <div className="flex items-center gap-3">
                                <BookOpenIcon className="w-5 h-5 text-public-accent"/>
                                <p className="font-semibold text-public-text-primary">{sop.title}</p>
                            </div>
                            <span className="text-xs font-medium bg-public-surface text-public-text-secondary px-2 py-1 rounded-full">{sop.category}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            <Modal isOpen={!!viewingSop} onClose={() => setViewingSop(null)} title={viewingSop?.title || ''} size="4xl">
                {viewingSop && (
                    <div className="prose prose-sm md:prose-base prose-invert max-w-none max-h-[70vh] overflow-y-auto" dangerouslySetInnerHTML={{ __html: viewingSop.content.replace(/\n/g, '<br />') }}>
                    </div>
                )}
            </Modal>
        </div>
    );
};

const ProjectDetailModal: React.FC<{project: Project, freelancer: TeamMember, onUpdateRevision: any, showNotification: any, onClose: any}> = ({ project, freelancer, onUpdateRevision, showNotification, onClose }) => {
     const [revisionUpdateForm, setRevisionUpdateForm] = useState<{ [revisionId: string]: { freelancerNotes: string; driveLink: string } }>({});
     const [displayRevisions, setDisplayRevisions] = useState<Revision[]>(project.revisions || []);

     useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const rows = await listRevisionsByProject(project.id);
                if (!cancelled) setDisplayRevisions(rows);
            } catch (e) {
                // Fallback to in-memory revisions if fetching fails
                if (!cancelled) setDisplayRevisions(project.revisions || []);
            }
        })();
        return () => { cancelled = true; };
    }, [project.id]);

    useEffect(() => {
        if (displayRevisions && displayRevisions.length >= 0) {
            const initialFormState = displayRevisions.reduce((acc, rev) => {
                acc[rev.id] = {
                    freelancerNotes: rev.freelancerNotes || '',
                    driveLink: rev.driveLink || '',
                };
                return acc;
            }, {} as typeof revisionUpdateForm);
            setRevisionUpdateForm(initialFormState);
        }
    }, [displayRevisions]);
    
    const handleShareRevisionLink = (revision: Revision) => {
        if (!project) return;
        const url = `${window.location.origin}${window.location.pathname}#/revision-form?projectId=${project.id}&freelancerId=${revision.freelancerId}&revisionId=${revision.id}`;
        navigator.clipboard.writeText(url).then(() => {
            showNotification('Tautan revisi berhasil disalin!');
        }, (err) => {
            showNotification('Gagal menyalin tautan.');
            console.error('Could not copy text: ', err);
        });
    };

     const handleRevisionFormChange = (revisionId: string, field: 'freelancerNotes' | 'driveLink', value: string) => {
        setRevisionUpdateForm(prev => ({ ...prev, [revisionId]: { ...(prev[revisionId] || {freelancerNotes: '', driveLink: ''}), [field]: value } }));
    };
    const handleRevisionSubmit = (revision: Revision) => {
        const formData = revisionUpdateForm[revision.id];
        if (!formData || !formData.driveLink) { alert('Harap isi tautan Google Drive hasil revisi.'); return; }
        onUpdateRevision(project.id, revision.id, { freelancerNotes: formData.freelancerNotes || '', driveLink: formData.driveLink || '', status: RevisionStatus.COMPLETED });
        showNotification('Update revisi telah berhasil dikirim!');
        onClose();
    };

    const assignmentDetails = project.team.find(t => t.memberId === freelancer.id);

    return (
        <div className="space-y-6">
            <div><h4 className="font-semibold text-gradient mb-2">Informasi Umum</h4><div className="text-sm space-y-2 p-3 bg-public-bg rounded-lg">
                {assignmentDetails && <p><strong>Peran Anda:</strong> {assignmentDetails.role} {assignmentDetails.subJob && <span className="text-public-text-secondary">({assignmentDetails.subJob})</span>}</p>}
                <p><strong>Klien:</strong> {project.clientName}</p>
                <p><strong>Lokasi:</strong> {project.location}</p>
                <p><strong>Waktu:</strong> {project.startTime || 'N/A'} - {project.endTime || 'N/A'}</p>
                <p><strong>Link Moodboard/Brief (Internal):</strong> {project.driveLink ? <a href={project.driveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Buka Tautan</a> : 'N/A'}</p>
                <p><strong>Link File dari Klien:</strong> {project.clientDriveLink ? <a href={project.clientDriveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Buka Tautan</a> : 'N/A'}</p>
                <p><strong>Link File Jadi (untuk Klien):</strong> {project.finalDriveLink ? <a href={project.finalDriveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Buka Tautan</a> : 'Belum tersedia'}</p>
                {project.notes && <p className="whitespace-pre-wrap mt-2 pt-2 border-t border-public-border"><strong>Catatan:</strong> {project.notes}</p>}
            </div></div>
            <div><h4 className="font-semibold text-gradient mb-2">Tugas Revisi Anda</h4><div className="space-y-3">
                {displayRevisions.filter(r => r.freelancerId === freelancer.id).map(rev => (<div key={rev.id} className="p-4 bg-public-bg rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                         <p className="text-xs text-public-text-secondary">Deadline: {formatDate(rev.deadline)}</p>
                         <button onClick={() => handleShareRevisionLink(rev)} className="text-xs font-semibold text-public-accent hover:underline inline-flex items-center gap-1">
                             <Share2Icon className="w-3 h-3"/> Bagikan Tautan Revisi
                         </button>
                    </div>
                    <p className="text-sm my-2 p-3 bg-public-surface rounded-md whitespace-pre-wrap"><strong>Catatan dari Admin:</strong><br/>{rev.adminNotes}</p>
                    {rev.status === RevisionStatus.COMPLETED ? (<div className="p-3 bg-green-500/10 rounded-md text-sm"><p className="font-semibold text-green-400">Revisi Selesai</p></div>) : (<form onSubmit={(e) => { e.preventDefault(); handleRevisionSubmit(rev); }} className="space-y-3 pt-3 border-t border-public-border">
                        <div className="input-group"><textarea onChange={e => handleRevisionFormChange(rev.id, 'freelancerNotes', e.target.value)} value={revisionUpdateForm[rev.id]?.freelancerNotes || ''} rows={2} className="input-field" placeholder=" "/><label className="input-label">Catatan Tambahan (Opsional)</label></div>
                        <div className="input-group"><input type="url" onChange={e => handleRevisionFormChange(rev.id, 'driveLink', e.target.value)} value={revisionUpdateForm[rev.id]?.driveLink || ''} className="input-field" placeholder=" " required /><label className="input-label">Tautan Google Drive Hasil Revisi</label></div>
                        <button type="submit" className="button-primary w-full">Tandai Selesai & Kirim</button>
                    </form>)}
                </div>))}
                {displayRevisions.filter(r => r.freelancerId === freelancer.id).length === 0 && <p className="text-sm text-center text-public-text-secondary py-4">Tidak ada tugas revisi untuk proyek ini.</p>}
            </div></div>
        </div>
    );
}

export default FreelancerPortal;