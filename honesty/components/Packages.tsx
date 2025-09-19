import React, { useState, useMemo, useEffect } from 'react';
import { Package, AddOn, Project, PhysicalItem, Profile } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import { PencilIcon, Trash2Icon, PlusIcon, Share2Icon, FileTextIcon, CameraIcon } from '../constants';
import { createPackage as createPackageRow, updatePackage as updatePackageRow, deletePackage as deletePackageRow } from '../services/packages';
import { createAddOn as createAddOnRow, updateAddOn as updateAddOnRow, deleteAddOn as deleteAddOnRow } from '../services/addOns';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

const emptyPackageForm = {
    name: '',
    price: '',
    category: '',
    processingTime: '',
    photographers: '',
    videographers: '',
    physicalItems: [{ name: '', price: '' as string | number }],
    digitalItems: [''],
    coverImage: '',
};
const emptyAddOnForm = { name: '', price: '' };

interface PackagesProps {
    packages: Package[];
    setPackages: React.Dispatch<React.SetStateAction<Package[]>>;
    addOns: AddOn[];
    setAddOns: React.Dispatch<React.SetStateAction<AddOn[]>>;
    projects: Project[];
    profile: Profile;
}

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});


const Packages: React.FC<PackagesProps> = ({ packages, setPackages, addOns, setAddOns, projects, profile }) => {
  const [packageFormData, setPackageFormData] = useState<any>(emptyPackageForm);
  const [packageEditMode, setPackageEditMode] = useState<string | null>(null);

  const [addOnFormData, setAddOnFormData] = useState(emptyAddOnForm);
  const [addOnEditMode, setAddOnEditMode] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const publicPackagesUrl = useMemo(() => {
    // A more robust solution would involve getting the vendor's unique ID
    const vendorId = 'VEN001'; // Placeholder for the default vendor
    return `${window.location.origin}${window.location.pathname}#/public-packages/${vendorId}`;
  }, []);

  const copyPackagesLinkToClipboard = () => {
      navigator.clipboard.writeText(publicPackagesUrl).then(() => {
          alert('Tautan halaman paket berhasil disalin!');
      });
  };

  const packagesByCategory = useMemo(() => {
    const grouped: Record<string, Package[]> = {};
    for (const pkg of packages) {
        const category = pkg.category || 'Tanpa Kategori';
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(pkg);
    }
    return grouped;
  }, [packages]);


  // --- Package Handlers ---
  const handlePackageInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPackageFormData(prev => ({...prev, [name]: value}));
  };
  
   const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            try {
                const file = e.target.files[0];
                // Check file size (max 2MB)
                if (file.size > 2 * 1024 * 1024) {
                    alert('Ukuran file tidak boleh melebihi 2MB');
                    e.target.value = ''; // Reset the input
                    return;
                }
                // Check file type
                if (!file.type.match('image.*')) {
                    alert('Hanya file gambar yang diperbolehkan');
                    e.target.value = ''; // Reset the input
                    return;
                }
                const base64 = await toBase64(file);
                setPackageFormData(prev => ({ ...prev, coverImage: base64 }));
            } catch (error) {
                console.error('Error uploading image:', error);
                alert('Terjadi kesalahan saat mengunggah gambar. Silakan coba lagi.');
                e.target.value = ''; // Reset the input
            }
        }
    };

  const handlePhysicalItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const list = [...packageFormData.physicalItems];
    list[index] = { ...list[index], [name]: value };
    setPackageFormData(prev => ({ ...prev, physicalItems: list }));
  };

  const addPhysicalItem = () => {
    setPackageFormData(prev => ({ ...prev, physicalItems: [...prev.physicalItems, { name: '', price: '' }] }));
  };

  const removePhysicalItem = (index: number) => {
    const list = [...packageFormData.physicalItems];
    list.splice(index, 1);
    setPackageFormData(prev => ({ ...prev, physicalItems: list }));
  };
  
  const handleDigitalItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const list = [...packageFormData.digitalItems];
    list[index] = value;
    setPackageFormData(prev => ({ ...prev, digitalItems: list }));
  };

  const addDigitalItem = () => {
    setPackageFormData(prev => ({ ...prev, digitalItems: [...prev.digitalItems, ''] }));
  };

  const removeDigitalItem = (index: number) => {
    const list = [...packageFormData.digitalItems];
    list.splice(index, 1);
    setPackageFormData(prev => ({ ...prev, digitalItems: list }));
  };


  const handlePackageCancelEdit = () => {
    setPackageEditMode(null);
    setPackageFormData(emptyPackageForm);
  }

  const handlePackageEdit = (pkg: Package) => {
    setPackageEditMode(pkg.id);
    setPackageFormData({
        name: pkg.name,
        price: pkg.price.toString(),
        category: pkg.category,
        processingTime: pkg.processingTime,
        photographers: pkg.photographers || '',
        videographers: pkg.videographers || '',
        physicalItems: pkg.physicalItems.length > 0 ? pkg.physicalItems.map(item => ({...item, price: item.price.toString()})) : [{ name: '', price: '' }],
        digitalItems: pkg.digitalItems.length > 0 ? pkg.digitalItems : [''],
        coverImage: pkg.coverImage || '',
    });
  }

  const handlePackageDelete = async (pkgId: string) => {
    const isPackageInUse = projects.some(p => p.packageId === pkgId);
    if (isPackageInUse) {
        alert("Paket ini tidak dapat dihapus karena sedang digunakan oleh satu atau lebih proyek. Hapus atau ubah proyek tersebut terlebih dahulu.");
        return;
    }

    if (!window.confirm("Apakah Anda yakin ingin menghapus paket ini?")) return;
    try {
        await deletePackageRow(pkgId);
        setPackages(prev => prev.filter(p => p.id !== pkgId));
    } catch (e) {
        alert('Gagal menghapus paket di database. Coba lagi.');
    }
  }

  const handlePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageFormData.name || !packageFormData.price) {
        alert('Nama Paket dan Harga tidak boleh kosong.');
        return;
    }

    const packageData: Omit<Package, 'id'> = {
        name: packageFormData.name,
        price: Number(packageFormData.price),
        category: packageFormData.category,
        processingTime: packageFormData.processingTime,
        photographers: packageFormData.photographers,
        videographers: packageFormData.videographers,
        physicalItems: packageFormData.physicalItems
            .filter((item: PhysicalItem) => typeof item.name === 'string' && item.name.trim() !== '')
            .map((item: { name: string, price: string | number }) => ({ ...item, name: item.name, price: Number(item.price || 0) })),
        digitalItems: packageFormData.digitalItems.filter((item: string) => item.trim() !== ''),
        coverImage: packageFormData.coverImage,
    };
    
    try {
        if (packageEditMode !== 'new' && packageEditMode) {
            try {
                const updated = await updatePackageRow(packageEditMode, packageData);
                setPackages(prev => prev.map(p => p.id === packageEditMode ? updated : p));
            } catch (e: any) {
                console.warn('[Supabase][packages.update] gagal, fallback create. Detail:', e);
                // Kemungkinan paket lama hanya lokal (belum ada row di DB). Coba create baru lalu replace di state.
                const created = await createPackageRow(packageData as any);
                setPackages(prev => prev.map(p => p.id === packageEditMode ? created : p));
            }
        } else {
            const created = await createPackageRow(packageData as any);
            setPackages(prev => [...prev, created]);
        }
    } catch (err: any) {
        console.error('[Supabase][packages.save] error:', err);
        alert(`Gagal menyimpan paket ke database. ${err?.message || 'Coba lagi.'}`);
        return;
    }

    handlePackageCancelEdit();
  };

  // --- AddOn Handlers ---
  const handleAddOnInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddOnFormData(prev => ({...prev, [name]: value}));
  };
  
    const handleAddOnSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addOnFormData.name || !addOnFormData.price) {
            alert('Nama Add-On dan Harga tidak boleh kosong.');
            return;
        }

        const addOnData: Omit<AddOn, 'id'> = {
            name: addOnFormData.name,
            price: Number(addOnFormData.price),
        };
        
        try {
            if (addOnEditMode) {
                try {
                    const updated = await updateAddOnRow(addOnEditMode, addOnData);
                    setAddOns(prev => prev.map(a => a.id === addOnEditMode ? updated : a));
                } catch (e: any) {
                    console.warn('[Supabase][addOns.update] gagal, fallback create. Detail:', e);
                    const created = await createAddOnRow(addOnData as any);
                    setAddOns(prev => prev.map(a => a.id === addOnEditMode ? created : a));
                }
            } else {
                const created = await createAddOnRow(addOnData as any);
                setAddOns(prev => [...prev, created]);
            }
        } catch (err: any) {
            console.error('[Supabase][addOns.save] error:', err);
            alert(`Gagal menyimpan add-on ke database. ${err?.message || 'Coba lagi.'}`);
            return;
        }

        handleAddOnCancelEdit();
    };

  const handleAddOnCancelEdit = () => {
    setAddOnEditMode(null);
    setAddOnFormData(emptyAddOnForm);
  }

  const handleAddOnEdit = (addOn: AddOn) => {
    setAddOnEditMode(addOn.id);
    setAddOnFormData({
        name: addOn.name,
        price: addOn.price.toString(),
    });
  }

  const handleAddOnDelete = async (addOnId: string) => {
    const isAddOnInUse = projects.some(p => p.addOns.some(a => a.id === addOnId));
    if (isAddOnInUse) {
        alert("Add-on ini tidak dapat dihapus karena sedang digunakan oleh satu atau lebih proyek. Hapus atau ubah proyek tersebut terlebih dahulu.");
        return;
    }

    if (!window.confirm("Apakah Anda yakin ingin menghapus add-on ini?")) return;
    try {
        await deleteAddOnRow(addOnId);
        setAddOns(prev => prev.filter(p => p.id !== addOnId));
    } catch (e) {
        alert('Gagal menghapus add-on di database. Coba lagi.');
    }
  };

  return (
        <div className="space-y-6">
            <PageHeader title="Manajemen Paket & Add-On" subtitle="Kelola semua paket layanan dan item tambahan yang Anda tawarkan.">
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsInfoModalOpen(true)} className="button-secondary">Pelajari Halaman Ini</button>
                    <button onClick={() => setIsShareModalOpen(true)} className="button-secondary inline-flex items-center gap-2">
                        <Share2Icon className="w-4 h-4" /> Bagikan Halaman Paket
                    </button>
                    <button onClick={() => setPackageEditMode('new')} className="button-primary inline-flex items-center gap-2">
                        <PlusIcon className="w-5 h-5"/> Tambah Paket
                    </button>
                </div>
            </PageHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    {(Object.entries(packagesByCategory) as [string, Package[]][]).map(([category, pkgs]) => (
                        <div key={category}>
                            <h3 className="text-xl font-bold text-gradient mb-4">{category}</h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                {pkgs.map(pkg => (
                                    <div key={pkg.id} className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border flex flex-col overflow-hidden">
                                        {pkg.coverImage ? (
                                            <img src={pkg.coverImage} alt={pkg.name} className="w-full h-40 object-cover" />
                                        ) : (
                                            <div className="w-full h-40 bg-brand-bg flex items-center justify-center">
                                                <CameraIcon className="w-12 h-12 text-brand-text-secondary" />
                                            </div>
                                        )}
                                        <div className="p-4 flex-grow flex flex-col">
                                            <h4 className="font-bold text-brand-text-light">{pkg.name}</h4>
                                            <p className="text-2xl font-bold text-brand-accent my-2">{formatCurrency(pkg.price)}</p>
                                            <p className="text-xs text-brand-text-secondary mb-3">Waktu Pengerjaan: {pkg.processingTime}</p>
                                            <div className="text-sm space-y-2 flex-grow">
                                                {(pkg.photographers || pkg.videographers) && <div><h5 className="font-semibold text-brand-text-primary text-xs uppercase tracking-wider mb-1">Tim</h5><p className="text-brand-text-secondary">{[pkg.photographers, pkg.videographers].filter(Boolean).join(' & ')}</p></div>}
                                                {pkg.digitalItems.length > 0 && <div><h5 className="font-semibold text-brand-text-primary text-xs uppercase tracking-wider mb-1">Digital</h5><ul className="list-disc list-inside text-brand-text-secondary">{pkg.digitalItems.map((item, i) => <li key={i}>{item}</li>)}</ul></div>}
                                                {pkg.physicalItems.length > 0 && <div><h5 className="font-semibold text-brand-text-primary text-xs uppercase tracking-wider mb-1">Fisik</h5><ul className="list-disc list-inside text-brand-text-secondary">{pkg.physicalItems.map((item, i) => <li key={i}>{item.name}</li>)}</ul></div>}
                                            </div>
                                            <div className="flex gap-2 mt-4 pt-4 border-t border-brand-border">
                                                <button onClick={() => handlePackageEdit(pkg)} className="button-secondary flex-1 text-sm">Edit</button>
                                                <button onClick={() => handlePackageDelete(pkg.id)} className="button-secondary text-brand-danger border-brand-danger hover:bg-brand-danger/10 flex-shrink-0 px-3"><Trash2Icon className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                
                <aside className="lg:col-span-1 space-y-6 sticky top-24">
                    <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                        <h3 className="font-semibold text-brand-text-light p-4 border-b border-brand-border">Add-Ons</h3>
                        <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
                            {addOns.map(addon => (
                                <div key={addon.id} className="flex justify-between items-center bg-brand-bg p-2 rounded-md text-sm">
                                    <span className="text-brand-text-primary">{addon.name} - {formatCurrency(addon.price)}</span>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleAddOnEdit(addon)} className="p-1.5 text-brand-text-secondary hover:text-brand-accent"><PencilIcon className="w-4 h-4"/></button>
                                        <button onClick={() => handleAddOnDelete(addon.id)} className="p-1.5 text-brand-text-secondary hover:text-brand-danger"><Trash2Icon className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleAddOnSubmit} className="p-4 border-t border-brand-border space-y-2">
                             <div className="input-group">
                                <input type="text" id="addOnName" name="name" value={addOnFormData.name} onChange={handleAddOnInputChange} className="input-field" placeholder=" " required />
                                <label htmlFor="addOnName" className="input-label">{addOnEditMode ? 'Edit Nama' : 'Nama Add-On Baru'}</label>
                            </div>
                             <div className="input-group">
                                <input type="number" id="addOnPrice" name="price" value={addOnFormData.price} onChange={handleAddOnInputChange} className="input-field" placeholder=" " required />
                                <label htmlFor="addOnPrice" className="input-label">Harga</label>
                            </div>
                            <div className="flex gap-2 justify-end">
                                {addOnEditMode && <button type="button" onClick={handleAddOnCancelEdit} className="button-secondary text-sm">Batal</button>}
                                <button type="submit" className="button-primary text-sm">{addOnEditMode ? 'Update' : 'Tambah'}</button>
                            </div>
                        </form>
                    </div>
                </aside>
            </div>

            <Modal isOpen={packageEditMode !== null} onClose={handlePackageCancelEdit} title={packageEditMode === 'new' ? 'Tambah Paket Baru' : 'Edit Paket'} size="3xl">
                <form onSubmit={handlePackageSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="input-group"><input type="text" name="name" value={packageFormData.name} onChange={handlePackageInputChange} className="input-field" placeholder=" " required /><label className="input-label">Nama Paket</label></div>
                        <div className="input-group"><input type="number" name="price" value={packageFormData.price} onChange={handlePackageInputChange} className="input-field" placeholder=" " required /><label className="input-label">Harga (IDR)</label></div>
                    </div>
                     <div className="input-group">
                        <select name="category" value={packageFormData.category} onChange={handlePackageInputChange} className="input-field" required>
                            <option value="">Pilih kategori...</option>
                            {profile.packageCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <label className="input-label">Kategori</label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="input-group"><input type="text" name="processingTime" value={packageFormData.processingTime} onChange={handlePackageInputChange} className="input-field" placeholder=" "/><label className="input-label">Waktu Pengerjaan</label></div>
                        <div className="input-group"><input type="text" name="photographers" value={packageFormData.photographers} onChange={handlePackageInputChange} className="input-field" placeholder=" "/><label className="input-label">Jumlah Fotografer</label></div>
                        <div className="input-group"><input type="text" name="videographers" value={packageFormData.videographers} onChange={handlePackageInputChange} className="input-field" placeholder=" "/><label className="input-label">Jumlah Videografer</label></div>
                    </div>
                    
                    <div className="input-group"><label className="input-label !static !-top-4 !text-brand-accent">Cover Image</label><input type="file" onChange={handleCoverImageChange} className="input-field" accept="image/*" /></div>
                    
                    <div className="pt-2"><h4 className="font-semibold text-brand-text-light">Item Digital</h4>{packageFormData.digitalItems.map((item: string, index: number) => (<div key={index} className="flex items-center gap-2 mt-1"><input type="text" value={item} onChange={e => handleDigitalItemChange(index, e)} className="input-field flex-grow" /><button type="button" onClick={() => removeDigitalItem(index)} className="p-2 text-brand-danger"><Trash2Icon className="w-4 h-4"/></button></div>))}<button type="button" onClick={addDigitalItem} className="text-sm font-semibold text-brand-accent mt-2">+ Tambah Item</button></div>
                    <div className="pt-2"><h4 className="font-semibold text-brand-text-light">Item Fisik</h4>{packageFormData.physicalItems.map((item: {name: string, price: string|number}, index: number) => (<div key={index} className="flex items-center gap-2 mt-1"><input type="text" name="name" value={item.name} onChange={e => handlePhysicalItemChange(index, e)} className="input-field flex-grow" placeholder="Nama Item" /><input type="number" name="price" value={item.price} onChange={e => handlePhysicalItemChange(index, e)} className="input-field w-32" placeholder="Harga" /><button type="button" onClick={() => removePhysicalItem(index)} className="p-2 text-brand-danger"><Trash2Icon className="w-4 h-4"/></button></div>))}<button type="button" onClick={addPhysicalItem} className="text-sm font-semibold text-brand-accent mt-2">+ Tambah Item</button></div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-brand-border"><button type="button" onClick={handlePackageCancelEdit} className="button-secondary">Batal</button><button type="submit" className="button-primary">{packageEditMode === 'new' ? 'Simpan' : 'Update'}</button></div>
                </form>
            </Modal>

            <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Bagikan Halaman Paket Publik">
                <p className="text-sm text-brand-text-secondary mb-4">Bagikan tautan ini kepada calon klien untuk melihat semua paket yang Anda tawarkan.</p>
                <div className="input-group"><input type="text" readOnly value={publicPackagesUrl} className="input-field !bg-brand-input" /><label className="input-label">Tautan Publik</label></div>
                <div className="text-right mt-4"><button onClick={copyPackagesLinkToClipboard} className="button-primary">Salin Tautan</button></div>
            </Modal>
            
            <Modal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} title="Panduan Halaman Paket">
                <div className="space-y-4 text-sm text-brand-text-primary">
                    <p>Halaman ini adalah tempat Anda membuat dan mengelola semua penawaran produk Anda.</p>
                    <ul className="list-disc list-inside space-y-2">
                        <li><strong>Paket:</strong> Kolom utama di kiri menampilkan semua paket layanan Anda, dikelompokkan berdasarkan kategori. Anda dapat menambah, mengedit, atau menghapus paket.</li>
                        <li><strong>Add-Ons:</strong> Kolom di kanan adalah untuk item tambahan yang bisa dipilih klien, seperti drone, MUA, dll.</li>
                        <li><strong>Cover Image:</strong> Anda bisa menambahkan gambar sampul untuk setiap paket agar lebih menarik secara visual di halaman publik.</li>
                        <li><strong>Bagikan Halaman Paket:</strong> Gunakan tombol di kanan atas untuk mendapatkan tautan ke halaman publik yang menampilkan semua paket Anda, siap untuk dibagikan kepada calon klien.</li>
                        <li><strong>Kategori:</strong> Kategori untuk paket dapat dikelola di halaman <strong>Pengaturan &gt; Kustomisasi Kategori</strong>.</li>
                    </ul>
                </div>
            </Modal>
        </div>
    );
};

export default Packages;
