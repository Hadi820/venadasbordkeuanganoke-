import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Package, AddOn, Profile, Client, Project, Transaction, Lead, Notification, Card, ClientStatus, PaymentStatus, TransactionType, LeadStatus, ContactChannel, ClientType, BookingStatus, ViewType, PromoCode } from '../types';
import Modal from './Modal';
import { CheckIcon, CameraIcon, WhatsappIcon, cleanPhoneNumber } from '../constants';
import { listPackages } from '../services/packages';
import { listAddOns } from '../services/addOns';
import { getProfile } from '../services/profile';
import { createClient } from '../services/clients';
import { createProject } from '../services/projects';
import { createLead as createLeadRow } from '../services/leads';
import { uploadDpProof } from '../services/storage';
import { createTransaction, updateCardBalance } from '../services/transactions';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);

const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
);

interface PublicPackagesProps {
    userProfile: Profile;
    showNotification: (message: string) => void;
    setClients: React.Dispatch<React.SetStateAction<Client[]>>;
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    setCards: React.Dispatch<React.SetStateAction<Card[]>>;
    setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
    cards: Card[];
    projects: Project[];
    promoCodes: PromoCode[];
    setPromoCodes: React.Dispatch<React.SetStateAction<PromoCode[]>>;
}


const AddOnItem: React.FC<{ addOn: AddOn }> = ({ addOn }) => {
    return (
        <div className="border-b border-brand-border last:border-b-0 p-4 flex justify-between items-center">
            <p className="font-semibold text-brand-text-light">{addOn.name}</p>
            <p className="text-sm font-bold text-brand-accent">{formatCurrency(addOn.price)}</p>
        </div>
    );
};

const initialForm = {
    clientName: '', email: '', phone: '', instagram: '', date: new Date().toISOString().split('T')[0], location: '', transportCost: '', selectedAddOnIds: [] as string[], promoCode: '', dp: '', dpPaymentRef: ''
};


const PublicPackages: React.FC<PublicPackagesProps> = ({ userProfile: initialUserProfile, showNotification, setClients, setProjects, setTransactions, setCards, setLeads, addNotification, cards, projects, promoCodes, setPromoCodes }) => {
    const [packages, setPackages] = useState<Package[]>([]);
    const [addOns, setAddOns] = useState<AddOn[]>([]);
    const [userProfile, setUserProfile] = useState<Profile>(initialUserProfile);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const { publicPageConfig } = userProfile;
    
    // Load data from Supabase
    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                
                // Load packages
                const packagesData = await listPackages();
                setPackages(packagesData);
                
                // Load add-ons
                const addOnsData = await listAddOns();
                setAddOns(addOnsData);
                
                // Load profile if not provided
                if (!initialUserProfile) {
                    const profileData = await getProfile();
                    if (profileData) {
                        setUserProfile(profileData);
                    }
                }
                
                setError(null);
            } catch (err) {
                console.error('Error loading data:', err);
                setError('Gagal memuat data. Silakan coba lagi nanti.');
            } finally {
                setIsLoading(false);
            }
        };
        
        loadData();
    }, [initialUserProfile]);
    const template = publicPageConfig.template || 'modern';
    
    const [bookingModal, setBookingModal] = useState<{ isOpen: boolean; pkg: Package | null }>({ isOpen: false, pkg: null });
    const [formData, setFormData] = useState(initialForm);
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [promoFeedback, setPromoFeedback] = useState({ type: '', message: '' });
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);
    const [isTermsOpen, setIsTermsOpen] = useState(false);

    // Note: We avoid early returns before all hooks to keep hook order stable across renders.
    
    // Group packages by category
    const packagesByCategory = useMemo(() => {
        const grouped: Record<string, Package[]> = {};
        
        if (!Array.isArray(packages)) {
            console.error('Packages is not an array:', packages);
            return {};
        }

        for (const pkg of packages) {
            if (!pkg) continue;
            
            const category = pkg.category || 'Lainnya';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(pkg);
        }
        
        const orderedGrouped: Record<string, Package[]> = {};
        
        if (userProfile?.packageCategories?.length) {
            userProfile.packageCategories.forEach((category: string) => {
                if (grouped[category]) {
                    orderedGrouped[category] = grouped[category];
                    delete grouped[category];
                }
            });
        }

        // Add remaining categories
        Object.keys(grouped).forEach(category => {
            orderedGrouped[category] = grouped[category];
        });

        return orderedGrouped;
    }, [packages, userProfile?.packageCategories]);
    
    const mostPopularPackageId = useMemo(() => {
        if (projects.length === 0) return null;
        const packageCounts = projects.reduce((acc, p) => {
            if (p.packageId) {
                acc[p.packageId] = (acc[p.packageId] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
        
        if (Object.keys(packageCounts).length === 0) return null;
        
        return Object.keys(packageCounts).sort((a,b) => packageCounts[b] - packageCounts[a])[0];
    }, [projects]);


    const categoryDescriptions: Record<string, string> = {
        'Pernikahan': "Paket lengkap untuk mengabadikan hari bahagia pernikahan Anda, dari akad hingga resepsi.",
        'Lamaran': "Momen spesial lamaran Anda akan kami rekam dengan indah dan penuh makna.",
        'Prewedding': "Sesi foto prewedding yang kreatif dan personal untuk menceritakan kisah cinta Anda.",
        'Korporat': "Dokumentasi profesional untuk berbagai acara perusahaan, dari seminar hingga gathering.",
        'Ulang Tahun': "Abadikan keceriaan pesta ulang tahun Anda atau orang terkasih dengan hasil yang tak terlupakan.",
        'Produk': "Tingkatkan nilai jual produk Anda dengan foto komersial berkualitas tinggi.",
        'Keluarga': "Rekam kehangatan dan momen berharga bersama keluarga Anda dalam sesi foto yang santai dan menyenangkan."
    };
    
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

    const whatsappUrl = useMemo(() => {
        if (!bookingModal.pkg || !isSubmitted) return '';
        const message = `Halo, saya ${formData.clientName}, baru saja melakukan booking untuk paket "${bookingModal.pkg.name}". Mohon untuk diproses. Terima kasih.`;
        return `https://wa.me/${cleanPhoneNumber(userProfile.phone)}?text=${encodeURIComponent(message)}`;
    }, [isSubmitted, formData.clientName, bookingModal.pkg, userProfile.phone]);

    const { totalBeforeDiscount, discountAmount, totalProject, discountText } = useMemo(() => {
        if (!bookingModal.pkg) return { totalBeforeDiscount: 0, discountAmount: 0, totalProject: 0, discountText: '' };

        const packagePrice = bookingModal.pkg.price;
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
    }, [formData.selectedAddOnIds, formData.promoCode, formData.transportCost, bookingModal.pkg, addOns, promoCodes]);

    const handleOpenBookingModal = (pkg: Package) => {
        setBookingModal({ isOpen: true, pkg });
        setIsSubmitted(false);
        setFormData(initialForm);
        setPaymentProof(null);
        setPromoFeedback({ type: '', message: '' });
    };

    const handleCloseBookingModal = () => {
        setBookingModal({ isOpen: false, pkg: null });
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
                alert('Ukuran file tidak boleh melebihi 10MB.');
                e.target.value = ''; 
                return;
            }
            setPaymentProof(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bookingModal.pkg) return;
        setIsSubmitting(true);
        
        const dpAmount = Number(formData.dp) || 0;
        const destinationCard = cards.find(c => c.id !== 'CARD_CASH') || cards[0];
        if (dpAmount > 0 && !destinationCard) {
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
                // Upload ke Supabase Storage, gunakan URL publik
                dpProofUrl = await uploadDpProof(paymentProof);
            } catch (error) {
                console.error('Error uploading DP proof:', error);
                alert('Gagal mengunggah bukti transfer. Silakan coba lagi.');
                setIsSubmitting(false);
                return;
            }
        }
        
        const selectedAddOns = addOns.filter(addon => formData.selectedAddOnIds.includes(addon.id));
        const remainingPayment = totalProject - dpAmount;
        const transportFee = Number(formData.transportCost) || 0;

        // Persist to Supabase
        const createdClient = await createClient({
            name: formData.clientName,
            email: formData.email,
            phone: formData.phone,
            whatsapp: formData.phone || undefined,
            instagram: formData.instagram || undefined,
            since: new Date().toISOString().split('T')[0],
            status: ClientStatus.ACTIVE,
            clientType: ClientType.DIRECT,
            lastContact: new Date().toISOString(),
            portalAccessId: crypto.randomUUID(),
        });

        const createdProject = await createProject({
            projectName: `Acara ${formData.clientName} (${bookingModal.pkg.name})`,
            clientName: createdClient.name,
            clientId: createdClient.id,
            projectType: bookingModal.pkg.category,
            packageName: bookingModal.pkg.name,
            date: formData.date,
            location: formData.location || 'Akan dikonfirmasi',
            status: 'Dikonfirmasi',
            bookingStatus: BookingStatus.BARU,
            totalCost: totalProject,
            amountPaid: dpAmount,
            paymentStatus: dpAmount >= totalProject ? PaymentStatus.LUNAS : (dpAmount > 0 ? PaymentStatus.DP_TERBAYAR : PaymentStatus.BELUM_BAYAR),
            notes: `Booking dari halaman paket. Ref: ${formData.dpPaymentRef}`,
            promoCodeId: promoCodeAppliedId,
            discountAmount: discountAmount > 0 ? discountAmount : undefined,
            transportCost: transportFee > 0 ? transportFee : undefined,
            completedDigitalItems: [],
            dpProofUrl: dpProofUrl || undefined,
            addOns: selectedAddOns.map(a => ({ id: a.id, name: a.name, price: a.price })),
        });

        const createdLead = await createLeadRow({
            name: createdClient.name,
            contactChannel: ContactChannel.WEBSITE,
            location: createdProject.location,
            status: LeadStatus.CONVERTED,
            date: new Date().toISOString(),
            notes: `Dikonversi dari halaman paket. Proyek: ${createdProject.projectName}. Klien ID: ${createdClient.id}`,
            whatsapp: createdClient.phone,
        } as any);

        setClients(prev => [createdClient, ...prev]);
        // Pastikan muncul di halaman Booking
        const createdProjectWithBooking: Project = { ...createdProject, bookingStatus: BookingStatus.BARU } as Project;
        setProjects(prev => [createdProjectWithBooking, ...prev]);
        setLeads(prev => [createdLead, ...prev]);
        
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
                setTransactions(prev => [createdTx, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                try { await updateCardBalance(destinationCard.id, dpAmount); } catch {}
                setCards(prev => prev.map(c => c.id === destinationCard.id ? { ...c, balance: c.balance + dpAmount } : c));
            } catch (err) {
                console.error('Gagal mencatat transaksi DP ke Supabase:', err);
                // fallback: tetap update lokal
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
                setTransactions(prev => [localTx, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                setCards(prev => prev.map(c => c.id === destinationCard.id ? { ...c, balance: c.balance + dpAmount } : c));
            }
        }

        addNotification({
            title: 'Booking Baru Diterima!',
            message: `Booking dari ${createdClient.name} untuk paket "${bookingModal.pkg.name}" menunggu konfirmasi.`,
            icon: 'lead',
            link: { view: ViewType.BOOKING }
        });

        setIsSubmitting(false);
        setIsSubmitted(true);
    };

    const suggestedDp = totalProject * 0.3;

    return (
        isLoading ? (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent mx-auto mb-4"></div>
                    <p className="text-brand-text-secondary">Memuat data paket...</p>
                </div>
            </div>
        ) : error ? (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center p-6 max-w-md mx-auto bg-brand-surface rounded-lg shadow-md">
                    <div className="text-red-500 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-brand-text-light mb-2">Terjadi Kesalahan</h3>
                    <p className="text-brand-text-secondary mb-4">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-brand-accent text-white rounded-lg hover:bg-brand-accent-hover transition-colors"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        ) : (
        <div className={`template-wrapper template-${template} min-h-screen`}>
            <style>{`
                .template-wrapper { background-color: var(--public-bg); color: var(--public-text-primary); }
            `}</style>
            <div className="w-full max-w-7xl mx-auto py-12 px-4">
                 <header className="text-center mb-12 md:mb-16 widget-animate">
                    {userProfile.logoBase64 ? (
                        <img src={userProfile.logoBase64} alt="Company Logo" className="h-20 mx-auto mb-4 object-contain" />
                    ) : (
                        <h1 className="text-4xl md:text-5xl font-extrabold text-gradient">{userProfile.companyName}</h1>
                    )}
                    <h2 className="text-3xl md:text-4xl font-bold text-brand-text-light mt-4">{publicPageConfig.title}</h2>
                    <p className="text-lg text-brand-text-secondary mt-4 max-w-3xl mx-auto">{publicPageConfig.introduction}</p>
                </header>

                {publicPageConfig.galleryImages && publicPageConfig.galleryImages.length > 0 && (
                    <section className="mb-12 md:mb-16 widget-animate" style={{ animationDelay: '100ms' }}>
                        <div className="text-center mb-8">
                            <h3 className="text-3xl font-bold text-brand-text-light">Galeri Kami</h3>
                            <p className="text-brand-text-secondary mt-2">Beberapa momen yang telah kami abadikan.</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {publicPageConfig.galleryImages.map((imgSrc, index) => (
                                <div key={index} className="aspect-square bg-brand-bg rounded-lg overflow-hidden shadow-md group">
                                    <img 
                                        src={imgSrc} 
                                        alt={`Gallery image ${index + 1}`} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <section className="mb-12 md:mb-16 grid md:grid-cols-1 lg:grid-cols-2 gap-8 widget-animate" style={{ animationDelay: '200ms' }}>
                    <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border p-4 sm:p-6">
                        <button onClick={() => setIsWorkflowOpen(!isWorkflowOpen)} className="w-full flex justify-between items-center text-left">
                            <h3 className="text-2xl font-bold text-gradient">Wedding Workflow</h3>
                            <ChevronDownIcon className={`w-6 h-6 transition-transform text-brand-text-secondary ${isWorkflowOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <div className={`transition-all duration-500 ease-in-out grid ${isWorkflowOpen ? 'grid-rows-[1fr] mt-4 opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-brand-text-light">Wedding Timeline</h4>
                                        <ul className="mt-2 space-y-1 text-sm text-brand-text-secondary list-disc list-inside">
                                            <li>Preview (Sampel) Foto → 7 hari</li>
                                            <li>Video Teaser 1 Menit → 14 hari</li>
                                            <li>Final Edit Foto → 14 hari</li>
                                            <li>Video 3–5 Menit → 30 hari</li>
                                            <li>Draft Layout Album → 14 hari</li>
                                            <li>Produksi Album + Box → 60 hari</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-brand-text-light">Prewedding / Couple Session Timeline</h4>
                                        <ul className="mt-2 space-y-1 text-sm text-brand-text-secondary list-disc list-inside">
                                            <li>Sneak Peek (Foto Cepat) → 7 hari</li>
                                            <li>Video Teaser 1 Menit → 14 hari</li>
                                            <li>Final Edit Foto → 14 hari</li>
                                            <li>Cetak Foto Selesai → 25 hari</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border p-4 sm:p-6">
                        <button onClick={() => setIsTermsOpen(!isTermsOpen)} className="w-full flex justify-between items-center text-left">
                            <h3 className="text-2xl font-bold text-gradient">Syarat & Ketentuan</h3>
                            <ChevronDownIcon className={`w-6 h-6 transition-transform text-brand-text-secondary ${isTermsOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <div className={`transition-all duration-500 ease-in-out grid ${isTermsOpen ? 'grid-rows-[1fr] mt-4 opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                                <div className="max-h-80 overflow-y-auto pr-4 text-sm space-y-2">
                                     {formattedTerms ? (
                                        <div>{formattedTerms}</div>
                                    ) : (
                                        <p className="text-brand-text-secondary text-center py-8">Syarat dan ketentuan belum diatur oleh vendor.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid lg:grid-cols-3 gap-8 items-start">
                    <section className="lg:col-span-2 space-y-16">
                        {Object.entries(packagesByCategory as Record<string, Package[]>).map(([category, pkgs]) => (
                            <div key={category}>
                                <div className="mb-8">
                                    <h3 className="text-3xl font-bold text-brand-text-light">{category}</h3>
                                    <p className="text-brand-text-secondary mt-2 max-w-2xl">
                                        {categoryDescriptions[category] || `Berbagai pilihan paket untuk kebutuhan ${category.toLowerCase()} Anda.`}
                                    </p>
                                </div>
                                <div className="grid md:grid-cols-2 gap-8">
                                    {pkgs.map((pkg, index) => (
                                        <div key={pkg.id} className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl widget-animate" style={{ animationDelay: `${200 + index * 100}ms` }}>
                                             {pkg.id === mostPopularPackageId && (
                                                <div className="absolute -top-3 right-3 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow-md z-10">Paling Populer</div>
                                            )}
                                            {pkg.coverImage ? (
                                                <div className="w-full h-48 overflow-hidden">
                                                    <img 
                                                        src={pkg.coverImage} 
                                                        alt={pkg.name} 
                                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
                                                        onError={(e) => {
                                                            // If image fails to load, show the camera icon
                                                            const target = e.target as HTMLImageElement;
                                                            target.style.display = 'none';
                                                            const parent = target.parentElement;
                                                            if (parent) {
                                                                parent.innerHTML = `
                                                                    <div class="w-full h-48 bg-brand-bg flex items-center justify-center">
                                                                        <svg class="w-12 h-12 text-brand-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                                        </svg>
                                                                    </div>`;
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-full h-48 bg-brand-bg flex items-center justify-center">
                                                    <svg className="w-12 h-12 text-brand-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                    </svg>
                                                </div>
                                            )}
                                            <div className="p-4 sm:p-6 flex flex-col flex-grow">
                                                <h4 className="text-xl font-bold text-gradient">{pkg.name}</h4>
                                                <p className="text-3xl font-bold text-brand-text-light my-3">{formatCurrency(pkg.price)}</p>
                                                <div className="space-y-4 text-sm flex-grow">
                                                    {(pkg.photographers || pkg.videographers) && (
                                                        <div>
                                                            <h5 className="font-semibold text-brand-text-primary mb-1">Tim</h5>
                                                            <div className="flex items-start gap-2 text-brand-text-secondary"><CheckIcon className="w-4 h-4 text-brand-success flex-shrink-0 mt-0.5" /><span>{[pkg.photographers, pkg.videographers].filter(Boolean).join(' & ')}</span></div>
                                                        </div>
                                                    )}
                                                    {pkg.physicalItems.length > 0 && (
                                                         <div>
                                                            <h5 className="font-semibold text-brand-text-primary mb-1">Output Fisik</h5>
                                                            <div className="space-y-1">
                                                                {pkg.physicalItems.map((item, i) => <div key={i} className="flex items-start gap-2 text-brand-text-secondary"><CheckIcon className="w-4 h-4 text-brand-success flex-shrink-0 mt-0.5" /><span>{item.name}</span></div>)}
                                                            </div>
                                                        </div>
                                                    )}
                                                     {pkg.digitalItems.length > 0 && (
                                                         <div>
                                                            <h5 className="font-semibold text-brand-text-primary mb-1">Output Digital</h5>
                                                            <div className="space-y-1">
                                                                {pkg.digitalItems.map((item, i) => <div key={i} className="flex items-start gap-2 text-brand-text-secondary"><CheckIcon className="w-4 h-4 text-brand-success flex-shrink-0 mt-0.5" /><span>{item}</span></div>)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-6 pt-4 border-t border-brand-border">
                                                    <button onClick={() => handleOpenBookingModal(pkg)} className="button-primary w-full text-center">Booking Paket Ini</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </section>
                    
                    {addOns.length > 0 && (
                        <aside className="lg:col-span-1 lg:sticky lg:top-8 widget-animate" style={{ animationDelay: '500ms' }}>
                            <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                                <h3 className="text-xl font-bold text-brand-text-light p-6">Tambahan Opsional</h3>
                                <div className="border-t border-brand-border">
                                    {addOns.map(addOn => (
                                        <AddOnItem key={addOn.id} addOn={addOn} />
                                    ))}
                                </div>
                            </div>
                        </aside>
                    )}
                </div>

                <section className="py-16 mt-16 border-t border-brand-border widget-animate" style={{ animationDelay: '550ms' }}>
                    <div className="max-w-2xl mx-auto text-center">
                        <h3 className="text-2xl font-bold text-gradient mb-2">Butuh Bantuan?</h3>
                        <p className="text-brand-text-secondary mb-6">
                            Jika ada pertanyaan atau butuh bantuan dalam pengisian formulir, jangan ragu untuk menghubungi admin kami melalui WhatsApp.
                        </p>
                        <a 
                            href={`https://wa.me/${cleanPhoneNumber('085693762240')}`}
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="button-secondary inline-flex items-center gap-2"
                        >
                            <WhatsappIcon className="w-5 h-5"/>
                            Hubungi Admin (085693762240)
                        </a>
                    </div>
                </section>

                <footer className="text-center py-12 mt-16 border-t border-brand-border widget-animate" style={{ animationDelay: '600ms' }}>
                    <h3 className="text-2xl font-bold text-gradient mb-2">Tertarik Bekerja Sama?</h3>
                    <p className="text-brand-text-secondary mb-6 max-w-lg mx-auto">
                        Hubungi kami untuk diskusi lebih lanjut atau langsung lakukan pemesanan melalui formulir kami.
                    </p>
                    <a href={`https://wa.me/${cleanPhoneNumber(userProfile.phone)}`} target="_blank" rel="noopener noreferrer" className="button-primary">
                        Hubungi via WhatsApp
                    </a>
                    <p className="text-xs text-brand-text-secondary mt-12">&copy; {new Date().getFullYear()} {userProfile.companyName}.</p>
                </footer>
            </div>
            
             <Modal isOpen={bookingModal.isOpen} onClose={handleCloseBookingModal} title={`Booking: ${bookingModal.pkg?.name}`} size="4xl">
                {isSubmitted ? (
                    <div className="text-center p-8">
                        <h3 className="text-2xl font-bold text-gradient">Terima Kasih!</h3>
                        <p className="mt-4 text-public-text-primary">Formulir booking Anda telah kami terima. Tim kami akan segera menghubungi Anda untuk konfirmasi.</p>
                         <a 
                            href={whatsappUrl}
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="mt-6 button-primary w-full max-w-xs mx-auto"
                        >
                            Konfirmasi ke Admin via WhatsApp
                        </a>
                        <button onClick={handleCloseBookingModal} className="mt-4 button-secondary w-full max-w-xs mx-auto">Tutup</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                             <div className="space-y-4">
                                <h4 className="text-base font-semibold text-gradient border-b border-public-border pb-2">Informasi Anda & Acara</h4>
                                <div className="input-group"><input type="text" id="clientName" name="clientName" value={formData.clientName} onChange={handleFormChange} className="input-field" placeholder=" " required /><label htmlFor="clientName" className="input-label">Nama Lengkap</label></div>
                                <div className="input-group"><input type="email" id="email" name="email" value={formData.email} onChange={handleFormChange} className="input-field" placeholder=" " required /><label htmlFor="email" className="input-label">Email</label></div>
                                <div className="input-group"><input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleFormChange} className="input-field" placeholder=" " required /><label htmlFor="phone" className="input-label">Nomor WhatsApp</label></div>
                                <div className="input-group"><input type="text" id="instagram" name="instagram" value={formData.instagram} onChange={handleFormChange} className="input-field" placeholder=" " /><label htmlFor="instagram" className="input-label">Instagram</label></div>
                                <div className="input-group"><input type="date" id="date" name="date" value={formData.date} onChange={handleFormChange} className="input-field" placeholder=" "/><label htmlFor="date" className="input-label">Tanggal Acara</label></div>
                                <div className="input-group"><input type="text" id="location" name="location" value={formData.location} onChange={handleFormChange} className="input-field" placeholder=" "/><label htmlFor="location" className="input-label">Alamat Acara</label></div>
                                <h4 className="text-base font-semibold text-gradient border-b border-public-border pb-2 pt-4">Paket & Pembayaran</h4>
                                <div className="p-4 bg-public-bg rounded-lg space-y-3">
                                    <div className="flex justify-between items-center text-sm"><span className="text-public-text-secondary">Paket: {bookingModal.pkg?.name}</span><span className="text-public-text-primary font-semibold">{formatCurrency(bookingModal.pkg?.price || 0)}</span></div>
                                    {formData.selectedAddOnIds.length > 0 && addOns.filter(a => formData.selectedAddOnIds.includes(a.id)).map(a => (
                                        <div key={a.id} className="flex justify-between items-center text-sm"><span className="text-public-text-secondary pl-4">Add-on: {a.name}</span><span className="text-public-text-primary font-semibold">{formatCurrency(a.price)}</span></div>
                                    ))}
                                    {Number(formData.transportCost) > 0 && <div className="flex justify-between items-center text-sm"><span className="text-public-text-secondary">Fee Transport</span><span className="text-public-text-primary font-semibold">{formatCurrency(Number(formData.transportCost) || 0)}</span></div>}
                                    {discountAmount > 0 && <div className="flex justify-between items-center text-sm"><span className="text-public-text-secondary">Diskon ({discountText})</span><span className="text-green-500 font-semibold">-{formatCurrency(discountAmount)}</span></div>}
                                    <div className="flex justify-between items-center font-bold text-lg pt-2 border-t border-public-border"><span className="text-public-text-secondary">Total Biaya</span><span className="text-public-text-primary">{formatCurrency(totalProject)}</span></div>
                                </div>
                             </div>
                              <div className="space-y-4">
                                <h4 className="text-base font-semibold text-gradient border-b border-public-border pb-2">Tambahan</h4>
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
                                <div className="p-4 bg-public-bg rounded-lg">
                                    <p className="text-sm text-public-text-secondary">Silakan transfer Uang Muka (DP) ke rekening:</p>
                                    <p className="font-semibold text-public-text-primary text-center py-2 bg-public-surface rounded-md border border-public-border mt-2">{userProfile.bankAccount}</p>
                                    <div className="grid grid-cols-2 gap-4 mt-3">
                                        <div className="input-group !mt-0">
                                            <input type="number" name="dp" id="dp" value={formData.dp} onChange={handleFormChange} className="input-field text-right" placeholder=" " />
                                            <label htmlFor="dp" className="input-label">Jumlah DP</label>
                                            <p className="text-xs text-public-text-secondary mt-1 text-right">Saran DP (30%): {formatCurrency(suggestedDp)}</p>
                                        </div>
                                        <div className="input-group !mt-0"><input type="text" name="dpPaymentRef" id="dpPaymentRef" value={formData.dpPaymentRef} onChange={handleFormChange} className="input-field" placeholder=" "/><label htmlFor="dpPaymentRef" className="input-label">No. Ref / 4 Digit Rek</label></div>
                                    </div>
                                </div>
                                 <div className="input-group">
                                    <label htmlFor="dpPaymentProof" className="input-label !static !-top-4 text-public-accent">Unggah Bukti Transfer DP</label>
                                    <div className="mt-2 flex justify-center rounded-lg border border-dashed border-public-border px-6 py-10">
                                        <div className="text-center">
                                            <UploadIcon className="mx-auto h-12 w-12 text-public-text-secondary" />
                                            <div className="mt-4 flex text-sm leading-6 text-public-text-secondary">
                                                <label htmlFor="dpPaymentProof" className="relative cursor-pointer rounded-md bg-public-surface font-semibold text-public-accent focus-within:outline-none hover:text-public-accent-hover">
                                                    <span>Unggah file</span>
                                                    <input id="dpPaymentProof" name="dpPaymentProof" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, image/jpg, application/pdf" />
                                                </label>
                                                <p className="pl-1">atau seret dan lepas</p>
                                            </div>
                                            <p className="text-xs leading-5 text-public-text-secondary">PNG, JPG, PDF hingga 10MB</p>
                                        </div>
                                    </div>
                                    {paymentProof && <div className="mt-2 text-sm text-public-text-primary bg-public-bg p-2 rounded-md">File terpilih: <span className="font-semibold">{paymentProof.name}</span></div>}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-public-border">
                            <button type="button" onClick={handleCloseBookingModal} className="button-secondary">Batal</button>
                            <button type="submit" disabled={isSubmitting} className="button-primary">{isSubmitting ? 'Mengirim...' : 'Kirim Booking'}</button>
                        </div>
                         <div className="mt-6 flex justify-center items-center gap-4">
                            <button type="button" onClick={() => setIsTermsModalOpen(true)} className="text-xs font-semibold text-public-accent hover:underline">
                                Lihat Syarat & Ketentuan Umum
                            </button>
                            <span className="text-public-text-secondary text-xs">|</span>
                            <button type="button" onClick={() => setIsContractModalOpen(true)} className="text-xs font-semibold text-public-accent hover:underline">
                                Lihat Contoh Kontrak Kerja
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
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
        )
    );
};

export default PublicPackages;
