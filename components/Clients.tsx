import React, { useState, useMemo, useEffect } from 'react';
import { Client, Project, PaymentStatus, Package, AddOn, TransactionType, Profile, Transaction, ClientStatus, Card, FinancialPocket, Contract, ViewType, NavigationAction, ClientFeedback, SatisfactionLevel, PromoCode, ClientType, Notification } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import StatCard from './StatCard';
import SignaturePad from './SignaturePad';
import DonutChart from './DonutChart';
import PrintButton from './PrintButton';
import { EyeIcon, PencilIcon, Trash2Icon, FileTextIcon, PlusIcon, PrinterIcon, CreditCardIcon, Share2Icon, HistoryIcon, DollarSignIcon, FolderKanbanIcon, UsersIcon, TrendingUpIcon, AlertCircleIcon, LightbulbIcon, MessageSquareIcon, PhoneIncomingIcon, MapPinIcon, QrCodeIcon, StarIcon, TrendingDownIcon, ArrowDownIcon, ArrowUpIcon, DownloadIcon, WhatsappIcon } from '../constants';
import { cleanPhoneNumber } from '../constants';
import { createClient as createClientRow, updateClient as updateClientRow, deleteClient as deleteClientRow } from '../services/clients';
import { createProject as createProjectRow, updateProject as updateProjectRow, deleteProject as deleteProjectRow } from '../services/projects';
import { createTransaction as createTransactionRow, updateCardBalance } from '../services/transactions';
import { findCardIdByMeta } from '../services/cards';

const formatCurrency = (amount: number) => {
    // Ensure proper Indonesian currency formatting with correct decimal separator
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

const getPaymentStatusClass = (status: PaymentStatus | null) => {
    if (!status) return 'bg-gray-500/20 text-gray-400';
    switch (status) {
        case PaymentStatus.LUNAS: return 'bg-green-500/20 text-green-400';
        case PaymentStatus.DP_TERBAYAR: return 'bg-blue-500/20 text-blue-400';
        case PaymentStatus.BELUM_BAYAR: return 'bg-yellow-500/20 text-yellow-400';
        default: return 'bg-gray-500/20 text-gray-400';
    }
};

const initialFormState = {
    // Client fields
    clientId: '',
    clientName: '',
    email: '',
    phone: '',
    whatsapp: '',
    instagram: '',
    clientType: ClientType.DIRECT,
    // Project fields
    projectId: '', // Keep track of which project is being edited
    projectName: '',
    projectType: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    packageId: '',
    selectedAddOnIds: [] as string[],
    dp: '',
    dpDestinationCardId: '',
    notes: '',
    accommodation: '',
    driveLink: '',
    promoCodeId: '',
};

const downloadCSV = (headers: string[], data: (string | number)[][], filename: string) => {
    const csvRows = [
        headers.join(','),
        ...data.map(row => 
            row.map(field => {
                const str = String(field);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            }).join(',')
        )
    ];
    
    const csvString = csvRows.join('\n');
    // Add UTF-8 BOM so Excel (Windows) recognizes encoding
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


interface BillingChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
    projects: Project[];
    userProfile: Profile;
    showNotification: (message: string) => void;
}

const BillingChatModal: React.FC<BillingChatModalProps> = ({ isOpen, onClose, client, projects, userProfile, showNotification }) => {
    const [message, setMessage] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('friendly_reminder');

    const BILLING_CHAT_TEMPLATES = [
        {
            id: 'friendly_reminder',
            title: 'Pengingat Ramah',
            template: 'Halo {clientName},\n\nSemoga sehat selalu. Kami ingin mengingatkan perihal sisa pembayaran untuk proyek Anda.\n\nBerikut rinciannya:\n{projectDetails}\n\nTotal Sisa Tagihan: *{totalDue}*\n\nAnda dapat melihat rincian invoice dan riwayat pembayaran melalui Portal Klien Anda di sini:\n{portalLink}\n\nPembayaran dapat dilakukan ke rekening berikut:\n{bankAccount}\n\nMohon konfirmasinya jika pembayaran telah dilakukan. Terima kasih!\n\nSalam,\nTim {companyName}'
        },
        {
            id: 'due_date_reminder',
            title: 'Pengingat Jatuh Tempo',
            template: 'Yth. Bapak/Ibu {clientName},\n\nMenurut catatan kami, sisa pembayaran proyek Anda akan jatuh tempo. Berikut adalah rincian tagihan Anda:\n\n{projectDetails}\n\nTotal Sisa Tagihan: *{totalDue}*\n\nUntuk melihat detail invoice, silakan akses Portal Klien Anda di tautan berikut:\n{portalLink}\n\nKami mohon kesediaan Anda untuk menyelesaikan pembayaran sebelum tanggal jatuh tempo untuk menghindari kendala. Pembayaran dapat ditransfer ke:\n{bankAccount}\n\nTerima kasih atas kerja samanya.\n\nHormat kami,\nTim {companyName}'
        }
    ];

    useEffect(() => {
        if (!client) return;

        const projectsWithBalance = projects.filter(p => p.clientId === client.id && (p.totalCost - p.amountPaid) > 0);
        if (projectsWithBalance.length === 0) return;

        const totalDue = projectsWithBalance.reduce((sum, p) => sum + (p.totalCost - p.amountPaid), 0);

        const projectDetails = projectsWithBalance.map(p => 
            `- Proyek: *${p.projectName}*\n  Sisa Tagihan: ${formatCurrency(p.totalCost - p.amountPaid)}`
        ).join('\n');
        
        const path = window.location.pathname.replace(/index\.html$/, '');
        const portalLink = `${window.location.origin}${path}#/portal/${client.portalAccessId}`;
        
        const template = BILLING_CHAT_TEMPLATES.find(t => t.id === selectedTemplateId)?.template || BILLING_CHAT_TEMPLATES[0].template;

        const processedMessage = template
            .replace('{clientName}', client.name)
            .replace('{projectDetails}', projectDetails)
            .replace('{totalDue}', formatCurrency(totalDue))
            .replace('{portalLink}', portalLink)
            .replace('{bankAccount}', userProfile.bankAccount || 'N/A')
            .replace(/{companyName}/g, userProfile.companyName || 'Tim Kami');
        
        setMessage(processedMessage);

    }, [client, projects, userProfile, selectedTemplateId]);

    const handleShareToWhatsApp = () => {
        if (!client || (!client.phone && !client.whatsapp)) {
            showNotification('Nomor telepon klien tidak tersedia.');
            return;
        }
        if (!message.trim()) {
            showNotification('Pesan tidak boleh kosong.');
            return;
        }
        const phoneNumber = cleanPhoneNumber(client.whatsapp || client.phone);
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        onClose();
    };

    if (!isOpen || !client) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Kirim Tagihan ke ${client.name}`} size="2xl">
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-semibold text-brand-text-secondary">Gunakan Template Pesan:</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {BILLING_CHAT_TEMPLATES.map(template => (
                            <button
                                key={template.id}
                                type="button"
                                onClick={() => setSelectedTemplateId(template.id)}
                                className={`button-secondary !text-xs !px-3 !py-1.5 ${selectedTemplateId === template.id ? '!bg-brand-accent !text-white !border-brand-accent' : ''}`}
                            >
                                {template.title}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="input-group">
                    <textarea value={message} onChange={e => setMessage(e.target.value)} rows={12} className="input-field"></textarea>
                    <label className="input-label">Isi Pesan</label>
                </div>
                <div className="flex justify-end items-center pt-4 border-t border-brand-border">
                    <button onClick={handleShareToWhatsApp} className="button-primary inline-flex items-center gap-2">
                        <WhatsappIcon className="w-5 h-5" /> Kirim via WhatsApp
                    </button>
                </div>
            </div>
        </Modal>
    );
};


interface ClientFormProps {
    formData: typeof initialFormState;
    handleFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    handleFormSubmit: (e: React.FormEvent) => void;
    handleCloseModal: () => void;
    packages: Package[];
    addOns: AddOn[];
    userProfile: Profile;
    modalMode: 'add' | 'edit';
    cards: Card[];
    promoCodes: PromoCode[];
}

const ClientForm: React.FC<ClientFormProps> = ({ formData, handleFormChange, handleFormSubmit, handleCloseModal, packages, addOns, userProfile, modalMode, cards, promoCodes }) => {
    
    const priceCalculations = useMemo(() => {
        const selectedPackage = packages.find(p => p.id === formData.packageId);
        const packagePrice = selectedPackage?.price || 0;

        const addOnsPrice = addOns
            .filter(addon => formData.selectedAddOnIds.includes(addon.id))
            .reduce((sum, addon) => sum + addon.price, 0);

        let totalProjectBeforeDiscount = packagePrice + addOnsPrice;
        let discountAmount = 0;
        let discountApplied = 'N/A';
        const promoCode = promoCodes.find(p => p.id === formData.promoCodeId);

        if (promoCode) {
            if (promoCode.discountType === 'percentage') {
                discountAmount = (totalProjectBeforeDiscount * promoCode.discountValue) / 100;
                discountApplied = `${promoCode.discountValue}%`;
            } else { // fixed
                discountAmount = promoCode.discountValue;
                discountApplied = formatCurrency(promoCode.discountValue);
            }
        }
        
        const totalProject = totalProjectBeforeDiscount - discountAmount;
        const remainingPayment = totalProject - Number(formData.dp);

        return { packagePrice, addOnsPrice, totalProject, remainingPayment, discountAmount, discountApplied };
    }, [formData.packageId, formData.selectedAddOnIds, formData.dp, formData.promoCodeId, packages, addOns, promoCodes]);
    
    return (
        <form onSubmit={handleFormSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                {/* Left Column: Client & Project Info */}
                <div className="space-y-4">
                    <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2">Informasi Klien</h4>
                    <div className="input-group"><input type="text" id="clientName" name="clientName" value={formData.clientName} onChange={handleFormChange} className="input-field" placeholder=" " required/><label htmlFor="clientName" className="input-label">Nama Klien</label></div>
                    <div className="input-group">
                        <select id="clientType" name="clientType" value={formData.clientType} onChange={handleFormChange} className="input-field" required>
                            {Object.values(ClientType).map(ct => <option key={ct} value={ct}>{ct}</option>)}
                        </select>
                        <label htmlFor="clientType" className="input-label">Jenis Klien</label>
                    </div>
                    <div className="input-group"><input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleFormChange} className="input-field" placeholder=" " required/><label htmlFor="phone" className="input-label">Nomor Telepon</label></div>
                    <div className="input-group"><input type="tel" id="whatsapp" name="whatsapp" value={formData.whatsapp || ''} onChange={handleFormChange} className="input-field" placeholder=" "/><label htmlFor="whatsapp" className="input-label">No. WhatsApp</label></div>
                    <div className="input-group"><input type="email" id="email" name="email" value={formData.email} onChange={handleFormChange} className="input-field" placeholder=" " required/><label htmlFor="email" className="input-label">Email</label></div>
                    <div className="input-group"><input type="text" id="instagram" name="instagram" value={formData.instagram} onChange={handleFormChange} className="input-field" placeholder=" "/><label htmlFor="instagram" className="input-label">Instagram (@username)</label></div>
                    
                    <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2 pt-4">Informasi Proyek</h4>
                    <div className="input-group"><input type="text" id="projectName" name="projectName" value={formData.projectName} onChange={handleFormChange} className="input-field" placeholder=" " required/><label htmlFor="projectName" className="input-label">Nama Proyek</label></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="input-group"><select id="projectType" name="projectType" value={formData.projectType} onChange={handleFormChange} className="input-field" required><option value="" disabled>Pilih Jenis...</option>{userProfile.projectTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}</select><label htmlFor="projectType" className="input-label">Jenis Proyek</label></div>
                        <div className="input-group"><input type="date" id="date" name="date" value={formData.date} onChange={handleFormChange} className="input-field" placeholder=" "/><label htmlFor="date" className="input-label">Tanggal Acara</label></div>
                    </div>
                    <div className="input-group"><input type="text" id="location" name="location" value={formData.location} onChange={handleFormChange} className="input-field" placeholder=" "/><label htmlFor="location" className="input-label">Lokasi</label></div>
                </div>

                {/* Right Column: Financial & Other Info */}
                <div className="space-y-4">
                    <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2">Detail Paket & Pembayaran</h4>
                    <div className="input-group">
                        <select id="packageId" name="packageId" value={formData.packageId} onChange={handleFormChange} className="input-field" required>
                            <option value="">Pilih paket...</option>
                            {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <label htmlFor="packageId" className="input-label">Paket</label>
                        <p className="text-right text-xs text-brand-text-secondary mt-1">Harga Paket: {formatCurrency(priceCalculations.packagePrice)}</p>
                    </div>
                    
                    <div className="input-group">
                        <label className="input-label !static !-top-4 !text-brand-accent">Add-On</label>
                        <div className="p-3 border border-brand-border bg-brand-bg rounded-lg max-h-32 overflow-y-auto space-y-2 mt-2">
                            {addOns.map(addon => (
                                <label key={addon.id} className="flex items-center justify-between p-2 rounded-md hover:bg-brand-input cursor-pointer">
                                    <span className="text-sm text-brand-text-primary">{addon.name}</span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm text-brand-text-secondary">{formatCurrency(addon.price)}</span>
                                        <input type="checkbox" id={addon.id} name="addOns" checked={formData.selectedAddOnIds.includes(addon.id)} onChange={handleFormChange} />
                                    </div>
                                </label>
                            ))}
                        </div>
                        <p className="text-right text-xs text-brand-text-secondary mt-1">Total Harga Add-On: {formatCurrency(priceCalculations.addOnsPrice)}</p>
                    </div>

                    <div className="input-group">
                        <select id="promoCodeId" name="promoCodeId" value={formData.promoCodeId} onChange={handleFormChange} className="input-field">
                            <option value="">Tanpa Kode Promo</option>
                            {promoCodes.filter(p => p.isActive).map(p => (
                                <option key={p.id} value={p.id}>{p.code} - ({p.discountType === 'percentage' ? `${p.discountValue}%` : formatCurrency(p.discountValue)})</option>
                            ))}
                        </select>
                        <label htmlFor="promoCodeId" className="input-label">Kode Promo</label>
                        {formData.promoCodeId && <p className="text-right text-xs text-brand-success mt-1">Diskon Diterapkan: {priceCalculations.discountApplied}</p>}
                    </div>

                    <div className="p-4 bg-brand-bg rounded-lg space-y-3">
                        <div className="flex justify-between items-center font-bold text-lg"><span className="text-brand-text-secondary">Total Proyek</span><span className="text-brand-text-light">{formatCurrency(priceCalculations.totalProject)}</span></div>
                        <div className="input-group !mt-2">
                            <input type="number" name="dp" id="dp" value={formData.dp} onChange={handleFormChange} className="input-field text-right" placeholder=" "/>
                             <label htmlFor="dp" className="input-label">Uang DP</label>
                        </div>
                        {Number(formData.dp) > 0 && (
                            <div className="input-group !mt-2">
                                <select name="dpDestinationCardId" value={formData.dpDestinationCardId} onChange={handleFormChange} className="input-field" required>
                                    <option value="">Setor DP ke...</option>
                                    {cards.map(c => <option key={c.id} value={c.id}>{c.bankName} {c.lastFourDigits !== 'CASH' ? `**** ${c.lastFourDigits}` : '(Tunai)'}</option>)}
                                </select>
                                <label htmlFor="dpDestinationCardId" className="input-label">Kartu Tujuan</label>
                            </div>
                        )}
                        <hr className="border-brand-border"/>
                        <div className="flex justify-between items-center font-bold text-lg"><span className="text-brand-text-secondary">Sisa Pembayaran</span><span className="text-blue-500">{formatCurrency(priceCalculations.remainingPayment)}</span></div>
                    </div>

                    <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2 pt-4">Lainnya (Opsional)</h4>
                    <div className="input-group"><textarea id="notes" name="notes" value={formData.notes} onChange={handleFormChange} className="input-field" placeholder=" "></textarea><label htmlFor="notes" className="input-label">Catatan Tambahan</label></div>
                </div>
            </div>

            <div className="flex justify-end items-center gap-3 pt-8 mt-8 border-t border-brand-border">
                <button type="button" onClick={handleCloseModal} className="button-secondary">Batal</button>
                <button type="submit" className="button-primary">{modalMode === 'add' ? 'Simpan Klien & Proyek' : 'Update Klien & Proyek'}</button>
            </div>
        </form>
    );
};

interface ClientDetailModalProps {
    client: Client | null;
    projects: Project[];
    transactions: Transaction[];
    contracts: Contract[];
    onClose: () => void;
    onEditClient: (client: Client) => void;
    onDeleteClient: (clientId: string) => void;
    onViewReceipt: (transaction: Transaction) => void;
    onViewInvoice: (project: Project) => void;
    handleNavigation: (view: ViewType, action: NavigationAction) => void;
    onRecordPayment: (projectId: string, amount: number, destinationCardId: string) => void;
    cards: Card[];
    onSharePortal: (client: Client) => void;
    onDeleteProject: (projectId: string) => void;
}

const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ client, projects, transactions, contracts, onClose, onEditClient, onDeleteClient, onViewReceipt, onViewInvoice, handleNavigation, onRecordPayment, cards, onSharePortal, onDeleteProject }) => {
    const [activeTab, setActiveTab] = useState('info');
    const [newPayments, setNewPayments] = useState<{[key: string]: { amount: string, destinationCardId: string }}>({});

    if (!client) return null;
    
    const handleNewPaymentChange = (projectId: string, field: 'amount' | 'destinationCardId', value: string) => {
        const currentProjectPayment = newPayments[projectId] || { amount: '', destinationCardId: '' };
        setNewPayments(prev => ({
            ...prev,
            [projectId]: {
                ...currentProjectPayment,
                [field]: value,
            }
        }));
    };

    const handleNewPaymentSubmit = (projectId: string) => {
        const paymentData = newPayments[projectId];
        const project = clientProjects.find(p => p.id === projectId);
        if (paymentData && Number(paymentData.amount) > 0 && paymentData.destinationCardId && project) {
            const amount = Number(paymentData.amount);
            if(amount > (project.totalCost - project.amountPaid)) {
                alert('Jumlah pembayaran melebihi sisa tagihan.');
                return;
            }
            onRecordPayment(projectId, amount, paymentData.destinationCardId);
            setNewPayments(prev => ({ ...prev, [projectId]: { amount: '', destinationCardId: '' } }));
        } else {
            alert('Harap isi jumlah dan tujuan pembayaran dengan benar.');
        }
    };


    const clientProjects = projects.filter(p => p.clientId === client.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const clientTransactions = transactions.filter(t => clientProjects.some(p => p.id === t.projectId)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const totalProjects = clientProjects.length;
    const totalProjectValue = clientProjects.reduce((sum, p) => sum + p.totalCost, 0);
    const totalPaid = clientProjects.reduce((sum, p) => sum + p.amountPaid, 0);
    const totalDue = totalProjectValue - totalPaid;

    const InfoStatCard: React.FC<{icon: React.ReactNode, title: string, value: string}> = ({icon, title, value}) => (
        <div className="bg-brand-bg p-4 rounded-xl flex items-center gap-4 border border-brand-border shadow-sm">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-brand-surface">
                {icon}
            </div>
            <div>
                <p className="text-sm text-brand-text-secondary">{title}</p>
                <p className="text-lg font-bold text-brand-text-light">{value}</p>
            </div>
        </div>
    );

    const DetailRow: React.FC<{label: string, children: React.ReactNode}> = ({label, children}) => (
        <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-1 sm:gap-4 border-b border-brand-border">
            <dt className="text-sm text-brand-text-secondary">{label}</dt>
            <dd className="text-sm text-brand-text-light font-semibold">{children}</dd>
        </div>
    );

    return (
        <div>
            <div className="border-b border-brand-border">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    <button onClick={() => setActiveTab('info')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'info' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><UsersIcon className="w-5 h-5"/> Informasi Klien</button>
                    <button onClick={() => setActiveTab('payments')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'payments' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><HistoryIcon className="w-5 h-5"/> Riwayat Pembayaran</button>
                    <button onClick={() => setActiveTab('documents')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'documents' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><FileTextIcon className="w-5 h-5"/> Kontrak Kerja</button>
                </nav>
            </div>
            <div className="pt-5 max-h-[65vh] overflow-y-auto pr-2">
                {activeTab === 'info' && (
                     <div className="space-y-8">
                        <div>
                            <dl>
                                <DetailRow label="Nama Lengkap">{client.name}</DetailRow>
                                <DetailRow label="Jenis Klien">{client.clientType}</DetailRow>
                                <DetailRow label="Email">{client.email}</DetailRow>
                                <DetailRow label="Telepon"><a href={`https://wa.me/${cleanPhoneNumber(client.whatsapp || client.phone)}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{client.whatsapp || client.phone}</a></DetailRow>
                                <DetailRow label="No. WhatsApp"><a href={`https://wa.me/${cleanPhoneNumber(client.whatsapp || client.phone)}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{client.whatsapp || client.phone}</a></DetailRow>
                                <DetailRow label="Instagram">{client.instagram || '-'}</DetailRow>
                                <DetailRow label="Klien Sejak">{new Date(client.since).toLocaleDateString('id-ID')}</DetailRow>
                            </dl>
                            <button onClick={() => onSharePortal(client)} className="mt-5 button-secondary inline-flex items-center gap-2 text-sm"><Share2Icon className="w-4 h-4" /> Bagikan Portal Klien</button>
                        </div>
                        
                        <div>
                            <h4 className="text-base font-semibold text-brand-text-light mb-4">Ringkasan Keuangan Klien</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <InfoStatCard icon={<FolderKanbanIcon className="w-6 h-6 text-indigo-400"/>} title="Jumlah Proyek" value={totalProjects.toString()} />
                                <InfoStatCard icon={<DollarSignIcon className="w-6 h-6 text-blue-400"/>} title="Total Nilai Proyek" value={formatCurrency(totalProjectValue)} />
                                <InfoStatCard icon={<TrendingUpIcon className="w-6 h-6 text-green-400"/>} title="Total Telah Dibayar" value={formatCurrency(totalPaid)} />
                                <InfoStatCard icon={<TrendingDownIcon className="w-6 h-6 text-red-400"/>} title="Total Sisa Tagihan" value={formatCurrency(totalDue)} />
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'payments' && (
                     <div className="space-y-8">
                        {clientProjects.map(p => {
                            const transactionsForProject = clientTransactions.filter(t => t.projectId === p.id);
                            const remainingBalance = p.totalCost - p.amountPaid;
                            return (
                                <div key={p.id}>
                                    <h4 className="text-base font-semibold text-brand-text-light mb-2">Ringkasan Proyek & Invoice</h4>
                                    <div className="p-4 bg-brand-bg rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                        <div>
                                            <p className="font-semibold text-brand-text-light">{p.projectName}</p>
                                            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs mt-1">
                                                <span>Total: <span className="font-medium text-brand-text-primary">{formatCurrency(p.totalCost)}</span></span>
                                                <span>Terbayar: <span className="font-medium text-green-400">{formatCurrency(p.amountPaid)}</span></span>
                                                <span>Sisa: <span className="font-medium text-red-400">{formatCurrency(remainingBalance)}</span></span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
                                            {p.dpProofUrl && (
                                                <a href={p.dpProofUrl} target="_blank" rel="noopener noreferrer" className="button-secondary text-sm inline-flex items-center gap-2">
                                                    <CreditCardIcon className="w-4 h-4" /> Lihat Bukti DP
                                                </a>
                                            )}
                                            <button onClick={() => onViewInvoice(p)} className="button-secondary text-sm inline-flex items-center gap-2">
                                                <FileTextIcon className="w-4 h-4" /> Lihat Invoice
                                            </button>
                                            <button onClick={() => onDeleteProject(p.id)} className="button-secondary text-sm inline-flex items-center gap-2 !text-red-300 hover:!text-red-400">
                                                <Trash2Icon className="w-4 h-4" /> Hapus Proyek
                                            </button>
                                        </div>
                                    </div>

                                    <h4 className="text-base font-semibold text-brand-text-light mt-4 mb-2">Detail Transaksi Pembayaran</h4>
                                    <div className="border border-brand-border rounded-lg overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-brand-bg"><tr className="bg-brand-bg"><th className="p-3 text-left font-medium text-brand-text-secondary">Tanggal</th><th className="p-3 text-left font-medium text-brand-text-secondary">Deskripsi</th><th className="p-3 text-right font-medium text-brand-text-secondary">Jumlah</th><th className="p-3 text-center font-medium text-brand-text-secondary">Aksi</th></tr></thead>
                                            <tbody>
                                                {transactionsForProject.length > 0 ? transactionsForProject.map(t => (
                                                    <tr key={t.id} className="border-t border-brand-border"><td className="p-3">{new Date(t.date).toLocaleDateString('id-ID')}</td><td className="p-3">{t.description}</td><td className={`p-3 text-right font-semibold ${t.type === TransactionType.INCOME ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(t.amount)}</td><td className="p-3 text-center"><button onClick={() => onViewReceipt(t)} className="p-1 text-brand-text-secondary hover:text-brand-accent"><PrinterIcon className="w-5 h-5"/></button></td></tr>
                                                )) : (
                                                    <tr><td colSpan={4} className="text-center p-4 text-brand-text-secondary">Belum ada pembayaran untuk proyek ini.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {remainingBalance > 0 && (
                                        <>
                                            <h4 className="text-base font-semibold text-brand-text-light mt-4 mb-2">Catat Pembayaran Baru</h4>
                                            <div className="p-4 bg-brand-bg rounded-lg flex flex-col sm:flex-row items-center gap-4">
                                                <div className="input-group flex-grow w-full !mt-0">
                                                    <input type="number" id={`amount-${p.id}`} value={newPayments[p.id]?.amount || ''} onChange={(e) => handleNewPaymentChange(p.id, 'amount', e.target.value)} max={remainingBalance} className="input-field" placeholder=" "/>
                                                    <label htmlFor={`amount-${p.id}`} className="input-label">Jumlah Pembayaran (Maks: {formatCurrency(remainingBalance)})</label>
                                                </div>
                                                <div className="input-group w-full sm:w-64 !mt-0">
                                                     <select id={`dest-${p.id}`} value={newPayments[p.id]?.destinationCardId || ''} onChange={(e) => handleNewPaymentChange(p.id, 'destinationCardId', e.target.value)} className="input-field"><option value="">Pilih Tujuan...</option>{cards.map(c=><option key={c.id} value={c.id}>{c.bankName} {c.lastFourDigits !== 'CASH' ? `**** ${c.lastFourDigits}` : '(Tunai)'}</option>)}</select>
                                                     <label htmlFor={`dest-${p.id}`} className="input-label">Tujuan Pembayaran</label>
                                                </div>
                                                <button onClick={() => handleNewPaymentSubmit(p.id)} className="button-primary h-fit w-full sm:w-auto flex-shrink-0">CATAT</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
                {activeTab === 'documents' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-base font-semibold text-brand-text-light">Daftar Kontrak Kerja</h4>
                            <button 
                                onClick={() => handleNavigation(ViewType.CONTRACTS, { type: 'CREATE_CONTRACT_FOR_CLIENT', id: client.id })} 
                                className="button-primary inline-flex items-center gap-2 text-sm"
                            >
                                <PlusIcon className="w-4 h-4"/> BUAT KONTRAK BARU
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            {contracts.filter(c => c.clientId === client.id).length > 0 ? (
                                contracts.filter(c => c.clientId === client.id).map(contract => {
                                    const project = projects.find(p => p.id === contract.projectId);
                                    return (
                                        <div key={contract.id} className="p-4 bg-brand-bg rounded-lg flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-brand-text-light">{contract.contractNumber}</p>
                                                <p className="text-xs text-brand-text-secondary mt-1">Proyek: {project?.projectName || 'N/A'}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleNavigation(ViewType.CONTRACTS, { type: 'VIEW_CONTRACT', id: contract.id })}
                                                className="button-secondary text-sm"
                                            >
                                                Lihat Detail
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-center text-sm text-brand-text-secondary py-8">
                                    Belum ada kontrak untuk klien ini.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


interface ClientsProps {
    clients: Client[];
    setClients: React.Dispatch<React.SetStateAction<Client[]>>;
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    packages: Package[];
    addOns: AddOn[];
    transactions: Transaction[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    userProfile: Profile;
    showNotification: (message: string) => void;
    initialAction: NavigationAction | null;
    setInitialAction: (action: NavigationAction | null) => void;
    cards: Card[];
    setCards: React.Dispatch<React.SetStateAction<Card[]>>;
    pockets: FinancialPocket[];
    setPockets: React.Dispatch<React.SetStateAction<FinancialPocket[]>>;
    contracts: Contract[];
    handleNavigation: (view: ViewType, action: NavigationAction) => void;
    clientFeedback: ClientFeedback[];
    promoCodes: PromoCode[];
    setPromoCodes: React.Dispatch<React.SetStateAction<PromoCode[]>>;
    onSignInvoice: (projectId: string, signatureDataUrl: string) => void;
    onSignTransaction: (transactionId: string, signatureDataUrl: string) => void;
    onRecordPayment: (projectId: string, amount: number, destinationCardId: string) => Promise<void>;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
}

const NewClientsChart: React.FC<{ data: { name: string; count: number }[] }> = ({ data }) => {
    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg h-full border border-brand-border">
            <h3 className="font-bold text-lg text-gradient mb-6">Akusisi Klien Baru ({new Date().getFullYear()})</h3>
            <div className="h-48 flex justify-between items-end gap-2">
                {data.map(item => {
                    const height = Math.max((item.count / maxCount) * 100, 2);
                    return (
                        <div key={item.name} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                             <div className="absolute -top-6 text-xs bg-brand-accent text-white font-bold py-1 px-2 rounded-md mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{item.count} Klien</div>
                            <div
                                className="bg-brand-accent/50 w-full rounded-md transition-colors hover:bg-brand-accent"
                                style={{ height: `${height}%` }}
                            ></div>
                            <span className="text-xs text-brand-text-secondary mt-2">{item.name}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const Clients: React.FC<ClientsProps> = ({ clients, setClients, projects, setProjects, packages, addOns, transactions, setTransactions, userProfile, showNotification, initialAction, setInitialAction, cards, setCards, pockets, setPockets, contracts, handleNavigation, clientFeedback, promoCodes, setPromoCodes, onSignInvoice, onSignTransaction, addNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [formData, setFormData] = useState(initialFormState);
    
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [clientForDetail, setClientForDetail] = useState<Client | null>(null);
    const [billingChatModal, setBillingChatModal] = useState<Client | null>(null);

    const [documentToView, setDocumentToView] = useState<{ type: 'invoice', project: Project } | { type: 'receipt', transaction: Transaction } | null>(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [qrModalContent, setQrModalContent] = useState<{ title: string; url: string } | null>(null);
    
    // New state for filters and UI
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('Semua Status');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [activeSectionOpen, setActiveSectionOpen] = useState(true);
    const [inactiveSectionOpen, setInactiveSectionOpen] = useState(true);
    const [isBookingFormShareModalOpen, setIsBookingFormShareModalOpen] = useState(false);
    const [activeStatModal, setActiveStatModal] = useState<'active' | 'location' | 'receivables' | 'total' | null>(null);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    useEffect(() => {
        if (initialAction && initialAction.type === 'VIEW_CLIENT_DETAILS' && initialAction.id) {
            const clientToView = clients.find(c => c.id === initialAction.id);
            if (clientToView) {
                setClientForDetail(clientToView);
                setIsDetailModalOpen(true);
            }
            setInitialAction(null); // Reset action after handling
        }
    }, [initialAction, clients, setInitialAction]);
    
    const bookingFormUrl = useMemo(() => {
        const path = window.location.pathname.replace(/index\.html$/, '');
        return `${window.location.origin}${path}#/public-booking`;
    }, []);

    useEffect(() => {
        if (qrModalContent) {
            const qrCodeContainer = document.getElementById('client-portal-qrcode');
            if (qrCodeContainer && typeof (window as any).QRCode !== 'undefined') {
                qrCodeContainer.innerHTML = '';
                 new (window as any).QRCode(qrCodeContainer, {
                    text: qrModalContent.url,
                    width: 200,
                    height: 200,
                    colorDark: "#020617",
                    colorLight: "#ffffff",
                    correctLevel: 2 // H
                });
            }
        }
        
        if (isBookingFormShareModalOpen) {
            const qrCodeContainer = document.getElementById('clients-booking-form-qrcode');
            if (qrCodeContainer && typeof (window as any).QRCode !== 'undefined') {
                qrCodeContainer.innerHTML = '';
                new (window as any).QRCode(qrCodeContainer, {
                    text: bookingFormUrl,
                    width: 200,
                    height: 200,
                    colorDark: "#020617",
                    colorLight: "#ffffff",
                    correctLevel: 2 // H
                });
            }
        }
    }, [qrModalContent, isBookingFormShareModalOpen, bookingFormUrl]);

    const handleOpenQrModal = (client: Client) => {
        const path = window.location.pathname.replace(/index\.html$/, '');
        const url = `${window.location.origin}${path}#/portal/${client.portalAccessId}`;
        setQrModalContent({ title: `Portal QR Code untuk ${client.name}`, url });
    };

    const copyBookingLinkToClipboard = () => {
        navigator.clipboard.writeText(bookingFormUrl).then(() => {
            showNotification('Tautan formulir booking berhasil disalin!');
            setIsBookingFormShareModalOpen(false);
        });
    };
    
    const downloadBookingQrCode = () => {
        const canvas = document.querySelector('#clients-booking-form-qrcode canvas') as HTMLCanvasElement;
        if (canvas) {
            const link = document.createElement('a');
            link.download = 'form-booking-qr.png';
            link.href = canvas.toDataURL();
            link.click();
        }
    };

    const handleOpenModal = (mode: 'add' | 'edit', client?: Client, project?: Project) => {
        setModalMode(mode);
        if (mode === 'edit' && client && project) {
            setSelectedClient(client);
            setSelectedProject(project);
            setFormData({
                clientId: client.id,
                clientName: client.name,
                email: client.email,
                phone: client.phone,
                whatsapp: client.whatsapp || '',
                instagram: client.instagram || '',
                clientType: client.clientType,
                projectId: project.id,
                projectName: project.projectName,
                projectType: project.projectType,
                location: project.location,
                date: project.date,
                packageId: project.packageId,
                selectedAddOnIds: project.addOns.map(a => a.id),
                dp: '', // Not editing DP here, handle in payment
                dpDestinationCardId: '',
                notes: project.notes || '',
                accommodation: project.accommodation || '',
                driveLink: project.driveLink || '',
                promoCodeId: project.promoCodeId || '',
            });
        } else if (mode === 'add' && client) { // Adding new project for existing client
             setSelectedClient(client);
             setFormData({ ...initialFormState, clientId: client.id, clientName: client.name, email: client.email, phone: client.phone, whatsapp: client.whatsapp || '', instagram: client.instagram || '', clientType: client.clientType });
        } else { // Adding new client
            setSelectedClient(null);
            setSelectedProject(null);
            setFormData({...initialFormState, projectType: userProfile.projectTypes[0] || ''});
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setDocumentToView(null);
        setIsSignatureModalOpen(false);
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { id, checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, selectedAddOnIds: checked ? [...prev.selectedAddOnIds, id] : prev.selectedAddOnIds.filter(addOnId => addOnId !== id) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const allClientData = useMemo(() => {
        return clients.map(client => {
            const clientProjects = projects.filter(p => p.clientId === client.id);
            const totalValue = clientProjects.reduce((sum, p) => sum + p.totalCost, 0);
            const totalPaid = clientProjects.reduce((sum, p) => sum + p.amountPaid, 0);
            
            const mostRecentProject = clientProjects.length > 0
                ? [...clientProjects].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
                : null;
    
            return {
                ...client,
                projects: clientProjects,
                totalProyekValue: totalValue,
                balanceDue: totalValue - totalPaid,
                paketTerbaru: mostRecentProject ? `${mostRecentProject.packageName}${mostRecentProject.addOns.length > 0 ? ` + ${mostRecentProject.addOns.length} Add-on` : ''}` : 'Belum ada proyek',
                overallPaymentStatus: mostRecentProject ? mostRecentProject.paymentStatus : null,
                mostRecentProject: mostRecentProject,
            };
        });
    }, [clients, projects]);

    const clientsWithDues = useMemo(() => {
        return allClientData
            .filter(client => client.balanceDue > 0)
            .sort((a, b) => b.balanceDue - a.balanceDue);
    }, [allClientData]);

    const clientStats = useMemo(() => {
        const locationCounts = projects.reduce((acc, p) => {
            if (p.location) {
                const mainLocation = p.location.split(',')[0].trim();
                acc[mainLocation] = (acc[mainLocation] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const mostFrequentLocation = Object.keys(locationCounts).length > 0 
            ? Object.keys(locationCounts).reduce((a, b) => locationCounts[a] > locationCounts[b] ? a : b)
            : 'N/A';
        
        const totalReceivables = allClientData.reduce((sum, c) => sum + c.balanceDue, 0);

        return {
            activeClients: clients.filter(c => c.status === ClientStatus.ACTIVE).length,
            mostFrequentLocation,
            totalReceivables: formatCurrency(totalReceivables),
            totalClients: clients.length
        };
    }, [clients, projects, allClientData]);

    const filteredClientData = useMemo(() => {
        return allClientData.filter(client => {
            const searchMatch = searchTerm === '' ||
                client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.phone.toLowerCase().includes(searchTerm.toLowerCase());
    
            const statusMatch = statusFilter === 'Semua Status' || client.overallPaymentStatus === statusFilter;
    
            const from = dateFrom ? new Date(dateFrom) : null;
            const to = dateTo ? new Date(dateTo) : null;
            if (from) from.setHours(0, 0, 0, 0);
            if (to) to.setHours(23, 59, 59, 999);
            const dateMatch = (!from && !to) || client.projects.some(p => {
                const projectDate = new Date(p.date);
                return (!from || projectDate >= from) && (!to || projectDate <= to);
            });
    
            return searchMatch && statusMatch && dateMatch;
        });
    }, [allClientData, searchTerm, statusFilter, dateFrom, dateTo]);

    const clientStatusDonutData = useMemo(() => {
        const statusCounts = clients.reduce((acc, client) => {
            acc[client.status] = (acc[client.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    
        const statusColors: { [key in ClientStatus]?: string } = {
            [ClientStatus.ACTIVE]: '#10b981',
            [ClientStatus.INACTIVE]: '#64748b',
            [ClientStatus.LEAD]: '#3b82f6',
            [ClientStatus.LOST]: '#ef4444',
        };
        
        return Object.entries(statusCounts).map(([label, value]) => ({
            label,
            value,
            color: statusColors[label as ClientStatus] || '#9ca3af'
        }));
    }, [clients]);

    const newClientsChartData = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
        const data = months.map(month => ({ name: month, count: 0 }));
    
        clients.forEach(c => {
            const joinDate = new Date(c.since);
            if (joinDate.getFullYear() === currentYear) {
                const monthIndex = joinDate.getMonth();
                data[monthIndex].count += 1;
            }
        });
        return data;
    }, [clients]);
    
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const selectedPackage = packages.find(p => p.id === formData.packageId);
        if (!selectedPackage) {
            alert('Harap pilih paket layanan.');
            return;
        }

        const selectedAddOns = addOns.filter(addon => formData.selectedAddOnIds.includes(addon.id));
        const totalBeforeDiscount = selectedPackage.price + selectedAddOns.reduce((sum, addon) => sum + addon.price, 0);
        let finalDiscountAmount = 0;
        const promoCode = promoCodes.find(p => p.id === formData.promoCodeId);
        if (promoCode) {
            if (promoCode.discountType === 'percentage') {
                finalDiscountAmount = (totalBeforeDiscount * promoCode.discountValue) / 100;
            } else {
                finalDiscountAmount = promoCode.discountValue;
            }
        }
        const totalProject = totalBeforeDiscount - finalDiscountAmount;

        if (modalMode === 'add') {
             let clientId = selectedClient?.id;
             if (!selectedClient) { // New client
                try {
                    const created = await createClientRow({
                        name: formData.clientName,
                        email: formData.email,
                        phone: formData.phone,
                        whatsapp: formData.whatsapp || formData.phone,
                        instagram: formData.instagram || undefined,
                        clientType: formData.clientType,
                        since: new Date().toISOString().split('T')[0],
                        status: ClientStatus.ACTIVE,
                        lastContact: new Date().toISOString(),
                        portalAccessId: crypto.randomUUID(),
                    } as Omit<Client, 'id'>);
                    clientId = created.id;
                    setClients(prev => [created, ...prev]);
                } catch (err) {
                    alert('Gagal menyimpan klien ke database. Coba lagi.');
                    return;
                }
             }
             
            const dpAmount = Number(formData.dp) || 0;
            const remainingPayment = totalProject - dpAmount;

            // Create project in Supabase
            try {
                const createdProject = await createProjectRow({
                    projectName: formData.projectName,
                    clientName: formData.clientName,
                    clientId: clientId!,
                    projectType: formData.projectType,
                    packageName: selectedPackage.name,
                    date: formData.date,
                    location: formData.location,
                    status: 'Dikonfirmasi',
                    totalCost: totalProject,
                    amountPaid: dpAmount,
                    paymentStatus: dpAmount > 0 ? (remainingPayment <= 0 ? PaymentStatus.LUNAS : PaymentStatus.DP_TERBAYAR) : PaymentStatus.BELUM_BAYAR,
                    notes: formData.notes || undefined,
                    accommodation: formData.accommodation || undefined,
                    driveLink: formData.driveLink || undefined,
                    promoCodeId: formData.promoCodeId || undefined,
                    discountAmount: finalDiscountAmount > 0 ? finalDiscountAmount : undefined,
                    printingCost: undefined,
                    transportCost: undefined,
                    completedDigitalItems: [],
                    addOns: selectedAddOns.map(a => ({ id: a.id, name: a.name, price: a.price })),
                });
                // enrich with addOns in local state
                const mergedProject: Project = { ...createdProject, addOns: selectedAddOns };
                setProjects(prev => [mergedProject, ...prev]);

                // Create DP transaction (persist to Supabase) if any
                if (mergedProject.amountPaid > 0) {
                    // Resolve Supabase card UUID from local selection
                    const selectedCard = cards.find(c => c.id === formData.dpDestinationCardId);
                    const supaCardId = selectedCard
                      ? await findCardIdByMeta(selectedCard.bankName, selectedCard.lastFourDigits)
                      : null;
                    try {
                        const createdTx = await createTransactionRow({
                            date: new Date().toISOString().split('T')[0],
                            description: `DP Proyek ${mergedProject.projectName}`,
                            amount: mergedProject.amountPaid,
                            type: TransactionType.INCOME,
                            projectId: mergedProject.id,
                            category: 'DP Proyek',
                            method: 'Transfer Bank',
                            cardId: supaCardId || undefined,
                        } as Omit<Transaction, 'id' | 'vendorSignature'>);
                        setTransactions(prev => [...prev, createdTx].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                        if (supaCardId) {
                            await updateCardBalance(supaCardId, mergedProject.amountPaid);
                            if (formData.dpDestinationCardId) {
                                setCards(prev => prev.map(c => c.id === formData.dpDestinationCardId ? { ...c, balance: c.balance + mergedProject.amountPaid } : c));
                            }
                        }
                    } catch (err) {
                        console.warn('[Supabase] Gagal mencatat transaksi DP, gunakan fallback lokal.', err);
                        const newTransaction: Transaction = {
                            id: `TRN-DP-${mergedProject.id}`,
                            date: new Date().toISOString().split('T')[0],
                            description: `DP Proyek ${mergedProject.projectName}`,
                            amount: mergedProject.amountPaid,
                            type: TransactionType.INCOME,
                            projectId: mergedProject.id,
                            category: 'DP Proyek',
                            method: 'Transfer Bank',
                            cardId: formData.dpDestinationCardId,
                        };
                        setTransactions(prev => [...prev, newTransaction].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                        setCards(prev => prev.map(c => c.id === formData.dpDestinationCardId ? { ...c, balance: c.balance + mergedProject.amountPaid } : c));
                    }
                }
            } catch (err) {
                alert('Gagal membuat proyek di database. Coba lagi.');
                return;
            }

            // promo usage increment remains local for now
             if (promoCode) {
                setPromoCodes(prev => prev.map(p => p.id === promoCode.id ? { ...p, usageCount: p.usageCount + 1 } : p));
            }
            showNotification(`Klien ${formData.clientName} dan proyek baru berhasil ditambahkan.`);
            // Close modal and reset form after successful save
            handleCloseModal();
            setFormData(initialFormState);
            setSelectedClient(null);
            setSelectedProject(null);
        } else if (modalMode === 'edit') {
            if (!selectedClient || !selectedProject) {
                alert('Data klien/proyek tidak ditemukan untuk mode edit.');
                return;
            }

            // Update Client first (if any changes)
            try {
                const updatedClient = await updateClientRow(selectedClient.id, {
                    name: formData.clientName,
                    email: formData.email,
                    phone: formData.phone,
                    whatsapp: formData.whatsapp || undefined,
                    instagram: formData.instagram || undefined,
                    clientType: formData.clientType,
                    lastContact: new Date().toISOString(),
                });
                setClients(prev => prev.map(c => (c.id === updatedClient.id ? updatedClient : c)));
            } catch (err) {
                console.warn('Gagal update data klien:', err);
                alert('Gagal mengupdate data klien. Coba lagi.');
                return;
            }

            // Recalculate project totals and update project
            const selectedPackage = packages.find(p => p.id === formData.packageId);
            if (!selectedPackage) {
                alert('Harap pilih paket layanan.');
                return;
            }
            const selectedAddOns = addOns.filter(addon => formData.selectedAddOnIds.includes(addon.id));
            const totalBeforeDiscount = selectedPackage.price + selectedAddOns.reduce((sum, addon) => sum + addon.price, 0);
            let finalDiscountAmount = 0;
            const promoCode = promoCodes.find(p => p.id === formData.promoCodeId);
            if (promoCode) {
                if (promoCode.discountType === 'percentage') {
                    finalDiscountAmount = (totalBeforeDiscount * promoCode.discountValue) / 100;
                } else {
                    finalDiscountAmount = promoCode.discountValue;
                }
            }
            const totalProject = totalBeforeDiscount - finalDiscountAmount;

            const newAmountPaid = selectedProject.amountPaid; // DP tidak diedit di form ini
            let newPaymentStatus: PaymentStatus = PaymentStatus.BELUM_BAYAR;
            if (newAmountPaid <= 0) newPaymentStatus = PaymentStatus.BELUM_BAYAR;
            else if (newAmountPaid >= totalProject) newPaymentStatus = PaymentStatus.LUNAS;
            else newPaymentStatus = PaymentStatus.DP_TERBAYAR;

            try {
                const updatedProject = await updateProjectRow(selectedProject.id, {
                    projectName: formData.projectName,
                    clientName: formData.clientName,
                    clientId: selectedClient.id,
                    projectType: formData.projectType,
                    packageName: selectedPackage.name,
                    date: formData.date,
                    location: formData.location,
                    status: selectedProject.status,
                    totalCost: totalProject,
                    amountPaid: newAmountPaid,
                    paymentStatus: newPaymentStatus,
                    notes: formData.notes || undefined,
                    accommodation: formData.accommodation || undefined,
                    driveLink: formData.driveLink || undefined,
                    promoCodeId: formData.promoCodeId || undefined,
                    discountAmount: finalDiscountAmount > 0 ? finalDiscountAmount : undefined,
                    addOns: selectedAddOns.map(a => ({ id: a.id, name: a.name, price: a.price })),
                });

                // merge addOns into local state copy
                const merged: Project = { ...updatedProject, addOns: selectedAddOns } as Project;
                setProjects(prev => prev.map(p => (p.id === merged.id ? merged : p)));
            } catch (err) {
                console.warn('Gagal update proyek:', err);
                alert('Gagal mengupdate proyek. Coba lagi.');
                return;
            }

            showNotification(`Data klien dan proyek berhasil diperbarui.`);
            // Close and reset
            handleCloseModal();
            setFormData(initialFormState);
            setSelectedClient(null);
            setSelectedProject(null);
        }
    };

    const handleDownloadClients = () => {
        const headers = ['Nama', 'Email', 'Telepon', 'Status', 'Total Nilai Proyek', 'Sisa Tagihan', 'Paket Terbaru'];
        const data = filteredClientData.map(client => [
            `"${client.name.replace(/"/g, '""')}"`,
            client.email,
            client.phone,
            client.status,
            client.totalProyekValue,
            client.balanceDue,
            client.paketTerbaru
        ]);
        downloadCSV(headers, data, `data-klien-${new Date().toISOString().split('T')[0]}.csv`);
    };

    const handleDeleteClient = async (clientId: string) => {
        if (!window.confirm('Menghapus klien akan menghapus semua proyek dan transaksi terkait. Apakah Anda yakin?')) return;
        try {
            await deleteClientRow(clientId);
            setClients(prev => prev.filter(c => c.id !== clientId));
            const projectsToDelete = projects.filter(p => p.clientId === clientId).map(p => p.id);
            setProjects(prev => prev.filter(p => p.clientId !== clientId));
            setTransactions(prev => prev.filter(t => !projectsToDelete.includes(t.projectId || '')));
            setIsDetailModalOpen(false);
            showNotification('Klien berhasil dihapus.');
        } catch (err) {
            alert('Gagal menghapus klien di database. Coba lagi.');
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!window.confirm('Hapus proyek ini? Semua transaksi terkait akan tetap ada, tetapi tidak lagi terhubung ke proyek. Lanjutkan?')) return;
        try {
            await deleteProjectRow(projectId);
            setProjects(prev => prev.filter(p => p.id !== projectId));
            setTransactions(prev => prev.map(t => (t.projectId === projectId ? { ...t, projectId: undefined } : t)));
            showNotification('Proyek berhasil dihapus.');
        } catch (err) {
            alert('Gagal menghapus proyek di database. Coba lagi.');
        }
    };

    // --- Record payment handler (persist to Supabase, then sync local state) ---
    const handleRecordPayment = async (projectId: string, amount: number, destinationCardId: string) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        try {
            const selectedCard = cards.find(c => c.id === destinationCardId);
            const supaCardId = selectedCard ? await findCardIdByMeta(selectedCard.bankName, selectedCard.lastFourDigits) : null;
            const createdTx = await createTransactionRow({
                date: new Date().toISOString().split('T')[0],
                description: `Pembayaran Proyek ${project.projectName}`,
                amount,
                type: TransactionType.INCOME,
                projectId: project.id,
                category: 'Pelunasan Proyek',
                method: 'Transfer Bank',
                cardId: supaCardId || undefined,
            } as Omit<Transaction, 'id' | 'vendorSignature'>);
            setTransactions(prev => [...prev, createdTx].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            if (supaCardId) {
                await updateCardBalance(supaCardId, amount);
                if (destinationCardId) {
                    setCards(prev => prev.map(c => c.id === destinationCardId ? { ...c, balance: c.balance + amount } : c));
                }
            }
        } catch (err) {
            console.warn('[Supabase] Gagal mencatat pembayaran, fallback lokal.', err);
            const newTransaction: Transaction = {
                id: `TRN-PAY-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                description: `Pembayaran Proyek ${project.projectName}`,
                amount,
                type: TransactionType.INCOME,
                projectId: project.id,
                category: 'Pelunasan Proyek',
                method: 'Transfer Bank',
                cardId: destinationCardId,
            };
            setTransactions(prev => [...prev, newTransaction].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setCards(prev => prev.map(c => c.id === destinationCardId ? { ...c, balance: c.balance + amount } : c));
        }

        // Persist updated amountPaid and paymentStatus to Supabase, then sync local state
        try {
            const currentProject = projects.find(p => p.id === project.id);
            if (currentProject) {
                const newAmountPaid = currentProject.amountPaid + amount;
                const remaining = currentProject.totalCost - newAmountPaid;
                const updated = await updateProjectRow(project.id, {
                    amountPaid: newAmountPaid,
                    paymentStatus: remaining <= 0 ? PaymentStatus.LUNAS : PaymentStatus.DP_TERBAYAR,
                });
                setProjects(prev => prev.map(p => (p.id === updated.id ? { ...p, amountPaid: updated.amountPaid, paymentStatus: updated.paymentStatus } : p)));
            }
        } catch (err) {
            // Fallback: update local state to keep UI responsive even if persistence fails
            setProjects(prev => prev.map(p => {
                if (p.id === project.id) {
                    const newAmountPaid = p.amountPaid + amount;
                    const remaining = p.totalCost - newAmountPaid;
                    return {
                        ...p,
                        amountPaid: newAmountPaid,
                        paymentStatus: remaining <= 0 ? PaymentStatus.LUNAS : PaymentStatus.DP_TERBAYAR
                    };
                }
                return p;
            }));
        }

        showNotification('Pembayaran berhasil dicatat.');
        addNotification({
            title: 'Pembayaran Diterima',
            message: `Pembayaran sebesar ${formatCurrency(amount)} untuk proyek "${project.projectName}" telah diterima.`,
            icon: 'payment',
            link: {
                view: ViewType.CLIENTS,
                action: { type: 'VIEW_CLIENT_DETAILS', id: project.clientId }
            }
        });
    };
    
    const handleSaveSignature = (signatureDataUrl: string) => {
        if (documentToView?.type === 'invoice' && documentToView.project) {
            onSignInvoice(documentToView.project.id, signatureDataUrl);
        } else if (documentToView?.type === 'receipt' && documentToView.transaction) {
            onSignTransaction(documentToView.transaction.id, signatureDataUrl);
        }
        setIsSignatureModalOpen(false);
    };

    const renderDocumentBody = () => {
        if (!documentToView || !clientForDetail) return null;
        const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
        
        if (documentToView.type === 'invoice') {
            const project = documentToView.project;
            const selectedPackage = packages.find(p => p.id === project.packageId);
            const subtotal = project.totalCost + (project.discountAmount || 0);
            const remaining = project.totalCost - project.amountPaid;

            // Original package name - no cleaning
            const originalPackageName = selectedPackage?.name || project.packageName;

            // Original add-on names - no cleaning, show all duplicates as they are
            const originalAddOns = project.addOns || [];

            // Generate proper invoice number
            const invoiceNumber = project.id ? `INV-${project.id.slice(-6)}` : 'INV-XXXXXX';

            return (
                <div id="invoice-content" className="p-1">
                    <div className="printable-content print-invoice bg-slate-50 font-sans text-slate-800 printable-area">
                        <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 shadow-lg">
                            <header className="flex justify-between items-start mb-12">
                                <div>
                                    {userProfile.logoBase64 ? (
                                        <img src={userProfile.logoBase64} alt="Company Logo" className="h-20 max-w-[200px] object-contain mb-4" />
                                    ) : (
                                        <h1 className="text-3xl font-extrabold text-slate-900">{userProfile.companyName}</h1>
                                    )}
                                    <p className="text-sm text-slate-500">{userProfile.address}</p>
                                    <p className="text-sm text-slate-500">{userProfile.phone} | {userProfile.email}</p>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-2xl font-bold uppercase text-slate-400 tracking-widest">Invoice</h2>
                                    <p className="text-sm text-slate-500 mt-1">No: <span className="font-semibold text-slate-700">{invoiceNumber}</span></p>
                                    <p className="text-sm text-slate-500">Tanggal: <span className="font-semibold text-slate-700">{new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span></p>
                                </div>
                            </header>

                            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 doc-header-grid">
                                <div className="bg-slate-50 p-6 rounded-xl"><h3 className="text-xs font-semibold uppercase text-slate-400 mb-2">Ditagihkan Kepada</h3><p className="font-bold text-slate-800 break-words">{clientForDetail.name}</p><p className="text-sm text-slate-600 break-words">{clientForDetail.email}</p><p className="text-sm text-slate-600 break-words">{clientForDetail.phone}</p></div>
                                <div className="bg-slate-50 p-6 rounded-xl"><h3 className="text-xs font-semibold uppercase text-slate-400 mb-2">Diterbitkan Oleh</h3><p className="font-bold text-slate-800 break-words">{userProfile.companyName}</p><p className="text-sm text-slate-600 break-words">{userProfile.email}</p><p className="text-sm text-slate-600 break-words">{userProfile.phone}</p></div>
                            </section>

                            <section className="mb-12">
                                <div className="bg-blue-600 text-white p-6 rounded-xl printable-bg-blue printable-text-white"><h3 className="text-xs font-semibold uppercase text-blue-200 mb-2">Sisa Tagihan</h3><p className="font-extrabold text-2xl lg:text-3xl tracking-tight break-all">{formatCurrency(remaining)}</p><p className="text-sm text-blue-200 mt-1">Jatuh Tempo: {new Date(project.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
                            </section>

                            <section><table className="w-full text-left responsive-table invoice-table">
                                <thead className="invoice-table-header">
                                    <tr className="border-b-2 border-slate-200">
                                        <th className="p-3 text-sm font-semibold uppercase text-slate-500 text-left" data-label="Deskripsi">Deskripsi</th>
                                        <th className="p-3 text-sm font-semibold uppercase text-slate-500 text-center min-w-[50px]" data-label="Jml">Jml</th>
                                        <th className="p-3 text-sm font-semibold uppercase text-slate-500 text-right min-w-[90px]" data-label="Harga">Harga Satuan</th>
                                        <th className="p-3 text-sm font-semibold uppercase text-slate-500 text-right min-w-[90px]" data-label="Total">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="invoice-table-body">
                                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                                        <td data-label="Deskripsi" className="p-3 align-top">
                                            <div className="invoice-item-description">
                                                <p className="font-semibold text-slate-800 text-sm leading-relaxed">{originalPackageName}</p>
                                                {selectedPackage?.digitalItems && selectedPackage.digitalItems.length > 0 && (
                                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                                        {selectedPackage.digitalItems.join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td data-label="Jml" className="p-3 text-center align-top">
                                            <span className="font-semibold text-slate-700">1</span>
                                        </td>
                                        <td data-label="Harga" className="p-3 text-right align-top">
                                            <span className="font-semibold text-slate-700 tabular-nums">
                                                {formatCurrency(selectedPackage?.price || 0)}
                                            </span>
                                        </td>
                                        <td data-label="Total" className="p-3 text-right align-top">
                                            <span className="font-bold text-slate-800 tabular-nums">
                                                {formatCurrency(selectedPackage?.price || 0)}
                                            </span>
                                        </td>
                                    </tr>
                                    {originalAddOns.filter(addon => addon.name && addon.name.trim()).map((addon, index) => (
                                        <tr key={addon.id || index} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td data-label="Deskripsi" className="p-3 align-top">
                                                <div className="invoice-item-description">
                                                    <p className="text-slate-600 text-sm leading-relaxed">
                                                        - {addon.name}
                                                    </p>
                                                </div>
                                            </td>
                                            <td data-label="Jml" className="p-3 text-center align-top">
                                                <span className="text-slate-600">1</span>
                                            </td>
                                            <td data-label="Harga" className="p-3 text-right align-top">
                                                <span className="text-slate-600 tabular-nums">
                                                    {formatCurrency(addon.price)}
                                                </span>
                                            </td>
                                            <td data-label="Total" className="p-3 text-right align-top">
                                                <span className="font-semibold text-slate-700 tabular-nums">
                                                    {formatCurrency(addon.price)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table></section>

                            <section className="mt-12 avoid-break totals-section">
                                <div className="flex flex-col-reverse sm:flex-row justify-between gap-8 doc-footer-flex">
                                    <div className="w-full sm:w-2/5 invoice-signature-section">
                                        <h4 className="font-semibold text-slate-600 mb-3">Tanda Tangan</h4>
                                        {project.invoiceSignature ? (
                                            <img src={project.invoiceSignature} alt="Tanda Tangan" className="h-20 mt-2 object-contain border-b border-slate-300" />
                                        ) : (
                                            <div className="h-20 mt-2 flex items-center justify-center text-xs text-slate-400 italic border border-dashed border-slate-300 rounded-lg">
                                                Belum Ditandatangani
                                            </div>
                                        )}
                                    </div>
                                    <div className="w-full sm:w-2/5 space-y-3 text-sm invoice-totals">
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-slate-500 font-medium">Subtotal</span>
                                            <span className="font-semibold text-slate-800 tabular-nums">
                                                {formatCurrency(subtotal)}
                                            </span>
                                        </div>
                                        {project.discountAmount && project.discountAmount > 0 && (
                                            <div className="flex justify-between items-center py-1">
                                                <span className="text-slate-500 font-medium">Diskon</span>
                                                <span className="font-semibold text-green-600 print-text-green tabular-nums">
                                                    -{formatCurrency(project.discountAmount)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-slate-500 font-medium">Telah Dibayar</span>
                                            <span className="font-semibold text-slate-800 tabular-nums">
                                                -{formatCurrency(project.amountPaid)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 mt-3 pt-3 border-t-2 border-slate-300">
                                            <span className="font-bold text-lg text-slate-900">Sisa Tagihan</span>
                                            <span className="font-bold text-lg text-slate-900 tabular-nums">
                                                {formatCurrency(remaining)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <footer className="mt-12 pt-8 border-t-2 border-slate-200 avoid-break signature-section">
                                {userProfile.termsAndConditions && (
                                    <div className="mb-8">
                                        <h4 className="font-semibold text-slate-600 mb-2">Syarat & Ketentuan</h4>
                                        <p className="text-xs text-slate-500 whitespace-pre-wrap">{userProfile.termsAndConditions.replace(/📜|💰|⏱|📦/g, '').replace(/\s*\*\*(.*?)\*\*\s*/g, '\n<strong>$1</strong>\n')}</p>
                                    </div>
                                )}
                                <p className="text-xs text-slate-500 text-center">Jika Anda memiliki pertanyaan, silakan hubungi kami di {userProfile.phone}</p>
                                <div className="w-full h-2 bg-blue-600 mt-6 rounded"></div>
                            </footer>
                        </div>
                    </div>
                </div>
            );
        } else if (documentToView.type === 'receipt') {
            const transaction = documentToView.transaction;
            const project = transaction.projectId ? projects.find(p => p.id === transaction.projectId) : null;
            return (
                <div id="receipt-content" className="p-1">
                     <div className="printable-content print-receipt bg-slate-50 font-sans text-slate-800 printable-area avoid-break">
                        <div className="max-w-md mx-auto bg-white p-8 shadow-lg rounded-xl">
                            <header className="text-center mb-8">
                                <h1 className="text-2xl font-bold text-slate-900">KWITANSI PEMBAYARAN</h1>
                                <p className="text-sm text-slate-500">{userProfile.companyName}</p>
                            </header>
                            <div className="p-4 bg-green-500/10 border border-green-200 rounded-lg text-center mb-8 printable-bg-green-light">
                                <p className="text-sm font-semibold text-green-700 print-text-green">PEMBAYARAN DITERIMA</p>
                                <p className="text-3xl font-bold text-green-800 print-text-green mt-1">{formatCurrency(transaction.amount)}</p>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-slate-500">No. Kwitansi</span><span className="font-semibold text-slate-700 font-mono">{transaction.id.slice(0,12)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Tanggal Bayar</span><span className="font-semibold text-slate-700">{formatDate(transaction.date)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Diterima dari</span><span className="font-semibold text-slate-700">{clientForDetail.name}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Metode</span><span className="font-semibold text-slate-700">{transaction.method}</span></div>
                            </div>
                            <div className="mt-6 pt-6 border-t border-slate-200">
                                <p className="text-sm text-slate-500">Untuk pembayaran:</p>
                                <p className="font-semibold text-slate-800 mt-1">{transaction.description}</p>
                                {project && (
                                    <div className="mt-2 text-xs text-slate-500">
                                        <p>Proyek: {project.projectName}</p>
                                        <p>Total Tagihan: {formatCurrency(project.totalCost)} | Sisa: {formatCurrency(project.totalCost - project.amountPaid)}</p>
                                    </div>
                                )}
                            </div>
                            <footer className="mt-12 flex justify-between items-end avoid-break signature-section">
                                <p className="text-xs text-slate-400">Terima kasih.</p>
                                <div className="text-center">
                                    {transaction.vendorSignature ? (
                                        <img src={transaction.vendorSignature} alt="Tanda Tangan" className="h-16 object-contain" />
                                    ) : (
                                        <div className="h-16 flex items-center justify-center text-xs text-slate-400 italic border-b border-dashed">Belum Ditandatangani</div>
                                    )}
                                    <p className="text-xs font-semibold text-slate-600 mt-1">({userProfile.authorizedSigner || userProfile.companyName})</p>
                                </div>
                            </footer>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };
    
    return (
        <div className="space-y-6">
            <PageHeader title="Manajemen Klien" subtitle="Kelola semua klien, proyek, dan pembayaran mereka.">
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsInfoModalOpen(true)} className="button-secondary">Pelajari Halaman Ini</button>
                    <button onClick={() => setIsBookingFormShareModalOpen(true)} className="button-secondary inline-flex items-center gap-2">
                        <Share2Icon className="w-4 h-4" /> Bagikan Form Booking
                    </button>
                    <button onClick={() => handleOpenModal('add')} className="button-primary inline-flex items-center gap-2">
                        <PlusIcon className="w-5 h-5"/> Tambah Klien & Proyek
                    </button>
                </div>
            </PageHeader>
    
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div onClick={() => setActiveStatModal('total')} className="cursor-pointer transition-transform duration-200 hover:scale-105">
                    <StatCard icon={<UsersIcon className="w-6 h-6"/>} title="Total Klien" value={clientStats.totalClients.toString()} />
                </div>
                <div onClick={() => setActiveStatModal('active')} className="cursor-pointer transition-transform duration-200 hover:scale-105">
                    <StatCard icon={<TrendingUpIcon className="w-6 h-6"/>} title="Klien Aktif" value={clientStats.activeClients.toString()} />
                </div>
                <div onClick={() => setActiveStatModal('receivables')} className="cursor-pointer transition-transform duration-200 hover:scale-105">
                    <StatCard icon={<AlertCircleIcon className="w-6 h-6"/>} title="Total Piutang" value={clientStats.totalReceivables} />
                </div>
                <div onClick={() => setActiveStatModal('location')} className="cursor-pointer transition-transform duration-200 hover:scale-105">
                    <StatCard icon={<MapPinIcon className="w-6 h-6"/>} title="Lokasi Teratas" value={clientStats.mostFrequentLocation} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
                <div className="lg:col-span-2 bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
                    <h3 className="font-bold text-lg text-gradient mb-4">Distribusi Status Klien</h3>
                    <DonutChart data={clientStatusDonutData} />
                </div>
                <div className="lg:col-span-3">
                    <NewClientsChart data={newClientsChartData} />
                </div>
            </div>

            <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                <div className="p-4 border-b border-brand-border">
                    <h3 className="font-semibold text-brand-text-light">Rekap Klien Belum Lunas ({clientsWithDues.length})</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-brand-text-secondary uppercase">
                            <tr>
                                <th className="px-6 py-4 font-medium tracking-wider">Klien</th>
                                <th className="px-6 py-4 font-medium tracking-wider">Bergabung Sejak</th>
                                <th className="px-6 py-4 font-medium tracking-wider text-right">Total Nilai Proyek</th>
                                <th className="px-6 py-4 font-medium tracking-wider text-right">Sisa Tagihan</th>
                                <th className="px-6 py-4 font-medium tracking-wider text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {clientsWithDues.map(client => (
                                <tr key={client.id} className="hover:bg-brand-bg transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-brand-text-light">{client.name}</p>
                                        <p className="text-xs text-brand-text-secondary">{client.email}</p>
                                    </td>
                                    <td className="px-6 py-4">{new Date(client.since).toLocaleDateString('id-ID')}</td>
                                    <td className="px-6 py-4 text-right">{formatCurrency(client.totalProyekValue)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-brand-danger">{formatCurrency(client.balanceDue)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => setBillingChatModal(client)}
                                            className="p-2 text-brand-text-secondary hover:text-brand-accent rounded-full hover:bg-brand-input"
                                            title="Tagih via WhatsApp"
                                        >
                                            <MessageSquareIcon className="w-5 h-5"/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {clientsWithDues.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-brand-text-secondary">
                                        Luar biasa! Semua klien sudah lunas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
    
            <div className="bg-brand-surface p-4 rounded-xl shadow-lg border border-brand-border flex flex-col md:flex-row justify-between items-center gap-4 mobile-filter-section">
                <div className="input-group flex-grow !mt-0 w-full md:w-auto">
                    <input type="search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2.5" placeholder=" " />
                    <label className="input-label">Cari klien (nama, email, telepon)...</label>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto search-filter-row">
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2.5 w-full" />
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2.5 w-full" />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2.5 w-full">
                        <option value="Semua Status">Semua Status</option>
                        {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={handleDownloadClients} className="button-secondary p-2.5 flex-shrink-0" title="Unduh data klien"><DownloadIcon className="w-5 h-5"/></button>
                </div>
            </div>
    
            <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                <div className="p-4 border-b border-brand-border">
                    <button onClick={() => setActiveSectionOpen(p => !p)} className="w-full flex justify-between items-center">
                        <h3 className="font-semibold text-brand-text-light">Klien Aktif ({filteredClientData.filter(c => c.status === ClientStatus.ACTIVE).length})</h3>
                        {activeSectionOpen ? <ArrowUpIcon className="w-5 h-5 text-brand-text-secondary"/> : <ArrowDownIcon className="w-5 h-5 text-brand-text-secondary"/>}
                    </button>
                </div>
                {activeSectionOpen && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-brand-text-secondary uppercase">
                                <tr>
                                    <th className="px-6 py-4 font-medium tracking-wider">Klien</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Total Nilai Proyek</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Sisa Tagihan</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Proyek Terbaru</th>
                                    <th className="px-6 py-4 font-medium tracking-wider text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border">
                                {filteredClientData.filter(c => c.status === ClientStatus.ACTIVE).map(client => (
                                    <tr key={client.id} className="hover:bg-brand-bg transition-colors">
                                        <td className="px-6 py-4"><p className="font-semibold text-brand-text-light">{client.name}</p><p className="text-xs text-brand-text-secondary">{client.email}</p></td>
                                        <td className="px-6 py-4 font-semibold">{formatCurrency(client.totalProyekValue)}</td>
                                        <td className="px-6 py-4 font-semibold text-red-400">{formatCurrency(client.balanceDue)}</td>
                                        <td className="px-6 py-4"><p>{client.mostRecentProject?.projectName || '-'}</p>{client.overallPaymentStatus && <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusClass(client.overallPaymentStatus)}`}>{client.overallPaymentStatus}</span>}</td>
                                        <td className="px-6 py-4"><div className="flex items-center justify-center space-x-1"><button onClick={() => { setClientForDetail(client); setIsDetailModalOpen(true); }} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Detail Klien"><EyeIcon className="w-5 h-5"/></button><button onClick={() => handleOpenModal('add', client)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Tambah Proyek Baru"><PlusIcon className="w-5 h-5"/></button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="p-4 border-t border-brand-border">
                    <button onClick={() => setInactiveSectionOpen(p => !p)} className="w-full flex justify-between items-center">
                        <h3 className="font-semibold text-brand-text-light">Klien Tidak Aktif / Prospek Hilang ({filteredClientData.filter(c => c.status !== ClientStatus.ACTIVE).length})</h3>
                        {inactiveSectionOpen ? <ArrowUpIcon className="w-5 h-5 text-brand-text-secondary"/> : <ArrowDownIcon className="w-5 h-5 text-brand-text-secondary"/>}
                    </button>
                </div>
                {inactiveSectionOpen && (
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-brand-text-secondary uppercase"><tr><th className="px-6 py-4 font-medium tracking-wider">Klien</th><th className="px-6 py-4 font-medium tracking-wider">Status</th><th className="px-6 py-4 font-medium tracking-wider">Kontak Terakhir</th><th className="px-6 py-4 font-medium tracking-wider text-center">Aksi</th></tr></thead>
                            <tbody className="divide-y divide-brand-border">
                                 {filteredClientData.filter(c => c.status !== ClientStatus.ACTIVE).map(client => (
                                    <tr key={client.id} className="hover:bg-brand-bg transition-colors opacity-70">
                                        <td className="px-6 py-4"><p className="font-semibold text-brand-text-light">{client.name}</p><p className="text-xs text-brand-text-secondary">{client.email}</p></td>
                                        <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300">{client.status}</span></td>
                                        <td className="px-6 py-4">{new Date(client.lastContact).toLocaleDateString('id-ID')}</td>
                                        <td className="px-6 py-4"><div className="flex items-center justify-center space-x-1"><button onClick={() => { setClientForDetail(client); setIsDetailModalOpen(true); }} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Detail Klien"><EyeIcon className="w-5 h-5"/></button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                )}
            </div>
    
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalMode === 'add' ? (selectedClient ? 'Tambah Proyek Baru' : 'Tambah Klien & Proyek Baru') : 'Edit Klien & Proyek'} size="4xl">
                <ClientForm formData={formData} handleFormChange={handleFormChange} handleFormSubmit={handleFormSubmit} handleCloseModal={handleCloseModal} packages={packages} addOns={addOns} userProfile={userProfile} modalMode={modalMode} cards={cards} promoCodes={promoCodes} />
            </Modal>
            
            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title={`Detail Klien: ${clientForDetail?.name}`} size="4xl">
                <ClientDetailModal client={clientForDetail} projects={projects} transactions={transactions} contracts={contracts} onClose={() => setIsDetailModalOpen(false)} onEditClient={(client) => handleOpenModal('edit', client, projects.find(p => p.clientId === client.id))} onDeleteClient={handleDeleteClient} onViewReceipt={(tx) => setDocumentToView({ type: 'receipt', transaction: tx })} onViewInvoice={(proj) => setDocumentToView({ type: 'invoice', project: proj })} handleNavigation={handleNavigation} onRecordPayment={handleRecordPayment} cards={cards} onSharePortal={handleOpenQrModal} onDeleteProject={handleDeleteProject} />
            </Modal>
    
            {/* Helper: open print in a new window to avoid fixed/transform print issues */}
            {(() => {
                // attach once per render scope
                (window as any).__venaPrintFull = (window as any).__venaPrintFull || ((docTitle?: string) => {
                    try {
                        const area = document.querySelector('.printable-area') as HTMLElement | null;
                        if (!area) { window.print(); return; }
                        const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
                            .map(el => (el as HTMLElement).outerHTML)
                            .join('\n');
                        const baseHref = `${window.location.origin}${window.location.pathname}`;
                        const title = docTitle || document.title;
                        const extraStyles = `
                            <link rel="preconnect" href="https://fonts.googleapis.com">
                            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                            <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                            <style>
                              @page { size: A4; margin: 10mm; }
                              html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'Manrope', sans-serif !important; }
                              .print-a4 { width: 210mm; margin: 0 auto; }
                              .fit-to-page { transform-origin: top left !important; }
                              .fit-to-page[data-fit-scale="true"] { transform: var(--fit-scale) !important; }
                            </style>
                          `;
                        const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title><base href="${baseHref}">${headStyles}${extraStyles}</head><body class="print-a4"><div class="printable-area"><div class="fit-to-page" id="fitWrapper">${area.innerHTML}</div></div><script>(function(){try{function mmToPx(mm){var el=document.createElement('div');el.style.width=mm+'mm';el.style.position='absolute';el.style.visibility='hidden';document.body.appendChild(el);var px=el.getBoundingClientRect().width;document.body.removeChild(el);return px;}var pageWidthMM=210,pageHeightMM=297;var marginTopMM=10,marginBottomMM=10,marginLeftMM=10,marginRightMM=10;var printableWidthPx=mmToPx(pageWidthMM - marginLeftMM - marginRightMM);var printableHeightPx=mmToPx(pageHeightMM - marginTopMM - marginBottomMM);var wrapper=document.getElementById('fitWrapper');if(wrapper){var rect=wrapper.getBoundingClientRect();var scaleX=printableWidthPx/rect.width;var scaleY=printableHeightPx/rect.height;var scale=Math.min(1,scaleX,scaleY);wrapper.setAttribute('data-fit-scale','true');document.documentElement.style.setProperty('--fit-scale','scale('+scale+')');}}catch(e){}})();</script></body></html>`;
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
                });
                return null;
            })()}

            <Modal isOpen={!!documentToView} onClose={() => setDocumentToView(null)} title={documentToView ? (documentToView.type === 'invoice' ? 'Invoice' : 'Tanda Terima') : ''} size="3xl">
                <div id="invoice" className="printable-area max-h-[70vh] overflow-y-auto">{renderDocumentBody()}</div>
                <div className="mt-6 text-right non-printable space-x-2 border-t border-brand-border pt-4">
                    {documentToView && !documentToView[documentToView.type === 'invoice' ? 'project' : 'transaction'].vendorSignature && (
                        <button type="button" onClick={() => setIsSignatureModalOpen(true)} className="button-secondary">Tanda Tangani</button>
                    )}
                    <PrintButton 
                      areaId="invoice"
                      label={"Cetak Penuh"}
                      title={documentToView ? (documentToView.type === 'invoice' ? `Invoice - ${documentToView.project?.projectName || ''}` : 'Tanda Terima') : 'Dokumen'}
                      directPrint={true}
                    />
                </div>
            </Modal>
    
            <Modal isOpen={isBookingFormShareModalOpen} onClose={() => setIsBookingFormShareModalOpen(false)} title="Bagikan Formulir Booking Publik" size="sm">
                <div className="text-center p-4">
                    <div id="clients-booking-form-qrcode" className="p-4 bg-white rounded-lg inline-block mx-auto"></div>
                    <p className="text-xs text-brand-text-secondary mt-4 break-all">{bookingFormUrl}</p>
                    <div className="flex items-center gap-2 mt-6">
                        <button onClick={copyBookingLinkToClipboard} className="button-secondary w-full">Salin Tautan</button>
                        <button onClick={downloadBookingQrCode} className="button-primary w-full">Unduh QR</button>
                    </div>
                </div>
            </Modal>
             {qrModalContent && (
                <Modal isOpen={!!qrModalContent} onClose={() => setQrModalContent(null)} title={qrModalContent.title} size="sm">
                    <div className="text-center p-4">
                        <div id="client-portal-qrcode" className="p-4 bg-white rounded-lg inline-block mx-auto"></div>
                        <p className="text-xs text-brand-text-secondary mt-4 break-all">{qrModalContent.url}</p>
                        <div className="flex items-center gap-2 mt-6">
                            <button onClick={() => { navigator.clipboard.writeText(qrModalContent.url); showNotification('Tautan berhasil disalin!'); }} className="button-secondary w-full">Salin Tautan</button>
                            <button onClick={() => {
                                const canvas = document.querySelector('#client-portal-qrcode canvas') as HTMLCanvasElement;
                                if (canvas) {
                                    const link = document.createElement('a');
                                    link.download = 'portal-qr-code.png';
                                    link.href = canvas.toDataURL();
                                    link.click();
                                }
                            }} className="button-primary w-full">Unduh QR</button>
                        </div>
                    </div>
                </Modal>
            )}
             <Modal isOpen={isSignatureModalOpen} onClose={() => setIsSignatureModalOpen(false)} title="Bubuhkan Tanda Tangan Anda">
                <SignaturePad onClose={() => setIsSignatureModalOpen(false)} onSave={handleSaveSignature} />
            </Modal>
             {billingChatModal && (
                <BillingChatModal
                    isOpen={!!billingChatModal}
                    onClose={() => setBillingChatModal(null)}
                    client={billingChatModal}
                    projects={projects}
                    userProfile={userProfile}
                    showNotification={showNotification}
                />
            )}
        </div>
    );
};

export default Clients;