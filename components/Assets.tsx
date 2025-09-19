import React, { useState, useMemo } from 'react';
import { Asset, AssetStatus, Profile } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import StatCard from './StatCard';
import { PencilIcon, Trash2Icon, PlusIcon, DollarSignIcon, CameraIcon, SettingsIcon, UsersIcon } from '../constants';
import { createAsset as createAssetRow, updateAsset as updateAssetRow, deleteAsset as deleteAssetRow } from '../services/assets';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

const getStatusClass = (status: AssetStatus) => {
    switch (status) {
        case AssetStatus.AVAILABLE: return 'bg-green-500/20 text-green-400';
        case AssetStatus.IN_USE: return 'bg-blue-500/20 text-blue-400';
        case AssetStatus.MAINTENANCE: return 'bg-yellow-500/20 text-yellow-400';
        default: return 'bg-gray-500/20 text-gray-400';
    }
};

const emptyFormState = {
    name: '',
    category: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    serialNumber: '',
    status: AssetStatus.AVAILABLE,
    notes: '',
};

interface AssetsProps {
    assets: Asset[];
    setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
    profile: Profile;
    showNotification: (message: string) => void;
}

export const Assets: React.FC<AssetsProps> = ({ assets, setAssets, profile, showNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [formData, setFormData] = useState(emptyFormState);

    const stats = useMemo(() => {
        const totalValue = assets.reduce((sum, a) => sum + a.purchasePrice, 0);
        const inUseCount = assets.filter(a => a.status === AssetStatus.IN_USE).length;
        const maintenanceCount = assets.filter(a => a.status === AssetStatus.MAINTENANCE).length;
        return { totalValue, inUseCount, maintenanceCount };
    }, [assets]);

    const handleOpenModal = (mode: 'add' | 'edit', asset?: Asset) => {
        setModalMode(mode);
        if (mode === 'edit' && asset) {
            setSelectedAsset(asset);
            setFormData({
                ...asset,
                purchasePrice: asset.purchasePrice.toString(),
                serialNumber: asset.serialNumber || '',
                notes: asset.notes || '',
            });
        } else {
            setSelectedAsset(null);
            setFormData({
                ...emptyFormState,
                category: profile.assetCategories[0] || '',
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const assetData = {
            ...formData,
            purchasePrice: Number(formData.purchasePrice)
        } as Omit<Asset, 'id'>;
        
        try {
            if (modalMode === 'add') {
                const created = await createAssetRow(assetData);
                setAssets(prev => [...prev, created]);
                showNotification(`Aset "${created.name}" berhasil ditambahkan.`);
            } else if (selectedAsset) {
                try {
                    const updated = await updateAssetRow(selectedAsset.id, assetData);
                    setAssets(prev => prev.map(a => a.id === selectedAsset.id ? updated : a));
                    showNotification(`Aset "${updated.name}" berhasil diperbarui.`);
                } catch (err: any) {
                    // Jika update gagal karena row belum ada di DB (aset lama lokal), fallback create
                    const created = await createAssetRow(assetData);
                    setAssets(prev => prev.map(a => a.id === selectedAsset.id ? created : a));
                    showNotification(`Aset baru "${created.name}" berhasil dibuat (fallback).`);
                }
            }
            handleCloseModal();
        } catch (err: any) {
            console.error('[Supabase][assets.save] error:', err);
            alert(`Gagal menyimpan aset ke database. ${err?.message || 'Coba lagi.'}`);
        }
    };

    const handleDelete = async (assetId: string) => {
        if (!window.confirm("Apakah Anda yakin ingin menghapus aset ini?")) return;
        try {
            await deleteAssetRow(assetId);
            setAssets(prev => prev.filter(a => a.id !== assetId));
            showNotification('Aset berhasil dihapus.');
        } catch (err: any) {
            console.error('[Supabase][assets.delete] error:', err);
            alert(`Gagal menghapus aset di database. ${err?.message || 'Coba lagi.'}`);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Manajemen Aset" subtitle="Lacak semua peralatan dan aset fisik bisnis Anda.">
                <button onClick={() => handleOpenModal('add')} className="button-primary inline-flex items-center gap-2">
                    <PlusIcon className="w-5 h-5"/> Tambah Aset
                </button>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={<CameraIcon className="w-6 h-6"/>} title="Total Aset" value={assets.length.toString()} />
                <StatCard icon={<DollarSignIcon className="w-6 h-6"/>} title="Total Nilai Aset" value={formatCurrency(stats.totalValue)} />
                <StatCard icon={<SettingsIcon className="w-6 h-6"/>} title="Dalam Perbaikan" value={stats.maintenanceCount.toString()} />
                <StatCard icon={<UsersIcon className="w-6 h-6"/>} title="Sedang Digunakan" value={stats.inUseCount.toString()} />
            </div>

            <div className="bg-brand-surface p-4 rounded-xl shadow-lg border border-brand-border">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-brand-text-secondary uppercase">
                            <tr>
                                <th className="px-4 py-3">Nama Aset</th>
                                <th className="px-4 py-3">Kategori</th>
                                <th className="px-4 py-3">Tgl. Beli</th>
                                <th className="px-4 py-3">Harga Beli</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {assets.map(asset => (
                                <tr key={asset.id} className="hover:bg-brand-bg">
                                    <td className="px-4 py-3 font-semibold text-brand-text-light">{asset.name}</td>
                                    <td className="px-4 py-3">{asset.category}</td>
                                    <td className="px-4 py-3">{new Date(asset.purchaseDate).toLocaleDateString('id-ID')}</td>
                                    <td className="px-4 py-3">{formatCurrency(asset.purchasePrice)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(asset.status)}`}>
                                            {asset.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center space-x-1">
                                            <button onClick={() => handleOpenModal('edit', asset)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Edit"><PencilIcon className="w-5 h-5"/></button>
                                            <button onClick={() => handleDelete(asset.id)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Hapus"><Trash2Icon className="w-5 h-5"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalMode === 'add' ? 'Tambah Aset Baru' : 'Edit Aset'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="input-group">
                        <input type="text" id="name" name="name" value={formData.name} onChange={handleFormChange} className="input-field" placeholder=" " required />
                        <label htmlFor="name" className="input-label">Nama Aset</label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="input-group">
                            <select id="category" name="category" value={formData.category} onChange={handleFormChange} className="input-field" required>
                                <option value="">Pilih Kategori...</option>
                                {profile.assetCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                             <label htmlFor="category" className="input-label">Kategori</label>
                        </div>
                        <div className="input-group">
                            <input type="date" id="purchaseDate" name="purchaseDate" value={formData.purchaseDate} onChange={handleFormChange} className="input-field" placeholder=" " required />
                            <label htmlFor="purchaseDate" className="input-label">Tanggal Beli</label>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="input-group">
                            <input type="number" id="purchasePrice" name="purchasePrice" value={formData.purchasePrice} onChange={handleFormChange} className="input-field" placeholder=" " required />
                            <label htmlFor="purchasePrice" className="input-label">Harga Beli (IDR)</label>
                        </div>
                        <div className="input-group">
                            <input type="text" id="serialNumber" name="serialNumber" value={formData.serialNumber} onChange={handleFormChange} className="input-field" placeholder=" " />
                            <label htmlFor="serialNumber" className="input-label">Nomor Seri (Opsional)</label>
                        </div>
                    </div>
                    <div className="input-group">
                        <select id="status" name="status" value={formData.status} onChange={handleFormChange} className="input-field">
                            {Object.values(AssetStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <label htmlFor="status" className="input-label">Status</label>
                    </div>
                    <div className="input-group">
                        <textarea id="notes" name="notes" value={formData.notes} onChange={handleFormChange} className="input-field" placeholder=" " rows={3}></textarea>
                        <label htmlFor="notes" className="input-label">Catatan (Opsional)</label>
                    </div>
                     <div className="flex justify-end gap-3 pt-6 border-t border-brand-border">
                        <button type="button" onClick={handleCloseModal} className="button-secondary">Batal</button>
                        <button type="submit" className="button-primary">{modalMode === 'add' ? 'Simpan' : 'Update'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};