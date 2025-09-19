import React, { useState, useMemo, useEffect } from 'react';
import { Lead, Client, Project, Package, ViewType, NavigationAction, Profile, BookingStatus } from '../types';
import PageHeader from './PageHeader';
import StatCard from './StatCard';
import Modal from './Modal';
import DonutChart from './DonutChart';
import { UsersIcon, DollarSignIcon, PackageIcon, Share2Icon, DownloadIcon, EyeIcon, MessageSquareIcon, CalendarIcon, CheckCircleIcon, QrCodeIcon, CheckIcon, BanIcon, LayoutGridIcon, ListIcon, MessageCircleIcon, WhatsappIcon } from '../constants';
import { cleanPhoneNumber, CHAT_TEMPLATES } from '../constants';
import { updateProject } from '../services/projects';
import { upsertProfile } from '../services/profile';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Format to dd/mm/yyyy
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
};


const bookingStatusConfig: Record<BookingStatus, { color: string; bgColor: string, icon: React.ReactNode }> = {
    [BookingStatus.BARU]: { color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: <MessageSquareIcon className="w-4 h-4" /> },
    [BookingStatus.TERKONFIRMASI]: { color: 'text-green-400', bgColor: 'bg-green-500/10', icon: <CheckCircleIcon className="w-4 h-4" /> },
    [BookingStatus.DITOLAK]: { color: 'text-red-400', bgColor: 'bg-red-500/10', icon: <BanIcon className="w-4 h-4" /> },
};

const BookingChart: React.FC<{ bookings: { lead: Lead; project: Project }[] }> = ({ bookings }) => {
    const [tooltip, setTooltip] = useState<{ x: number; y: number; data: { name: string; count: number; value: number } } | null>(null);

    const chartData = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
        const data = months.map(month => ({ name: month, count: 0, value: 0 }));

        bookings.forEach(booking => {
            const bookingDate = new Date(booking.lead.date);
            if (bookingDate.getFullYear() === currentYear) {
                const monthIndex = bookingDate.getMonth();
                data[monthIndex].count += 1;
                data[monthIndex].value += booking.project.totalCost;
            }
        });
        return data;
    }, [bookings]);

    const maxCount = Math.max(...chartData.map(d => d.count), 1);
    const maxValue = Math.max(...chartData.map(d => d.value), 1);

    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full">
            <h3 className="font-bold text-lg text-gradient mb-6">Grafik Booking Tahun Ini</h3>
            <div className="h-48 flex justify-between items-end gap-2 relative">
                {chartData.map((item, index) => {
                    const countHeight = Math.max((item.count / maxCount) * 100, 2);
                    const valueHeight = Math.max((item.value / maxValue) * 100, 2);
                    return (
                        <div
                            key={item.name}
                            className="flex-1 flex flex-col items-center justify-end h-full group relative"
                            onMouseEnter={() => setTooltip({ x: (index / chartData.length) * 100, y: 0, data: item })}
                            onMouseLeave={() => setTooltip(null)}
                        >
                            <div className="flex-1 flex items-end w-full justify-center gap-1">
                                <div className="bg-blue-500/30 w-1/2 rounded-md transition-colors hover:bg-blue-500" style={{ height: `${countHeight}%` }} title={`Jumlah: ${item.count}`}></div>
                                <div className="bg-green-500/30 w-1/2 rounded-md transition-colors hover:bg-green-500" style={{ height: `${valueHeight}%` }} title={`Nilai: ${formatCurrency(item.value)}`}></div>
                            </div>
                            <span className="text-xs text-brand-text-secondary mt-2">{item.name}</span>
                        </div>
                    );
                })}
                {tooltip && (
                    <div className="absolute -top-12 bg-brand-bg p-2 rounded-lg shadow-xl text-xs" style={{ left: `${tooltip.x}%` }}>
                        <p className="font-bold">{tooltip.data.name}</p>
                        <p>Jumlah: {tooltip.data.count}</p>
                        <p>Nilai: {formatCurrency(tooltip.data.value)}</p>
                    </div>
                )}
            </div>
            <div className="flex justify-center items-center gap-4 text-xs mt-4">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500/30 rounded-sm"></div> Jumlah Booking</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500/30 rounded-sm"></div> Nilai Booking</div>
            </div>
        </div>
    );
};


interface WhatsappTemplateModalProps {
    project: Project;
    client: Client;
    onClose: () => void;
    showNotification: (message: string) => void;
    userProfile: Profile;
    setProfile: React.Dispatch<React.SetStateAction<Profile>>;
}

const WhatsappTemplateModal: React.FC<WhatsappTemplateModalProps> = ({ project, client, onClose, showNotification, userProfile, setProfile }) => {
    const templates = (userProfile.chatTemplates && userProfile.chatTemplates.length > 0)
        ? userProfile.chatTemplates
        : CHAT_TEMPLATES;
    const [selectedTemplate, setSelectedTemplate] = useState(templates[0]?.id || '');
    const [customMessage, setCustomMessage] = useState('');

    useEffect(() => {
        const template = templates.find(t => t.id === selectedTemplate)?.template || '';
        const processedMessage = template
            .replace('{clientName}', client.name)
            .replace('{projectName}', project.projectName);
        setCustomMessage(processedMessage);
    }, [selectedTemplate, client, project, templates]);

    // Ensure selectedTemplate is always valid when templates list changes
    useEffect(() => {
        if (!templates.find(t => t.id === selectedTemplate)) {
            setSelectedTemplate(templates[0]?.id || '');
        }
    }, [templates]);

    const handleSelectTemplate = (templateId: string) => {
        setSelectedTemplate(templateId);
    };
    
    const handleShareToWhatsApp = () => {
        if (!client.phone) {
            showNotification('Nomor telepon klien tidak tersedia.');
            return;
        }
        const phoneNumber = cleanPhoneNumber(client.phone);
        const encodedMessage = encodeURIComponent(customMessage);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        onClose();
    };

    const handleSaveTemplate = async () => {
        const rawTemplate = customMessage
            .replace(new RegExp(client.name, 'g'), '{clientName}')
            .replace(new RegExp(project.projectName, 'g'), '{projectName}');

        // Update local state optimistically
        const baseTemplates = (userProfile.chatTemplates && userProfile.chatTemplates.length > 0)
            ? userProfile.chatTemplates
            : CHAT_TEMPLATES;
        const newTemplates = baseTemplates.map(t =>
            t.id === selectedTemplate ? { ...t, template: rawTemplate } : t
        );
        setProfile(prev => ({ ...prev, chatTemplates: newTemplates }));

        // Persist to Supabase profile
        try {
            const saved = await upsertProfile({ id: userProfile.id, chatTemplates: newTemplates });
            setProfile(saved);
            showNotification('Template berhasil disimpan!');
        } catch (err) {
            console.error('[Chat Template] Gagal menyimpan ke Supabase:', err);
            showNotification('Gagal menyimpan template ke server. Perubahan hanya tersimpan sementara.');
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Kirim Pesan ke ${client.name}`} size="2xl">
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-semibold text-brand-text-secondary">Gunakan Template Pesan:</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {templates.map(template => (
                            <button
                                key={template.id}
                                type="button"
                                onClick={() => handleSelectTemplate(template.id)}
                                className={`button-secondary !text-xs !px-3 !py-1.5 ${selectedTemplate === template.id ? '!bg-brand-accent !text-white !border-brand-accent' : ''}`}
                            >
                                {template.title}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="input-group">
                    <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)} rows={8} className="input-field"></textarea>
                    <label className="input-label">Isi Pesan</label>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-brand-border">
                    <button onClick={handleSaveTemplate} className="button-secondary">Simpan Template Ini</button>
                    <button onClick={handleShareToWhatsApp} className="button-primary inline-flex items-center gap-2">
                        <WhatsappIcon className="w-5 h-5" /> Kirim via WhatsApp
                    </button>
                </div>
            </div>
        </Modal>
    );
};


interface BookingProps {
    leads: Lead[];
    clients: Client[];
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    packages: Package[];
    userProfile: Profile;
    setProfile: React.Dispatch<React.SetStateAction<Profile>>;
    handleNavigation: (view: ViewType, action?: NavigationAction) => void;
    showNotification: (message: string) => void;
}

const Booking: React.FC<BookingProps> = ({ leads, clients, projects, setProjects, packages, userProfile, setProfile, handleNavigation, showNotification }) => {
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);
    const [whatsappTemplateModal, setWhatsappTemplateModal] = useState<{ project: Project, client: Client } | null>(null);
    const [activeStatModal, setActiveStatModal] = useState<string | null>(null);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const allBookings = useMemo(() => {
        return projects
            .filter(p => p.bookingStatus)
            .map(project => {
                const lead = leads.find(l => l.notes?.includes(project.clientId)) || {
                    id: `lead-fallback-${project.id}`,
                    name: project.clientName,
                    date: project.date, // Fallback to project date
                };
                return { lead: lead as Lead, project };
            })
            .sort((a, b) => new Date(b.lead.date).getTime() - new Date(a.lead.date).getTime());
    }, [projects, leads]);
    
    const newBookings = useMemo(() => allBookings.filter(b => b.project.bookingStatus === BookingStatus.BARU), [allBookings]);
    const confirmedBookings = useMemo(() => allBookings.filter(b => b.project.bookingStatus === BookingStatus.TERKONFIRMASI), [allBookings]);

    const filteredNewBookings = useMemo(() => {
        return newBookings.filter(booking => {
            const from = dateFrom ? new Date(dateFrom) : null;
            const to = dateTo ? new Date(dateTo) : null;
            if (from) from.setHours(0, 0, 0, 0);
            if (to) to.setHours(23, 59, 59, 999);
            const bookingDate = new Date(booking.lead.date);
            const dateMatch = (!from || bookingDate >= from) && (!to || bookingDate <= to);
            return dateMatch;
        });
    }, [newBookings, dateFrom, dateTo]);
    
    const publicBookingFormUrl = useMemo(() => {
        const vendorId = 'VEN001'; // Placeholder
        return `${window.location.origin}${window.location.pathname}#/public-booking/${vendorId}`;
    }, []);

    const packageDonutData = useMemo(() => {
        const packageCounts = allBookings.reduce((acc, booking) => {
            const name = booking.project.packageName || 'Unknown';
            acc[name] = (acc[name] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const colors = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ef4444'];
        return Object.entries(packageCounts)
            .map(([label, value], i) => ({
                label,
                value,
                color: colors[i % colors.length]
            }));
    }, [allBookings]);

    useEffect(() => {
        if (isShareModalOpen) {
            // Delay to allow modal to render
            setTimeout(() => {
                const qrCodeContainer = document.getElementById('booking-form-qrcode');
                if (qrCodeContainer && typeof (window as any).QRCode !== 'undefined') {
                    qrCodeContainer.innerHTML = '';
                    new (window as any).QRCode(qrCodeContainer, {
                        text: publicBookingFormUrl,
                        width: 200, height: 200, colorDark: "#020617", colorLight: "#ffffff",
                        correctLevel: 2 // H
                    });
                }
            }, 100);
        }
    }, [isShareModalOpen, publicBookingFormUrl]);

    const copyBookingLinkToClipboard = () => {
        navigator.clipboard.writeText(publicBookingFormUrl).then(() => {
            showNotification('Tautan formulir booking berhasil disalin!');
        });
    };

    const downloadBookingQrCode = () => {
        const canvas = document.querySelector('#booking-form-qrcode canvas') as HTMLCanvasElement;
        if (canvas) {
            const link = document.createElement('a');
            link.download = 'form-booking-qr.png';
            link.href = canvas.toDataURL();
            link.click();
        }
    };

    const mostPopularPackage = useMemo(() => {
        const counts = allBookings.reduce((acc, p) => { acc[p.project.packageName] = (acc[p.project.packageName] || 0) + 1; return acc; }, {} as Record<string, number>);
        return Object.keys(counts).sort((a,b) => counts[b] - counts[a])[0] || 'N/A';
    }, [allBookings]);

    const statModalData = useMemo(() => {
        if (!activeStatModal) return { title: '', bookings: [] };
        
        switch (activeStatModal) {
            case 'total':
                return { title: 'Semua Booking', bookings: allBookings };
            case 'value':
                return { title: 'Semua Booking (berdasarkan Nilai)', bookings: allBookings };
            case 'popular':
                return { title: `Booking untuk Paket: ${mostPopularPackage}`, bookings: allBookings.filter(b => b.project.packageName === mostPopularPackage) };
            case 'new':
                return { title: 'Booking Baru', bookings: newBookings };
            default:
                return { title: '', bookings: [] };
        }
    }, [activeStatModal, allBookings, newBookings, mostPopularPackage]);

    const handleStatusChange = async (projectId: string, newStatus: BookingStatus) => {
        const prevStatus = projects.find(p => p.id === projectId)?.bookingStatus;
        // Optimistic update
        setProjects(prev => prev.map(p => (p.id === projectId ? { ...p, bookingStatus: newStatus } : p)));
        try {
            await updateProject(projectId, { bookingStatus: newStatus });
            showNotification(`Booking berhasil ${newStatus === BookingStatus.TERKONFIRMASI ? 'dikonfirmasi' : 'ditolak'}.`);
        } catch (err) {
            console.warn('[Booking] Failed to persist booking status:', err);
            // Revert on failure
            setProjects(prev => prev.map(p => (p.id === projectId ? { ...p, bookingStatus: prevStatus } : p)));
            showNotification('Gagal menyimpan perubahan status booking. Silakan coba lagi.');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Daftar Booking" subtitle="Konfirmasi booking baru dan lihat riwayat booking yang sudah dikonfirmasi.">
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsInfoModalOpen(true)} className="button-secondary">Pelajari Halaman Ini</button>
                    <button onClick={() => setIsShareModalOpen(true)} className="button-secondary inline-flex items-center gap-2">
                        <Share2Icon className="w-4 h-4" /> Bagikan Form Booking
                    </button>
                </div>
            </PageHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div onClick={() => setActiveStatModal('total')} className="cursor-pointer transition-transform duration-200 hover:scale-105">
                    <StatCard icon={<UsersIcon className="w-6 h-6"/>} title="Total Booking" value={allBookings.length.toString()} />
                </div>
                <div onClick={() => setActiveStatModal('value')} className="cursor-pointer transition-transform duration-200 hover:scale-105">
                    <StatCard icon={<DollarSignIcon className="w-6 h-6"/>} title="Total Nilai Booking" value={formatCurrency(allBookings.reduce((sum, b) => sum + b.project.totalCost, 0))} />
                </div>
                <div onClick={() => setActiveStatModal('popular')} className="cursor-pointer transition-transform duration-200 hover:scale-105">
                    <StatCard icon={<PackageIcon className="w-6 h-6"/>} title="Paket Terpopuler" value={mostPopularPackage} />
                </div>
                <div onClick={() => setActiveStatModal('new')} className="cursor-pointer transition-transform duration-200 hover:scale-105">
                     <StatCard icon={<MessageSquareIcon className="w-6 h-6"/>} title="Booking Baru" value={newBookings.length.toString()} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    <BookingChart bookings={allBookings} />
                </div>
                <div className="lg:col-span-2 bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
                    <h3 className="font-bold text-lg text-gradient mb-4">Distribusi Paket</h3>
                    <DonutChart data={packageDonutData} />
                </div>
            </div>

            {/* Booking Baru Section */}
            <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                <div className="p-4 border-b border-brand-border">
                    <h3 className="font-semibold text-brand-text-light">Booking Baru Menunggu Konfirmasi ({newBookings.length})</h3>
                </div>
                <div className="p-4 flex items-center gap-4">
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2.5 w-full" placeholder="Dari Tanggal"/>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2.5 w-full" placeholder="Sampai Tanggal"/>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-brand-text-secondary uppercase">
                            <tr>
                                <th className="px-4 py-3">Tanggal Booking</th>
                                <th className="px-4 py-3">Nama Klien</th>
                                <th className="px-4 py-3">Nama Proyek</th>
                                <th className="px-4 py-3">Jenis Acara</th>
                                <th className="px-4 py-3">Lokasi</th>
                                <th className="px-4 py-3">Paket</th>
                                <th className="px-4 py-3 text-right">Total Biaya</th>
                                <th className="px-4 py-3 text-right">DP Dibayar</th>
                                <th className="px-4 py-3 text-center">Bukti Bayar</th>
                                <th className="px-4 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {filteredNewBookings.map(booking => (
                                <tr key={booking.project.id} className="hover:bg-brand-bg">
                                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(booking.lead.date)}</td>
                                    <td className="px-4 py-3 font-semibold text-brand-text-light">{booking.project.clientName}</td>
                                    <td className="px-4 py-3">{booking.project.projectName}</td>
                                    <td className="px-4 py-3">{booking.project.projectType}</td>
                                    <td className="px-4 py-3">{booking.project.location}</td>
                                    <td className="px-4 py-3">{booking.project.packageName}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(booking.project.totalCost)}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-green-400">{formatCurrency(booking.project.amountPaid)}</td>
                                    <td className="px-4 py-3 text-center">
                                        {booking.project.dpProofUrl ? (
                                            <button
                                                onClick={() => setViewingProofUrl(booking.project.dpProofUrl!)}
                                                className="button-secondary !text-xs !px-3 !py-1.5"
                                            >
                                                Lihat Bukti
                                            </button>
                                        ) : (
                                            <span className="text-brand-text-secondary">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                         <button
                                            onClick={() => handleStatusChange(booking.project.id, BookingStatus.TERKONFIRMASI)}
                                            className="button-primary !text-xs !px-3 !py-1.5"
                                        >
                                            Konfirmasi
                                        </button>
                                    </td>
                                </tr>
                            ))}
                             {filteredNewBookings.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="text-center py-8 text-brand-text-secondary">Tidak ada booking baru yang cocok dengan filter.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Riwayat Booking Section */}
            <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                <div className="p-4 border-b border-brand-border">
                    <h3 className="font-semibold text-brand-text-light">Riwayat Booking Dikonfirmasi ({confirmedBookings.length})</h3>
                </div>
                <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left">
                        <thead className="text-xs text-brand-text-secondary uppercase">
                            <tr>
                                <th className="px-4 py-3">Tanggal Booking</th>
                                <th className="px-4 py-3">Nama Klien</th>
                                <th className="px-4 py-3">Nama Proyek</th>
                                <th className="px-4 py-3">Jenis Acara</th>
                                <th className="px-4 py-3">Lokasi</th>
                                <th className="px-4 py-3">Paket</th>
                                <th className="px-4 py-3 text-right">Total Biaya</th>
                                <th className="px-4 py-3 text-right">DP Dibayar</th>
                                <th className="px-4 py-3 text-center">Bukti Bayar</th>
                                <th className="px-4 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {confirmedBookings.map(booking => {
                                const client = clients.find(c => c.id === booking.project.clientId);
                                return (
                                <tr key={booking.project.id} className="hover:bg-brand-bg">
                                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(booking.lead.date)}</td>
                                    <td className="px-4 py-3 font-semibold text-brand-text-light">{booking.project.clientName}</td>
                                    <td className="px-4 py-3">{booking.project.projectName}</td>
                                    <td className="px-4 py-3">{booking.project.projectType}</td>
                                    <td className="px-4 py-3">{booking.project.location}</td>
                                    <td className="px-4 py-3">{booking.project.packageName}</td>
                                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(booking.project.totalCost)}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-green-400">{formatCurrency(booking.project.amountPaid)}</td>
                                    <td className="px-4 py-3 text-center">
                                        {booking.project.dpProofUrl ? (
                                            <button
                                                onClick={() => setViewingProofUrl(booking.project.dpProofUrl!)}
                                                className="button-secondary !text-xs !px-3 !py-1.5"
                                            >
                                                Lihat Bukti
                                            </button>
                                        ) : (
                                            <span className="text-brand-text-secondary">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                         <div className="flex items-center justify-center gap-2">
                                            {client && (
                                                <button
                                                    onClick={() => setWhatsappTemplateModal({ project: booking.project, client })}
                                                    className="button-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
                                                    title="Kirim Pesan WhatsApp"
                                                >
                                                    <WhatsappIcon className="w-4 h-4"/> Chat & WA
                                                </button>
                                            )}
                                             <button
                                                onClick={() => handleNavigation(ViewType.CLIENTS, { type: 'VIEW_CLIENT_DETAILS', id: booking.project.clientId })}
                                                className="button-secondary text-xs px-3 py-1.5"
                                            >
                                                Lihat Detail
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                             {confirmedBookings.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="text-center py-8 text-brand-text-secondary">Belum ada booking yang dikonfirmasi.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
             <Modal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} title="Panduan Halaman Booking">
                <div className="space-y-4 text-sm text-brand-text-primary">
                    <p>Halaman ini adalah pusat kendali untuk semua booking yang masuk dari formulir publik.</p>
                    <ul className="list-disc list-inside space-y-2">
                        <li><strong>Statistik:</strong> Kartu di atas memberikan ringkasan cepat. Klik kartu untuk melihat detailnya.</li>
                        <li><strong>Grafik:</strong> Visualisasikan tren booking per bulan dan popularitas paket.</li>
                        <li><strong>Booking Baru:</strong> Tabel teratas berisi semua booking yang menunggu tindakan Anda. Verifikasi bukti bayar dan konfirmasi booking untuk memindahkannya ke riwayat.</li>
                        <li><strong>Riwayat Booking:</strong> Tabel bawah berisi semua booking yang sudah Anda konfirmasi. Dari sini, Anda bisa memulai komunikasi dengan klien atau melihat detail proyek lebih lanjut.</li>
                        <li><strong>Aksi Cepat:</strong> Gunakan tombol "Konfirmasi", "Chat & WA", dan "Lihat Detail" untuk alur kerja yang lebih cepat.</li>
                    </ul>
                </div>
            </Modal>

            <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Bagikan Formulir Booking Publik" size="sm">
                <div className="text-center p-4">
                    <div id="booking-form-qrcode" className="p-4 bg-white rounded-lg inline-block mx-auto"></div>
                    <p className="text-xs text-brand-text-secondary mt-4 break-all">{publicBookingFormUrl}</p>
                    <div className="flex items-center gap-2 mt-6">
                        <button onClick={copyBookingLinkToClipboard} className="button-secondary w-full">Salin Tautan</button>
                        <button onClick={downloadBookingQrCode} className="button-primary w-full inline-flex items-center justify-center gap-2">
                            <DownloadIcon className="w-4 h-4" /> Unduh QR
                        </button>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={!!activeStatModal} onClose={() => setActiveStatModal(null)} title={statModalData.title} size="2xl">
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    <div className="space-y-3">
                        {statModalData.bookings.length > 0 ? statModalData.bookings.map(booking => (
                            <div key={booking.project.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-brand-text-light">{booking.project.projectName}</p>
                                    <p className="text-sm text-brand-text-secondary">{booking.project.clientName}</p>
                                </div>
                                <span className="font-semibold text-brand-text-primary">{formatCurrency(booking.project.totalCost)}</span>
                            </div>
                        )) : <p className="text-center text-brand-text-secondary py-8">Tidak ada booking dalam kategori ini.</p>}
                    </div>
                </div>
            </Modal>

            {whatsappTemplateModal && (
                <WhatsappTemplateModal
                    project={whatsappTemplateModal.project}
                    client={whatsappTemplateModal.client}
                    onClose={() => setWhatsappTemplateModal(null)}
                    showNotification={showNotification}
                    userProfile={userProfile}
                    setProfile={setProfile}
                />
            )}
            <Modal isOpen={!!viewingProofUrl} onClose={() => setViewingProofUrl(null)} title="Bukti Pembayaran">
                {viewingProofUrl && (
                    <img src={viewingProofUrl} alt="Bukti Pembayaran Penuh" className="w-full h-auto rounded-lg" />
                )}
            </Modal>
        </div>
    );
};

export default Booking;