import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Client, Project, Package, AddOn, Transaction, Profile, Card, FinancialPocket, ClientStatus, PaymentStatus, TransactionType, PromoCode, Lead, LeadStatus, ContactChannel, ClientType, PublicBookingFormProps, BookingStatus, ViewType } from '../types';
import Modal from './Modal';
import { MessageSquareIcon } from '../constants';
import { createClient } from '../services/clients';
import { createProject } from '../services/projects';
import { createLead as createLeadRow, updateLead as updateLeadRow } from '../services/leads';
import { uploadDpProof } from '../services/storage';
import { createTransaction, updateCardBalance } from '../services/transactions';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

const initialFormState = {
    clientName: '',
    email: '',
    phone: '',
    instagram: '',
    projectType: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    packageId: '',
    selectedAddOnIds: [] as string[],
    promoCode: '',
    dp: '',
    dpPaymentRef: '', // Client adds this for reference
    transportCost: '',
};

const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});


const PublicBookingForm: React.FC<PublicBookingFormProps> = ({ 
    setClients, setProjects, packages, addOns, setTransactions, userProfile, cards, setCards, pockets, setPockets, promoCodes, setPromoCodes, showNotification, leads, setLeads, addNotification
}) => {
    const [formData, setFormData] = useState({...initialFormState, projectType: userProfile.projectTypes[0] || ''});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [promoFeedback, setPromoFeedback] = useState({ type: '', message: '' });
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);
    const [leadId, setLeadId] = useState<string | null>(null);

    useEffect(() => {
        const hash = window.location.hash;
        if (hash.includes('?')) {
            const urlParams = new URLSearchParams(hash.substring(hash.indexOf('?')));
            const id = urlParams.get('leadId');
            if (id) {
                setLeadId(id);
                const lead = leads.find(l => l.id === id);
                if (lead) {
                    setFormData(prev => ({
                        ...prev,
                        clientName: lead.name,
                        phone: lead.whatsapp || '',
                        location: lead.location,
                    }));
                }
            }
        }
    }, [leads]);

    const template = userProfile.publicPageConfig.template || 'classic';

    const formattedTerms = useMemo(() => {
        if (!userProfile.termsAndConditions) return null;
        return userProfile.termsAndConditions.split('\n').map((line, index) => {
            if (line.trim() === '') return <div key={index} className="h-4"></div>;
            const emojiRegex = /^(📜|📅|💰|📦|⏱|➕)\s/;
            if (emojiRegex.test(line)) {
                return <h3 key={index} className="text-lg font-semibold text-gradient mt-4 mb-2">{line}</h3>;
            }
            if (line.trim().startsWith('- ')) {
                 return <p key={index} className="ml-4 text-brand-text-primary">{line.trim().substring(2)}</p>;
            }
            return <p key={index} className="text-brand-text-primary">{line}</p>;
        });
    }, [userProfile.termsAndConditions]);


    const { totalBeforeDiscount, discountAmount, totalProject, discountText } = useMemo(() => {
        const selectedPackage = packages.find(p => p.id === formData.packageId);
        const packagePrice = selectedPackage?.price || 0;
        const addOnsPrice = addOns
            .filter(addon => formData.selectedAddOnIds.includes(addon.id))
            .reduce((sum, addon) => sum + addon.price, 0);
        
        const transportFee = Number(formData.transportCost) || 0;
        const totalBeforeDiscount = packagePrice + addOnsPrice;
        let discountAmount = 0;
        let discountText = '';

        const enteredPromoCode = formData.promoCode.toUpperCase().trim();
        if (enteredPromoCode) {
            const promoCode = promoCodes.find(p => p.code === enteredPromoCode && p.isActive);
            if (promoCode) {
                const isExpired = promoCode.expiryDate && new Date(promoCode.expiryDate) < new Date();
                const isMaxedOut = promoCode.maxUsage != null && promoCode.usageCount >= promoCode.maxUsage;

                if (!isExpired && !isMaxedOut) {
                    if (promoCode.discountType === 'percentage') {
                        discountAmount = (totalBeforeDiscount * promoCode.discountValue) / 100;
                        discountText = `${promoCode.discountValue}%`;
                    } else {
                        discountAmount = promoCode.discountValue;
                        discountText = formatCurrency(promoCode.discountValue);
                    }
                    setPromoFeedback({ type: 'success', message: `Kode promo diterapkan! Diskon ${discountText}.` });
                } else {
                    setPromoFeedback({ type: 'error', message: 'Kode promo tidak valid atau sudah habis.' });
                }
            } else {
                setPromoFeedback({ type: 'error', message: 'Kode promo tidak ditemukan.' });
            }
        } else {
             setPromoFeedback({ type: '', message: '' });
        }
        
        const totalProject = totalBeforeDiscount - discountAmount + transportFee;
        return { totalBeforeDiscount, discountAmount, totalProject, discountText };
    }, [formData.packageId, formData.selectedAddOnIds, formData.promoCode, formData.transportCost, packages, addOns, promoCodes]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { id, checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, selectedAddOnIds: checked ? [...prev.selectedAddOnIds, id] : prev.selectedAddOnIds.filter(addOnId => addOnId !== id) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                showNotification('Ukuran file tidak boleh melebihi 10MB.');
                e.target.value = ''; // Reset file input
                return;
            }
            setPaymentProof(file);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const dpAmount = Number(formData.dp) || 0;
        const selectedPackage = packages.find(p => p.id === formData.packageId);
        if (!selectedPackage) {
            alert('Silakan pilih paket.');
            setIsSubmitting(false);
            return;
        }

        const destinationCard = cards.find(c => c.id !== 'CARD_CASH') || cards[0];
        if (!destinationCard) {
            alert('Sistem pembayaran tidak dikonfigurasi. Hubungi vendor.');
            setIsSubmitting(false);
            return;
        }
        
        let promoCodeAppliedId: string | undefined;
        if (discountAmount > 0 && formData.promoCode) {
            const promoCode = promoCodes.find(p => p.code === formData.promoCode.toUpperCase().trim());
            if (promoCode) promoCodeAppliedId = promoCode.id;
        }

        let dpProofUrl = '';
        if (paymentProof) {
            try {
                // Upload ke Supabase Storage dan pakai URL-nya
                dpProofUrl = await uploadDpProof(paymentProof);
            } catch (error) {
                console.error("Error uploading DP proof:", error);
                showNotification("Gagal mengunggah bukti transfer. Silakan coba lagi.");
                setIsSubmitting(false);
                return;
            }
        }

        const selectedAddOns = addOns.filter(addon => formData.selectedAddOnIds.includes(addon.id));
        const remainingPayment = totalProject - dpAmount;
        const transportFee = Number(formData.transportCost) || 0;

        // Create client in Supabase
        const createdClient = await createClient({
            name: formData.clientName,
            email: formData.email,
            phone: formData.phone,
            instagram: formData.instagram || undefined,
            since: new Date().toISOString().split('T')[0],
            status: ClientStatus.ACTIVE,
            clientType: ClientType.DIRECT,
            lastContact: new Date().toISOString(),
            portalAccessId: crypto.randomUUID(),
        });

        // Create project in Supabase
        const createdProject = await createProject({
            projectName: `Acara ${formData.clientName} (${selectedPackage.name})`,
            clientName: createdClient.name,
            clientId: createdClient.id,
            projectType: formData.projectType,
            packageName: selectedPackage.name,
            date: formData.date,
            location: formData.location,
            status: 'Dikonfirmasi',
            bookingStatus: BookingStatus.BARU,
            totalCost: totalProject,
            amountPaid: dpAmount,
            paymentStatus: dpAmount > 0 ? (remainingPayment <= 0 ? PaymentStatus.LUNAS : PaymentStatus.DP_TERBAYAR) : PaymentStatus.BELUM_BAYAR,
            notes: `Referensi Pembayaran DP: ${formData.dpPaymentRef}`,
            promoCodeId: promoCodeAppliedId,
            discountAmount: discountAmount > 0 ? discountAmount : undefined,
            transportCost: transportFee > 0 ? transportFee : undefined,
            completedDigitalItems: [],
            dpProofUrl: dpProofUrl || undefined,
            addOns: selectedAddOns.map(a => ({ id: a.id, name: a.name, price: a.price })),
        });
        
        if (leadId) {
            try {
                const updatedLead = await updateLeadRow(leadId, { status: LeadStatus.CONVERTED, notes: `Dikonversi dari formulir booking. Klien ID: ${createdClient.id}` });
                setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));
            } catch {}
        } else {
            try {
                const createdLead = await createLeadRow({
                    name: createdClient.name,
                    contactChannel: ContactChannel.WEBSITE,
                    location: createdProject.location,
                    status: LeadStatus.CONVERTED,
                    date: new Date().toISOString(),
                    notes: `Dikonversi otomatis dari booking publik. Proyek: ${createdProject.projectName}. Klien ID: ${createdClient.id}`,
                    whatsapp: createdClient.phone,
                } as any);
                setLeads(prev => [createdLead, ...prev]);
            } catch {}
        }

        setClients(prev => [createdClient, ...prev]);
        // Tandai sebagai booking baru agar muncul di halaman Booking
        const createdProjectWithBooking: Project = { ...createdProject, bookingStatus: BookingStatus.BARU } as Project;
        setProjects(prev => [createdProjectWithBooking, ...prev]);

        if (promoCodeAppliedId) {
            setPromoCodes(prev => prev.map(p => p.id === promoCodeAppliedId ? { ...p, usageCount: p.usageCount + 1 } : p));
        }

        if (dpAmount > 0) {
            const today = new Date().toISOString().split('T')[0];
            try {
                const createdTx = await createTransaction({
                    date: today,
                    description: `DP Proyek ${createdProject.projectName}`,
                    amount: dpAmount,
                    type: TransactionType.INCOME,
                    projectId: createdProject.id,
                    category: 'DP Proyek',
                    method: 'Transfer Bank',
                    cardId: destinationCard.id,
                } as any);
                setTransactions(prev => [createdTx, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                try { await updateCardBalance(destinationCard.id, dpAmount); } catch {}
                setCards(prev => prev.map(c => c.id === destinationCard.id ? { ...c, balance: c.balance + dpAmount } : c));
            } catch (err) {
                console.error('Gagal mencatat transaksi DP ke Supabase:', err);
                // Tetap update lokal agar UI tidak macet
                const localTx: Transaction = {
                    id: `TRN-DP-${createdProject.id}`,
                    date: today,
                    description: `DP Proyek ${createdProject.projectName}`,
                    amount: dpAmount,
                    type: TransactionType.INCOME,
                    projectId: createdProject.id,
                    category: 'DP Proyek',
                    method: 'Transfer Bank',
                    cardId: destinationCard.id,
                };
                setTransactions(prev => [localTx, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                setCards(prev => prev.map(c => c.id === destinationCard.id ? { ...c, balance: c.balance + dpAmount } : c));
            }
        }

        setIsSubmitting(false);
        setIsSubmitted(true);
        
        addNotification({
            title: 'Booking Baru Diterima!',
            message: `Booking dari ${createdClient.name} untuk proyek "${createdProjectWithBooking.projectName}" menunggu konfirmasi Anda.`,
            icon: 'lead',
            link: { view: ViewType.BOOKING }
        });
    };
    
    const renderSampleContract = () => {
        const today = new Date().toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        return (
            <div className="printable-content bg-white text-black p-8 font-serif leading-relaxed text-sm max-h-[70vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-center mb-1">CONTOH SURAT PERJANJIAN KERJA SAMA</h2>
                <h3 className="text-lg font-bold text-center mb-6">JASA FOTOGRAFI & VIDEOGRAFI</h3>
                <p>Pada hari ini, {today}, telah dibuat dan disepakati perjanjian kerja sama antara:</p>

                <div className="my-4">
                    <p className="font-bold">PIHAK PERTAMA</p>
                    <table>
                        <tbody>
                            <tr><td className="pr-4 align-top">Nama</td><td>: {userProfile.authorizedSigner}</td></tr>
                            <tr><td className="pr-4 align-top">Jabatan</td><td>: Pemilik Usaha</td></tr>
                            <tr><td className="pr-4 align-top">Alamat</td><td>: {userProfile.address}</td></tr>
                            <tr><td className="pr-4 align-top">Nomor Telepon</td><td>: {userProfile.phone}</td></tr>
                        </tbody>
                    </table>
                    <p className="mt-1">Dalam hal ini bertindak atas nama perusahaannya, {userProfile.companyName}, selanjutnya disebut sebagai <strong>PIHAK PERTAMA</strong>.</p>
                </div>

                <div className="my-4">
                    <p className="font-bold">PIHAK KEDUA</p>
                     <table>
                        <tbody>
                            <tr><td className="pr-4 align-top">Nama</td><td>: [Nama Klien]</td></tr>
                            <tr><td className="pr-4 align-top">Alamat</td><td>: [Alamat Klien]</td></tr>
                            <tr><td className="pr-4 align-top">Nomor Telepon</td><td>: [Nomor Telepon Klien]</td></tr>
                        </tbody>
                    </table>
                    <p className="mt-1">Dalam hal ini bertindak atas nama pribadi, selanjutnya disebut sebagai <strong>PIHAK KEDUA</strong>.</p>
                </div>
                
                <p>Kedua belah pihak sepakat untuk mengikatkan diri dalam perjanjian ini dengan syarat dan ketentuan sebagai berikut:</p>

                <div className="space-y-4 mt-6">
                    <div><h4 className="font-bold text-center my-3">PASAL 1: DEFINISI</h4><p>Pekerjaan adalah jasa fotografi dan/atau videografi yang diberikan oleh PIHAK PERTAMA untuk acara PIHAK KEDUA. Hari Pelaksanaan adalah tanggal [Tanggal Acara]. Lokasi Pelaksanaan adalah [Lokasi Acara].</p></div>
                    <div><h4 className="font-bold text-center my-3">PASAL 2: RUANG LINGKUP PEKERJAAN</h4><p>PIHAK PERTAMA akan memberikan jasa sesuai dengan paket layanan yang dipilih oleh PIHAK KEDUA yang mencakup: Durasi pemotretan, Jumlah foto yang dijamin, Detail album cetak, Format file digital, dan item lainnya sesuai detail paket. PIHAK PERTAMA akan menyediakan jumlah personel yang sesuai. Penyerahan hasil akhir dilakukan maksimal [Waktu Pengerjaan] setelah acara.</p></div>
                    <div><h4 className="font-bold text-center my-3">PASAL 3: HAK DAN KEWAJIBAN PIHAK PERTAMA</h4><p>Hak: Menerima pembayaran sesuai kesepakatan; Menggunakan hasil foto untuk promosi/portofolio dengan persetujuan PIHAK KEDUA. Kewajiban: Melaksanakan pekerjaan secara profesional; Menyerahkan hasil tepat waktu; Menjaga privasi PIHAK KEDUA.</p></div>
                    <div><h4 className="font-bold text-center my-3">PASAL 4: HAK DAN KEWAJIBAN PIHAK KEDUA</h4><p>Hak: Menerima hasil pekerjaan sesuai paket; Meminta revisi minor jika ada kesalahan teknis. Kewajiban: Melakukan pembayaran sesuai jadwal; Memberikan informasi yang dibutuhkan; Menjamin akses kerja di lokasi.</p></div>
                    <div><h4 className="font-bold text-center my-3">PASAL 5: BIAYA DAN CARA PEMBAYARAN</h4><p>Total biaya jasa adalah sebesar [Total Biaya Paket]. Pembayaran dilakukan dengan sistem: Uang Muka (DP) sebesar 30-50% saat penandatanganan kontrak, dan pelunasan paling lambat H-3 sebelum Hari Pelaksanaan. Pembayaran ditransfer ke rekening: {userProfile.bankAccount}.</p></div>
                    <div><h4 className="font-bold text-center my-3">PASAL 6: PEMBATALAN</h4><p>Jika terjadi pembatalan oleh PIHAK KEDUA, maka Uang Muka (DP) yang telah dibayarkan tidak dapat dikembalikan (non-refundable). Ketentuan lebih lanjut diatur dalam Syarat & Ketentuan Umum.</p></div>
                    <div><h4 className="font-bold text-center my-3">PASAL 7: PENYELESAIAN SENGKETA</h4><p>Segala sengketa yang timbul akan diselesaikan secara musyawarah. Apabila tidak tercapai, maka akan diselesaikan secara hukum di wilayah hukum yang disepakati.</p></div>
                    <div><h4 className="font-bold text-center my-3">PASAL 8: PENUTUP</h4><p>Demikian surat perjanjian ini dibuat dalam 2 (dua) rangkap bermaterai cukup dan mempunyai kekuatan hukum yang sama, ditandatangani dengan penuh kesadaran oleh kedua belah pihak.</p></div>
                </div>

                 <div className="flex justify-between items-end mt-16">
                    <div className="text-center w-2/5">
                        <p>PIHAK PERTAMA</p>
                        <div className="h-28 my-1 flex flex-col items-center justify-center text-gray-400 text-xs">
                            <span className="italic">(Tanda Tangan & Nama)</span>
                        </div>
                        <p className="border-t-2 border-dotted w-4/5 mx-auto pt-1">({userProfile.authorizedSigner})</p>
                    </div>
                     <div className="text-center w-2/5">
                        <p>PIHAK KEDUA</p>
                        <div className="h-28 border-b-2 border-dotted w-4/5 mx-auto my-1 flex items-center justify-center text-gray-400 text-xs italic">(Tanda Tangan & Nama)</div>
                        <p>([Nama Klien])</p>
                    </div>
                </div>
                <p className="text-center text-xs text-gray-500 mt-12 italic">Ini adalah contoh. Kontrak asli akan disesuaikan dengan detail proyek dan paket yang Anda pilih.</p>
            </div>
        );
    };

    if (isSubmitted) {
        return (
             <div className="flex items-center justify-center min-h-screen p-4">
                <div className="w-full max-w-lg p-8 text-center bg-public-surface rounded-2xl shadow-lg border border-public-border">
                    <h1 className="text-2xl font-bold text-gradient">Terima Kasih!</h1>
                    <p className="mt-4 text-public-text-primary">Formulir pemesanan Anda telah berhasil kami terima. Tim kami akan segera menghubungi Anda untuk konfirmasi lebih lanjut.</p>
                    <a href="#" className="mt-6 button-primary inline-block">Kembali ke Beranda</a>
                </div>
            </div>
        );
    }
    
    const suggestedDp = totalProject * 0.3;

    return (
        <div className={`template-wrapper template-${template} min-h-screen p-4 sm:p-6 lg:p-8 flex items-center justify-center`}>
            <style>{`
                .template-wrapper { background-color: var(--public-bg); color: var(--public-text-primary); }
                .template-classic .form-container { max-width: 48rem; width: 100%; margin: auto; }
                .template-modern .form-container { max-width: 64rem; width: 100%; margin: auto; display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; align-items: start; }
                .template-gallery .form-container { max-width: 42rem; width: 100%; margin: auto; font-family: serif; }
                @media (max-width: 768px) { .template-modern .form-container { grid-template-columns: 1fr; } }
            `}</style>
            <div ref={formRef} className="form-container">
                {template === 'modern' && (
                    <div className="p-4 sm:p-6 md:p-8 bg-public-surface rounded-2xl border border-public-border hidden md:block">
                        {userProfile.logoBase64 ? <img src={userProfile.logoBase64} alt="logo" className="h-12 mb-4" /> : <h2 className="text-2xl font-bold text-gradient">{userProfile.companyName}</h2>}
                        <p className="text-public-text-secondary text-sm mt-4">{userProfile.bio}</p>
                    </div>
                )}
                 <div className="bg-public-surface p-4 sm:p-6 md:p-8 rounded-2xl shadow-lg border border-public-border">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gradient">{userProfile.companyName}</h1>
                        <p className="text-sm text-public-text-secondary mt-2">Formulir Pemesanan Layanan</p>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                             <div className="space-y-4">
                                <h4 className="text-base font-semibold text-gradient border-b border-public-border pb-2">Informasi Klien & Acara</h4>
                                <div className="input-group"><input type="text" id="clientName" name="clientName" value={formData.clientName} onChange={handleFormChange} className="input-field" placeholder=" " required/><label htmlFor="clientName" className="input-label">Nama Lengkap</label></div>
                                <div className="input-group"><input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleFormChange} className="input-field" placeholder=" " required/><label htmlFor="phone" className="input-label">Nomor Telepon (WhatsApp)</label></div>
                                <div className="input-group"><input type="email" id="email" name="email" value={formData.email} onChange={handleFormChange} className="input-field" placeholder=" " required/><label htmlFor="email" className="input-label">Email</label></div>
                                <div className="input-group"><input type="text" id="instagram" name="instagram" value={formData.instagram} onChange={handleFormChange} className="input-field" placeholder=" "/><label htmlFor="instagram" className="input-label">Instagram</label></div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="input-group"><select id="projectType" name="projectType" value={formData.projectType} onChange={handleFormChange} className="input-field" required><option value="" disabled>Pilih Jenis...</option>{userProfile.projectTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}</select><label htmlFor="projectType" className="input-label">Jenis Acara</label></div>
                                    <div className="input-group"><input type="date" id="date" name="date" value={formData.date} onChange={handleFormChange} className="input-field" placeholder=" "/><label htmlFor="date" className="input-label">Tanggal Acara</label></div>
                                </div>
                                <div className="input-group"><input type="text" id="location" name="location" value={formData.location} onChange={handleFormChange} className="input-field" placeholder=" "/><label htmlFor="location" className="input-label">Alamat Acara</label></div>
                             </div>

                             <div className="space-y-4">
                                <h4 className="text-base font-semibold text-gradient border-b border-public-border pb-2">Detail Paket & Pembayaran</h4>
                                <div className="input-group"><select id="packageId" name="packageId" value={formData.packageId} onChange={handleFormChange} className="input-field" required><option value="">Pilih paket...</option>{packages.map(p => <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>)}</select><label htmlFor="packageId" className="input-label">Paket</label></div>
                                <div className="input-group"><label className="input-label !static !-top-4 text-public-accent">Add-On Lainnya (Opsional)</label><div className="p-3 border border-public-border bg-public-bg rounded-lg max-h-32 overflow-y-auto space-y-2 mt-2">{addOns.map(addon => (<label key={addon.id} className="flex items-center justify-between p-2 rounded-md hover:bg-public-surface cursor-pointer"><span className="text-sm text-public-text-primary">{addon.name}</span><div className="flex items-center gap-4"><span className="text-sm text-public-text-secondary">{formatCurrency(addon.price)}</span><input type="checkbox" id={addon.id} name="addOns" checked={formData.selectedAddOnIds.includes(addon.id)} onChange={handleFormChange} /></div></label>))}</div></div>
                                
                                <div className="input-group">
                                    <input type="text" id="promoCode" name="promoCode" value={formData.promoCode} onChange={handleFormChange} className="input-field" placeholder=" " />
                                    <label htmlFor="promoCode" className="input-label">Kode Promo (Opsional)</label>
                                    {promoFeedback.message && <p className={`text-xs mt-1 ${promoFeedback.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>{promoFeedback.message}</p>}
                                </div>
                                <div className="input-group">
                                    <input type="number" id="transportCost" name="transportCost" value={formData.transportCost} onChange={handleFormChange} className="input-field" placeholder=" " />
                                    <label htmlFor="transportCost" className="input-label">Fee Transport (Opsional)</label>
                                </div>

                                <div className="p-4 bg-public-bg rounded-lg space-y-3">
                                    {discountAmount > 0 && (
                                        <>
                                        <div className="flex justify-between items-center text-sm"><span className="text-public-text-secondary">Subtotal</span><span className="text-public-text-primary">{formatCurrency(totalBeforeDiscount)}</span></div>
                                        <div className="flex justify-between items-center text-sm"><span className="text-public-text-secondary">Diskon ({discountText})</span><span className="text-green-500">-{formatCurrency(discountAmount)}</span></div>
                                        </>
                                    )}
                                     {Number(formData.transportCost) > 0 && (
                                        <div className="flex justify-between items-center text-sm"><span className="text-public-text-secondary">Fee Transport</span><span className="text-public-text-primary">{formatCurrency(Number(formData.transportCost) || 0)}</span></div>
                                    )}
                                    <div className="flex justify-between items-center font-bold text-lg"><span className="text-public-text-secondary">Total Biaya</span><span className="text-public-text-primary">{formatCurrency(totalProject)}</span></div>
                                    <hr className="border-public-border"/>
                                    <p className="text-sm text-public-text-secondary">Silakan transfer Uang Muka (DP) ke rekening berikut:</p>
                                    <p className="font-semibold text-public-text-primary text-center py-2 bg-public-surface rounded-md border border-public-border">{userProfile.bankAccount}</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="input-group !mt-2">
                                            <input type="number" name="dp" id="dp" value={formData.dp} onChange={handleFormChange} className="input-field text-right" placeholder=" "/>
                                            <label htmlFor="dp" className="input-label">Jumlah DP Ditransfer</label>
                                            <p className="text-xs text-public-text-secondary mt-1 text-right">Saran DP (30%): {formatCurrency(suggestedDp)}</p>
                                        </div>
                                        <div className="input-group !mt-2"><input type="text" name="dpPaymentRef" id="dpPaymentRef" value={formData.dpPaymentRef} onChange={handleFormChange} className="input-field" placeholder=" "/><label htmlFor="dpPaymentRef" className="input-label">No. Ref / 4 Digit Rek</label></div>
                                    </div>
                                     <div className="input-group !mt-2">
                                        <label htmlFor="dpPaymentProof" className="input-label !static !-top-4 text-public-accent">Bukti Transfer DP (Opsional)</label>
                                        <div className="mt-2 flex justify-center rounded-lg border border-dashed border-public-border px-6 py-10">
                                            <div className="text-center">
                                                <UploadIcon className="mx-auto h-12 w-12 text-public-text-secondary" />
                                                <div className="mt-4 flex text-sm leading-6 text-public-text-secondary">
                                                    <label htmlFor="dpPaymentProof" className="relative cursor-pointer rounded-md bg-public-surface font-semibold text-public-accent focus-within:outline-none focus-within:ring-2 focus-within:ring-public-accent focus-within:ring-offset-2 focus-within:ring-offset-public-bg hover:text-public-accent-hover">
                                                        <span>Unggah file</span>
                                                        <input id="dpPaymentProof" name="dpPaymentProof" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, image/jpg, application/pdf" />
                                                    </label>
                                                    <p className="pl-1">atau seret dan lepas</p>
                                                </div>
                                                <p className="text-xs leading-5 text-public-text-secondary">PNG, JPG, PDF hingga 10MB</p>
                                            </div>
                                        </div>
                                        {paymentProof && (
                                            <div className="mt-2 text-sm text-public-text-primary bg-public-bg p-2 rounded-md">
                                                File terpilih: <span className="font-semibold">{paymentProof.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                             </div>
                        </div>

                        <div className="pt-6">
                            <button type="submit" disabled={isSubmitting} className="w-full button-primary">{isSubmitting ? 'Mengirim...' : 'Kirim Formulir Pemesanan'}</button>
                        </div>
                    </form>
                    <div className="mt-6 flex justify-center items-center gap-4">
                        <button type="button" onClick={() => setIsTermsModalOpen(true)} className="text-xs font-semibold text-public-accent hover:underline">
                            Lihat Syarat & Ketentuan Umum
                        </button>
                        <span className="text-public-text-secondary text-xs">|</span>
                        <button type="button" onClick={() => setIsContractModalOpen(true)} className="text-xs font-semibold text-public-accent hover:underline">
                            Lihat Contoh Kontrak Kerja
                        </button>
                    </div>
                 </div>
            </div>
             <Modal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} title="Syarat & Ketentuan Umum">
                <div className="max-h-[70vh] overflow-y-auto pr-4">
                    {formattedTerms ? (
                        <div>{formattedTerms}</div>
                    ) : (
                        <p className="text-brand-text-secondary text-center py-8">Syarat dan ketentuan belum diatur oleh vendor.</p>
                    )}
                </div>
            </Modal>
            <Modal isOpen={isContractModalOpen} onClose={() => setIsContractModalOpen(false)} title="Contoh Kontrak Kerja" size="3xl">
                {renderSampleContract()}
            </Modal>
        </div>
    );
};

export default PublicBookingForm;