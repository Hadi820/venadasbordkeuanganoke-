import React, { useState, useMemo, useEffect } from 'react';
import { Contract, Client, Project, Profile, NavigationAction, Package } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import SignaturePad from './SignaturePad';
import StatCard from './StatCard';
import { PlusIcon, EyeIcon, PencilIcon, Trash2Icon, PrinterIcon, QrCodeIcon, FileTextIcon, ClockIcon, CheckSquareIcon, DollarSignIcon } from '../constants';
import { createContract as createContractRow, updateContract as updateContractRow, deleteContract as deleteContractRow } from '../services/contracts';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

const formatDate = (dateString: string) => {
    if (!dateString) return '[Tanggal belum diisi]';
    return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
};

const initialFormState: Omit<Contract, 'id' | 'contractNumber' | 'clientId' | 'projectId' | 'createdAt'> = {
    signingDate: new Date().toISOString().split('T')[0],
    signingLocation: '',
    clientName1: '',
    clientAddress1: '',
    clientPhone1: '',
    clientName2: '',
    clientAddress2: '',
    clientPhone2: '',
    shootingDuration: '',
    guaranteedPhotos: '',
    albumDetails: '',
    digitalFilesFormat: 'JPG High-Resolution',
    otherItems: '',
    personnelCount: '',
    deliveryTimeframe: '30 hari kerja',
    dpDate: '',
    finalPaymentDate: '',
    cancellationPolicy: 'DP yang sudah dibayarkan tidak dapat dikembalikan.\nJika pembatalan dilakukan H-7 sebelum hari pelaksanaan, PIHAK KEDUA wajib membayar 50% dari total biaya.',
    jurisdiction: ''
};

const getSignatureStatus = (contract: Contract) => {
    if (contract.vendorSignature && contract.clientSignature) {
        return { text: 'Lengkap', color: 'bg-green-500/20 text-green-400', icon: <CheckSquareIcon className="w-4 h-4 text-green-500" /> };
    }
    if (contract.vendorSignature && !contract.clientSignature) {
        return { text: 'Menunggu TTD Klien', color: 'bg-blue-500/20 text-blue-400', icon: <ClockIcon className="w-4 h-4 text-blue-500" /> };
    }
    return { text: 'Menunggu TTD Anda', color: 'bg-yellow-500/20 text-yellow-400', icon: <ClockIcon className="w-4 h-4 text-yellow-500" /> };
};


interface ContractsProps {
    contracts: Contract[];
    setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
    clients: Client[];
    projects: Project[];
    profile: Profile;
    showNotification: (message: string) => void;
    initialAction: NavigationAction | null;
    setInitialAction: (action: NavigationAction | null) => void;
    packages: Package[];
    onSignContract: (contractId: string, signatureDataUrl: string, signer: 'vendor' | 'client') => void;
}

const Contracts: React.FC<ContractsProps> = ({ contracts, setContracts, clients, projects, profile, showNotification, initialAction, setInitialAction, packages, onSignContract }) => {
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [qrModalContent, setQrModalContent] = useState<{ title: string; url: string } | null>(null);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    // Form specific state
    const [formData, setFormData] = useState(initialFormState);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    
    useEffect(() => {
        if (qrModalContent) {
            const qrCodeContainer = document.getElementById('contract-portal-qrcode');
            if (qrCodeContainer && typeof (window as any).QRCode !== 'undefined') {
                qrCodeContainer.innerHTML = '';
                 new (window as any).QRCode(qrCodeContainer, {
                    text: qrModalContent.url,
                    width: 200,
                    height: 200,
                    colorDark: "#020617", // slate-950
                    colorLight: "#ffffff",
                    correctLevel: 2 // H
                });
            }
        }
    }, [qrModalContent]);

    const handleOpenQrModal = (contract: Contract) => {
        const client = clients.find(c => c.id === contract.clientId);
        if (client) {
            const path = window.location.pathname.replace(/index\.html$/, '');
            const url = `${window.location.origin}${path}#/portal/${client.portalAccessId}`;
            setQrModalContent({ title: `Portal QR Code untuk ${client.name}`, url });
        } else {
            showNotification('Klien untuk kontrak ini tidak ditemukan.');
        }
    };

    const availableProjects = useMemo(() => {
        return projects.filter(p => p.clientId === selectedClientId);
    }, [selectedClientId, projects]);
    
    // Auto-populate form when project is selected
    useEffect(() => {
        if (selectedProjectId) {
            const project = projects.find(p => p.id === selectedProjectId);
            const client = clients.find(c => c.id === project?.clientId);
            if (project && client) {
                const pkg = packages.find(p => p.id === project.packageId); 
                const clientNames = client.name.split(/&|,/);
                setFormData(prev => ({
                    ...prev,
                    clientName1: clientNames[0]?.trim() || client.name,
                    clientPhone1: client.phone,
                    clientAddress1: project.location,
                    clientName2: clientNames[1]?.trim() || '',
                    clientPhone2: client.phone,
                    clientAddress2: project.location,
                    jurisdiction: project.location.split(',')[1]?.trim() || project.location.split(',')[0]?.trim() || 'Indonesia',
                    signingLocation: profile.address,
                    dpDate: project.amountPaid > 0 ? new Date().toISOString().split('T')[0] : '',
                    finalPaymentDate: project.date ? new Date(new Date(project.date).setDate(new Date(project.date).getDate() - 7)).toISOString().split('T')[0] : '',
                    shootingDuration: pkg?.photographers || 'Sesuai detail paket',
                    guaranteedPhotos: pkg?.digitalItems.find(item => item.toLowerCase().includes('foto')) || 'Sesuai detail paket',
                    albumDetails: pkg?.physicalItems.find(item => item.name.toLowerCase().includes('album'))?.name || 'Sesuai detail paket',
                    otherItems: project.addOns.map(a => a.name).join(', ') || 'Sesuai detail paket',
                    personnelCount: `${pkg?.photographers ? '1+' : '0'} Fotografer, ${pkg?.videographers ? '1+' : '0'} Videografer`,
                    deliveryTimeframe: pkg?.processingTime || '30 hari kerja',
                }));
            }
        }
    }, [selectedProjectId, projects, clients, packages, profile.address]);

    const handleOpenModal = (mode: 'add' | 'edit' | 'view', contract?: Contract) => {
        if (mode === 'view' && contract) {
            setSelectedContract(contract);
            setIsViewModalOpen(true);
        } else {
            setModalMode(mode);
            if (mode === 'edit' && contract) {
                setSelectedContract(contract);
                setSelectedClientId(contract.clientId);
                setSelectedProjectId(contract.projectId);
                setFormData({ ...initialFormState, ...contract });
            } else {
                setSelectedContract(null);
                setSelectedClientId(initialAction?.id || '');
                setSelectedProjectId('');
                setFormData(initialFormState);
                if (initialAction && initialAction.type === 'CREATE_CONTRACT_FOR_CLIENT' && initialAction.id) {
                    setSelectedClientId(initialAction.id);
                }
            }
            setIsFormModalOpen(true);
        }
    };
    
    useEffect(() => {
        if (initialAction) {
            if (initialAction.type === 'CREATE_CONTRACT_FOR_CLIENT' && initialAction.id) {
                handleOpenModal('add');
            }
            if (initialAction.type === 'VIEW_CONTRACT' && initialAction.id) {
                const contractToView = contracts.find(c => c.id === initialAction.id);
                if (contractToView) handleOpenModal('view', contractToView);
            }
            setInitialAction(null);
        }
    }, [initialAction, contracts]);


    const handleCloseModal = () => {
        setIsFormModalOpen(false);
        setIsViewModalOpen(false);
        setSelectedContract(null);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedProjectId) {
            showNotification('Harap pilih proyek terlebih dahulu.');
            return;
        }

        try {
            if (modalMode === 'add') {
                const contractCount = contracts.length + 1;
                const contractNumber = `VP/CTR/${new Date().getFullYear()}/${String(contractCount).padStart(3, '0')}`;
                const payload = {
                    contractNumber,
                    clientId: selectedClientId,
                    projectId: selectedProjectId,
                    ...formData,
                } as Omit<Contract, 'id' | 'createdAt'>;
                const created = await createContractRow(payload);
                setContracts(prev => [...prev, created]);
                showNotification('Kontrak baru berhasil dibuat.');
            } else if (selectedContract) {
                const patch = {
                    ...formData,
                    clientId: selectedClientId,
                    projectId: selectedProjectId,
                } as Partial<Contract>;
                try {
                    const updated = await updateContractRow(selectedContract.id, patch);
                    setContracts(prev => prev.map(c => c.id === selectedContract.id ? updated : c));
                    showNotification('Kontrak berhasil diperbarui.');
                } catch (err: any) {
                    console.warn('[Supabase][contracts.update] gagal, fallback create. Detail:', err);
                    const payload = {
                        contractNumber: selectedContract.contractNumber,
                        clientId: selectedClientId,
                        projectId: selectedProjectId,
                        ...formData,
                    } as Omit<Contract, 'id' | 'createdAt'>;
                    const created = await createContractRow(payload);
                    setContracts(prev => prev.map(c => c.id === selectedContract.id ? created : c));
                    showNotification('Kontrak baru berhasil dibuat (fallback).');
                }
            }
            handleCloseModal();
        } catch (err: any) {
            console.error('[Supabase][contracts.save] error:', err);
            alert(`Gagal menyimpan kontrak ke database. ${err?.message || 'Coba lagi.'}`);
        }
    };

    const handleDelete = async (contractId: string) => {
        if (!window.confirm("Apakah Anda yakin ingin menghapus kontrak ini?")) return;
        try {
            await deleteContractRow(contractId);
            setContracts(prev => prev.filter(c => c.id !== contractId));
            showNotification('Kontrak berhasil dihapus.');
        } catch (err: any) {
            console.error('[Supabase][contracts.delete] error:', err);
            alert(`Gagal menghapus kontrak di database. ${err?.message || 'Coba lagi.'}`);
        }
    };
    
    const handleSaveSignature = async (signatureDataUrl: string) => {
        if (selectedContract) {
            try {
                const updated = await updateContractRow(selectedContract.id, { vendorSignature: signatureDataUrl });
                onSignContract(selectedContract.id, signatureDataUrl, 'vendor');
                setSelectedContract(updated);
                setContracts(prev => prev.map(c => c.id === updated.id ? updated : c));
            } catch (err: any) {
                console.error('[Supabase][contracts.signature] error:', err);
                alert(`Gagal menyimpan tanda tangan ke database. ${err?.message || 'Coba lagi.'}`);
            }
        }
        setIsSignatureModalOpen(false);
    };

    const stats = useMemo(() => {
        const waitingForClient = contracts.filter(c => c.vendorSignature && !c.clientSignature).length;
        const waitingForVendor = contracts.filter(c => !c.vendorSignature).length;
        const totalValue = contracts.reduce((sum, c) => {
            const project = projects.find(p => p.id === c.projectId);
            return sum + (project?.totalCost || 0);
        }, 0);
        return { waitingForClient, waitingForVendor, totalValue };
    }, [contracts, projects]);
    
    const renderContractBody = (contract: Contract) => {
        const project = projects.find(p => p.id === contract.projectId);
        if (!project) return <p>Data proyek tidak ditemukan.</p>;

        const replacePlaceholders = (template: string) => {
            const data = {
                '{vendorCompanyName}': profile.companyName,
                '{vendorSignerName}': profile.authorizedSigner,
                '{vendorAddress}': profile.address,
                '{vendorPhone}': profile.phone,
                '{vendorIdNumber}': profile.idNumber || '',
                '{clientName1}': contract.clientName1,
                '{clientAddress1}': contract.clientAddress1,
                '{clientPhone1}': contract.clientPhone1,
                '{clientName2}': contract.clientName2 || '',
                '{clientAddress2}': contract.clientAddress2 || '',
                '{clientPhone2}': contract.clientPhone2 || '',
                '{projectName}': project.projectName,
                '{projectType}': project.projectType,
                '{projectDate}': formatDate(project.date),
                '{projectLocation}': project.location,
                '{contractNumber}': contract.contractNumber,
                '{signingDate}': formatDate(contract.signingDate),
                '{signingLocation}': contract.signingLocation,
                '{shootingDuration}': contract.shootingDuration,
                '{guaranteedPhotos}': contract.guaranteedPhotos,
                '{albumDetails}': contract.albumDetails,
                '{otherItems}': contract.otherItems,
                '{personnelCount}': contract.personnelCount,
                '{deliveryTimeframe}': contract.deliveryTimeframe,
                '{totalCost}': formatCurrency(project.totalCost),
                '{dpAmount}': formatCurrency(project.amountPaid),
                '{dpDate}': formatDate(contract.dpDate),
                '{finalPaymentDate}': formatDate(contract.finalPaymentDate),
                '{cancellationPolicy}': contract.cancellationPolicy,
                '{jurisdiction}': contract.jurisdiction,
            };

            let result = template;
            for (const placeholder in data) {
                result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), (data as any)[placeholder]);
            }
            return result;
        };
        
        const SignatureSection = () => (
             <section className="mt-16 pt-8 border-t-2 border-slate-200">
                <h4 className="font-bold text-center text-lg mb-8">Tanda Tangan Para Pihak</h4>
                <div className="flex justify-between items-start">
                    <div className="text-center w-2/5">
                        <p className="font-semibold">PIHAK PERTAMA</p>
                        <p className="text-xs mb-2">({profile.companyName})</p>
                        <div className="h-28 my-1 flex flex-col items-center justify-center">
                            {contract.vendorSignature ? <img src={contract.vendorSignature} alt="Tanda Tangan Vendor" className="h-24 object-contain" /> : <span className="italic text-gray-400 text-sm">Belum Ditandatangani</span>}
                        </div>
                        <p className="border-t-2 border-dotted w-4/5 mx-auto pt-1 font-semibold">{profile.authorizedSigner}</p>
                    </div>
                    <div className="text-center w-2/5">
                        <p className="font-semibold">PIHAK KEDUA</p>
                        <p className="text-xs mb-2">({contract.clientName1}{contract.clientName2 ? ` & ${contract.clientName2}` : ''})</p>
                        <div className="h-28 my-1 flex items-center justify-center">
                            {contract.clientSignature ? <img src={contract.clientSignature} alt="Tanda Tangan Klien" className="h-24 object-contain" /> : <span className="italic text-gray-400 text-sm">Belum Ditandatangani</span>}
                        </div>
                        <p className="border-t-2 border-dotted w-4/5 mx-auto pt-1 font-semibold">{contract.clientName1}{contract.clientName2 ? ` & ${contract.clientName2}` : ''}</p>
                    </div>
                </div>
            </section>
        );

        if (profile.contractTemplate) {
            const renderedTemplate = replacePlaceholders(profile.contractTemplate);
            return (
                 <div className="printable-content bg-white text-black p-8 font-serif leading-relaxed text-sm">
                    <div dangerouslySetInnerHTML={{ __html: renderedTemplate.replace(/\n/g, '<br />') }} />
                    <SignatureSection />
                </div>
            );
        }
        
        // Fallback to hardcoded structure if no template
        return (
            <div className="printable-content bg-white text-black p-8 font-serif leading-relaxed text-sm">
                <h2 className="text-xl font-bold text-center mb-1">SURAT PERJANJIAN KERJA SAMA</h2>
                <h3 className="text-lg font-bold text-center mb-6">JASA {project.projectType.toUpperCase()}</h3>
                <p>Pada hari ini, {formatDate(contract.signingDate)}, bertempat di {contract.signingLocation}, telah dibuat dan disepakati perjanjian kerja sama antara:</p>
                <div className="my-4"><p className="font-bold">PIHAK PERTAMA</p><p>{profile.companyName}, yang diwakili oleh {profile.authorizedSigner} beralamat di {profile.address}.</p></div>
                <div className="my-4"><p className="font-bold">PIHAK KEDUA</p><p>{contract.clientName1} (No. Tlp: {contract.clientPhone1}), beralamat di {contract.clientAddress1}.</p>{contract.clientName2 && <p>{contract.clientName2} (No. Tlp: {contract.clientPhone2}), beralamat di {contract.clientAddress2}.</p>}</div>
                <div className="space-y-4 mt-6">
                    <div><h4 className="font-bold text-center my-3">PASAL 1: RUANG LINGKUP PEKERJAAN</h4><p>PIHAK PERTAMA akan memberikan jasa {project.projectType.toLowerCase()} yang diberikan oleh PIHAK PERTAMA untuk acara PIHAK KEDUA pada tanggal {formatDate(project.date)} di {project.location}. Rincian layanan adalah sebagai berikut: {contract.shootingDuration}, {contract.guaranteedPhotos}, {contract.albumDetails}, dan {contract.otherItems}.</p></div>
                    <div><h4 className="font-bold text-center my-3">PASAL 2: BIAYA DAN PEMBAYARAN</h4><p>Total biaya jasa adalah sebesar {formatCurrency(project.totalCost)}. Pembayaran dilakukan dengan Uang Muka (DP) pada {formatDate(contract.dpDate)} dan pelunasan pada {formatDate(contract.finalPaymentDate)}.</p></div>
                    <div><h4 className="font-bold text-center my-3">PASAL 3: PEMBATALAN</h4><p dangerouslySetInnerHTML={{ __html: contract.cancellationPolicy.replace(/\n/g, '<br/>') }}></p></div>
                </div>
                <SignatureSection />
            </div>
        );
    };
    
    return (
        <div className="space-y-6">
            <PageHeader title="Manajemen Kontrak" subtitle="Buat, kelola, dan arsipkan semua kontrak kerja Anda.">
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsInfoModalOpen(true)} className="button-secondary">Pelajari Halaman Ini</button>
                    <button onClick={() => handleOpenModal('add')} className="button-primary inline-flex items-center gap-2">
                        <PlusIcon className="w-5 h-5"/> Buat Kontrak
                    </button>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard icon={<FileTextIcon className="w-6 h-6"/>} title="Total Kontrak" value={contracts.length.toString()} />
                <StatCard icon={<ClockIcon className="w-6 h-6"/>} title="Menunggu TTD Klien" value={stats.waitingForClient.toString()} />
                <StatCard icon={<DollarSignIcon className="w-6 h-6"/>} title="Total Nilai Terkontrak" value={formatCurrency(stats.totalValue)} />
            </div>
            
            <div className="bg-brand-surface p-4 rounded-xl shadow-lg border border-brand-border">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-brand-text-secondary uppercase">
                            <tr>
                                <th className="px-4 py-3">No. Kontrak</th>
                                <th className="px-4 py-3">Klien & Proyek</th>
                                <th className="px-4 py-3">Tgl. Penandatanganan</th>
                                <th className="px-4 py-3">Status TTD</th>
                                <th className="px-4 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {contracts.map(contract => {
                                const client = clients.find(c => c.id === contract.clientId);
                                const project = projects.find(p => p.id === contract.projectId);
                                const signatureStatus = getSignatureStatus(contract);
                                return (
                                    <tr key={contract.id} className="hover:bg-brand-bg">
                                        <td className="px-4 py-3 font-mono text-xs">{contract.contractNumber}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-brand-text-light">{client?.name || contract.clientName1}</p>
                                            <p className="text-xs text-brand-text-secondary">{project?.projectName || 'N/A'}</p>
                                        </td>
                                        <td className="px-4 py-3">{formatDate(contract.signingDate)}</td>
                                        <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full ${signatureStatus.color}`}>{signatureStatus.text}</span></td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center space-x-1">
                                                <button onClick={() => handleOpenModal('view', contract)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Lihat"><EyeIcon className="w-5 h-5"/></button>
                                                <button onClick={() => handleOpenModal('edit', contract)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Edit"><PencilIcon className="w-5 h-5"/></button>
                                                <button onClick={() => handleDelete(contract.id)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Hapus"><Trash2Icon className="w-5 h-5"/></button>
                                                <button onClick={() => handleOpenQrModal(contract)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Bagikan Portal"><QrCodeIcon className="w-5 h-5"/></button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} title="Panduan Halaman Kontrak">
                 <div className="space-y-4 text-sm text-brand-text-primary">
                    <p>Halaman ini adalah pusat arsip digital untuk semua perjanjian kerja Anda.</p>
                    <ul className="list-disc list-inside space-y-2">
                        <li><strong>Buat Kontrak:</strong> Klik tombol "Buat Kontrak" untuk membuka formulir. Pilih klien dan proyek yang relevan, dan sebagian besar data akan terisi otomatis.</li>
                        <li><strong>E-Signature:</strong> Setelah kontrak dibuat, Anda dapat menandatanganinya secara digital. Klien juga dapat melakukan hal yang sama melalui Portal Klien mereka.</li>
                        <li><strong>Lacak Status:</strong> Pantau dengan mudah kontrak mana yang sudah lengkap, mana yang menunggu tanda tangan Anda, dan mana yang menunggu tanda tangan klien.</li>
                        <li><strong>Bagikan Portal:</strong> Gunakan ikon QR code untuk membagikan tautan Portal Klien, tempat mereka dapat melihat dan menandatangani kontrak.</li>
                    </ul>
                </div>
            </Modal>
            
            <Modal isOpen={isFormModalOpen} onClose={handleCloseModal} title={modalMode === 'add' ? 'Buat Kontrak Baru' : 'Edit Kontrak'} size="4xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="input-group">
                            <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className="input-field" required>
                                <option value="">Pilih Klien...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <label className="input-label">Klien</label>
                        </div>
                        <div className="input-group">
                            <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="input-field" required disabled={!selectedClientId}>
                                <option value="">Pilih Proyek...</option>
                                {availableProjects.map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}
                            </select>
                            <label className="input-label">Proyek</label>
                        </div>
                    </div>
                    <p className="text-sm text-brand-text-secondary pt-2">Memilih proyek akan mengisi sebagian besar data di bawah ini secara otomatis.</p>
                    
                    <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-4 pt-4">
                        <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2">Detail Penandatanganan</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="input-group"><input type="date" name="signingDate" value={formData.signingDate} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Tanggal TTD</label></div>
                            <div className="input-group"><input type="text" name="signingLocation" value={formData.signingLocation} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Lokasi TTD</label></div>
                        </div>

                        <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2 pt-4">Pihak Klien 1</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="input-group"><input type="text" name="clientName1" value={formData.clientName1} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Nama Klien 1</label></div>
                             <div className="input-group"><input type="text" name="clientPhone1" value={formData.clientPhone1} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Telepon Klien 1</label></div>
                        </div>
                        <div className="input-group"><input type="text" name="clientAddress1" value={formData.clientAddress1} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Alamat Klien 1</label></div>
                        
                        <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2 pt-4">Pihak Klien 2 (Opsional)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="input-group"><input type="text" name="clientName2" value={formData.clientName2} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Nama Klien 2</label></div>
                             <div className="input-group"><input type="text" name="clientPhone2" value={formData.clientPhone2} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Telepon Klien 2</label></div>
                        </div>
                        <div className="input-group"><input type="text" name="clientAddress2" value={formData.clientAddress2} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Alamat Klien 2</label></div>

                         <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2 pt-4">Ruang Lingkup Pekerjaan</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="input-group"><input type="text" name="shootingDuration" value={formData.shootingDuration} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Durasi Pemotretan</label></div>
                            <div className="input-group"><input type="text" name="guaranteedPhotos" value={formData.guaranteedPhotos} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Jumlah Foto Dijamin</label></div>
                         </div>
                         <div className="input-group"><input type="text" name="albumDetails" value={formData.albumDetails} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Detail Album</label></div>
                         <div className="input-group"><input type="text" name="otherItems" value={formData.otherItems} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Item Lainnya</label></div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="input-group"><input type="text" name="personnelCount" value={formData.personnelCount} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Jumlah Personel</label></div>
                            <div className="input-group"><input type="text" name="deliveryTimeframe" value={formData.deliveryTimeframe} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Waktu Pengerjaan</label></div>
                         </div>
                         
                         <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2 pt-4">Pembayaran & Hukum</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="input-group"><input type="date" name="dpDate" value={formData.dpDate} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Tanggal DP</label></div>
                            <div className="input-group"><input type="date" name="finalPaymentDate" value={formData.finalPaymentDate} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Tanggal Pelunasan</label></div>
                         </div>
                         <div className="input-group"><textarea name="cancellationPolicy" value={formData.cancellationPolicy} onChange={handleFormChange} className="input-field" placeholder=" " rows={4}></textarea><label className="input-label">Kebijakan Pembatalan</label></div>
                         <div className="input-group"><input type="text" name="jurisdiction" value={formData.jurisdiction} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Wilayah Hukum</label></div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-brand-border">
                        <button type="button" onClick={handleCloseModal} className="button-secondary">Batal</button>
                        <button type="submit" className="button-primary">{modalMode === 'add' ? 'Simpan' : 'Update'}</button>
                    </div>
                </form>
            </Modal>
            
            <Modal isOpen={isViewModalOpen} onClose={handleCloseModal} title={`Kontrak: ${selectedContract?.contractNumber}`} size="4xl">
                {selectedContract && (
                    <div>
                        <div className="printable-area max-h-[65vh] overflow-y-auto">{renderContractBody(selectedContract)}</div>
                        <div className="mt-6 flex justify-between items-center non-printable border-t border-brand-border pt-4">
                            <div className="text-sm">
                                <p className={`font-semibold ${selectedContract.vendorSignature ? 'text-green-500' : 'text-yellow-500'}`}>
                                    Status Anda: {selectedContract.vendorSignature ? 'Sudah TTD' : 'Belum TTD'}
                                </p>
                                <p className={`font-semibold ${selectedContract.clientSignature ? 'text-green-500' : 'text-yellow-500'}`}>
                                    Status Klien: {selectedContract.clientSignature ? 'Sudah TTD' : 'Belum TTD'}
                                </p>
                            </div>
                            <div className="space-x-2">
                                {!selectedContract.vendorSignature && (
                                    <button onClick={() => setIsSignatureModalOpen(true)} className="button-primary">
                                        Tanda Tangani Kontrak
                                    </button>
                                )}
                                <button type="button" onClick={() => window.print()} className="button-secondary inline-flex items-center gap-2">
                                    <PrinterIcon className="w-4 h-4"/> Cetak Penuh
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
            
             <Modal isOpen={isSignatureModalOpen} onClose={() => setIsSignatureModalOpen(false)} title="Bubuhkan Tanda Tangan Anda">
                <SignaturePad onClose={() => setIsSignatureModalOpen(false)} onSave={handleSaveSignature} />
            </Modal>

            {qrModalContent && (
                <Modal isOpen={!!qrModalContent} onClose={() => setQrModalContent(null)} title={qrModalContent.title} size="sm">
                    <div className="text-center p-4">
                        <div id="contract-portal-qrcode" className="p-4 bg-white rounded-lg inline-block mx-auto"></div>
                        <p className="text-xs text-brand-text-secondary mt-4 break-all">{qrModalContent.url}</p>
                        <div className="flex items-center gap-2 mt-6">
                            <button onClick={() => { navigator.clipboard.writeText(qrModalContent.url); showNotification('Tautan berhasil disalin!'); }} className="button-secondary w-full">Salin Tautan</button>
                            <button onClick={() => {
                                const canvas = document.querySelector('#contract-portal-qrcode canvas') as HTMLCanvasElement;
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
        </div>
    );
};
export default Contracts;