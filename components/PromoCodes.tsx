import React, { useState } from 'react';
import { PromoCode, Project } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import { PlusIcon, PencilIcon, Trash2Icon } from '../constants';
import { createPromoCode, updatePromoCode, deletePromoCode } from '../services/promoCodes';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

const emptyFormState = {
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '',
    isActive: true,
    maxUsage: '',
    expiryDate: ''
};

interface PromoCodesProps {
    promoCodes: PromoCode[];
    setPromoCodes: React.Dispatch<React.SetStateAction<PromoCode[]>>;
    projects: Project[];
    showNotification: (message: string) => void;
}

const PromoCodes: React.FC<PromoCodesProps> = ({ promoCodes, setPromoCodes, projects, showNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedCode, setSelectedCode] = useState<PromoCode | null>(null);
    const [formData, setFormData] = useState(emptyFormState);

    const handleOpenModal = (mode: 'add' | 'edit', code?: PromoCode) => {
        setModalMode(mode);
        if (mode === 'edit' && code) {
            setSelectedCode(code);
            setFormData({
                code: code.code,
                discountType: code.discountType,
                discountValue: code.discountValue.toString(),
                isActive: code.isActive,
                maxUsage: code.maxUsage?.toString() || '',
                expiryDate: code.expiryDate || '',
            });
        } else {
            setSelectedCode(null);
            setFormData(emptyFormState);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const checked = isCheckbox ? (e.target as HTMLInputElement).checked : false;

        setFormData(prev => ({
            ...prev,
            [name]: isCheckbox ? checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (modalMode === 'add') {
                const created = await createPromoCode({
                    code: formData.code.toUpperCase(),
                    discountType: formData.discountType,
                    discountValue: Number(formData.discountValue),
                    isActive: formData.isActive,
                    maxUsage: formData.maxUsage ? Number(formData.maxUsage) : undefined,
                    expiryDate: formData.expiryDate || undefined,
                } as any);
                setPromoCodes(prev => [...prev, created]);
                showNotification(`Kode promo "${created.code}" berhasil dibuat.`);
            } else if (selectedCode) {
                const updated = await updatePromoCode(selectedCode.id, {
                    code: formData.code.toUpperCase(),
                    discountType: formData.discountType,
                    discountValue: Number(formData.discountValue),
                    isActive: formData.isActive,
                    maxUsage: formData.maxUsage ? Number(formData.maxUsage) : undefined,
                    expiryDate: formData.expiryDate || undefined,
                } as any);
                setPromoCodes(prev => prev.map(c => c.id === selectedCode.id ? updated : c));
                showNotification(`Kode promo "${updated.code}" berhasil diperbarui.`);
            }
        } catch (err) {
            alert('Gagal menyimpan kode promo ke database. Coba lagi.');
            return;
        }
        handleCloseModal();
    };

    const handleDelete = async (codeId: string) => {
        const isUsed = projects.some(p => p.promoCodeId === codeId);
        if (isUsed) {
            showNotification('Kode promo tidak dapat dihapus karena sedang digunakan pada proyek.');
            return;
        }
        if (!window.confirm("Apakah Anda yakin ingin menghapus kode promo ini?")) return;
        try {
            await deletePromoCode(codeId);
            setPromoCodes(prev => prev.filter(c => c.id !== codeId));
            showNotification('Kode promo berhasil dihapus.');
        } catch (err) {
            alert('Gagal menghapus kode promo di database. Coba lagi.');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Manajemen Kode Promo" subtitle="Buat dan kelola kode diskon untuk klien Anda.">
                <button onClick={() => handleOpenModal('add')} className="button-primary inline-flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" />
                    Buat Kode Baru
                </button>
            </PageHeader>

            <div className="bg-brand-surface p-4 rounded-xl shadow-lg border border-brand-border">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-brand-text-secondary uppercase">
                            <tr>
                                <th className="px-4 py-3">Kode</th>
                                <th className="px-4 py-3">Diskon</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Penggunaan</th>
                                <th className="px-4 py-3">Kadaluwarsa</th>
                                <th className="px-4 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {promoCodes.map(code => (
                                <tr key={code.id} className="hover:bg-brand-bg">
                                    <td className="px-4 py-3 font-semibold text-brand-text-light">{code.code}</td>
                                    <td className="px-4 py-3">
                                        {code.discountType === 'percentage'
                                            ? `${code.discountValue}%`
                                            : formatCurrency(code.discountValue)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${code.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {code.isActive ? 'Aktif' : 'Tidak Aktif'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">{code.usageCount} / {code.maxUsage ?? '∞'}</td>
                                    <td className="px-4 py-3">{code.expiryDate ? new Date(code.expiryDate).toLocaleDateString('id-ID') : 'Tidak ada'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center space-x-1">
                                            <button onClick={() => handleOpenModal('edit', code)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Edit"><PencilIcon className="w-5 h-5" /></button>
                                            <button onClick={() => handleDelete(code.id)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Hapus"><Trash2Icon className="w-5 h-5" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalMode === 'add' ? 'Buat Kode Promo Baru' : 'Edit Kode Promo'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="input-group">
                            <input type="text" id="code" name="code" value={formData.code} onChange={handleFormChange} className="input-field" placeholder=" " required />
                            <label htmlFor="code" className="input-label">Kode Promo</label>
                        </div>
                        <div className="input-group">
                            <select id="discountType" name="discountType" value={formData.discountType} onChange={handleFormChange} className="input-field">
                                <option value="percentage">Persentase</option>
                                <option value="fixed">Nominal Tetap</option>
                            </select>
                            <label htmlFor="discountType" className="input-label">Jenis Diskon</label>
                        </div>
                    </div>
                    <div className="input-group">
                        <input type="number" id="discountValue" name="discountValue" value={formData.discountValue} onChange={handleFormChange} className="input-field" placeholder=" " required />
                        <label htmlFor="discountValue" className="input-label">{formData.discountType === 'percentage' ? 'Nilai Persentase (%)' : 'Jumlah Diskon (IDR)'}</label>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="input-group">
                            <input type="number" id="maxUsage" name="maxUsage" value={formData.maxUsage} onChange={handleFormChange} className="input-field" placeholder=" " />
                            <label htmlFor="maxUsage" className="input-label">Maks. Penggunaan (kosongkan = ∞)</label>
                        </div>
                         <div className="input-group">
                            <input type="date" id="expiryDate" name="expiryDate" value={formData.expiryDate} onChange={handleFormChange} className="input-field" placeholder=" " />
                            <label htmlFor="expiryDate" className="input-label">Tanggal Kadaluwarsa (kosongkan = ∞)</label>
                        </div>
                    </div>
                     <div className="flex items-center gap-3 pt-2">
                        <input type="checkbox" id="isActive" name="isActive" checked={formData.isActive} onChange={handleFormChange} className="h-4 w-4 rounded" />
                        <label htmlFor="isActive" className="text-sm font-medium">Aktifkan Kode Promo</label>
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

export default PromoCodes;