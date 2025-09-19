import React, { useState, useMemo } from 'react';
import { Lead, LeadStatus, ContactChannel, Profile, PublicLeadFormProps } from '../types';
import { createLead } from '../services/leads';
import { cleanPhoneNumber } from '../constants';

const PublicLeadForm: React.FC<PublicLeadFormProps> = ({ setLeads, userProfile, showNotification }) => {
    const [formState, setFormState] = useState({
        name: '',
        whatsapp: '',
        eventType: userProfile.projectTypes[0] || '',
        eventDate: '',
        eventLocation: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const template = userProfile.publicPageConfig.template || 'classic';

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const notes = `Jenis Acara: ${formState.eventType}\nTanggal Acara: ${new Date(formState.eventDate).toLocaleDateString('id-ID')}\nLokasi Acara: ${formState.eventLocation}`;

        try {
            const created = await createLead({
                name: formState.name,
                whatsapp: formState.whatsapp,
                contactChannel: ContactChannel.WEBSITE,
                location: formState.eventLocation,
                status: LeadStatus.DISCUSSION,
                date: new Date().toISOString(),
                notes,
            });
            setLeads(prev => [created, ...prev]);
            setIsSubmitted(true);
            showNotification('Prospek baru diterima dari formulir web.');
        } catch (err: any) {
            alert('Gagal mengirim formulir. Silakan coba lagi.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Simple logo for branding
    const Logo = () => (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="20" fill="#FFF27A"/>
            <path d="M15.44 26L12 19.6667L15.44 13.3333H22.32L25.76 19.6667L22.32 26H15.44ZM17.18 23.8333H20.58L22.32 20.5833L20.58 17.3333H17.18L15.44 20.5833L17.18 23.8333Z" fill="#1E1E21"/>
        </svg>
    );

    if (isSubmitted) {
        return (
            <div className={`template-wrapper template-${template} flex items-center justify-center min-h-screen p-4`}>
                <div className="w-full max-w-lg p-8 text-center bg-public-surface rounded-2xl shadow-lg border border-public-border">
                    <h1 className="text-2xl font-bold text-gradient">Terima Kasih!</h1>
                    <p className="mt-4 text-public-text-primary">
                        Formulir Anda telah berhasil kami terima. Tim kami akan segera menghubungi Anda melalui WhatsApp untuk diskusi lebih lanjut.
                    </p>
                    <a
                        href={`https://wa.me/${cleanPhoneNumber(userProfile.phone)}?text=Halo%20${encodeURIComponent(userProfile.companyName)}%2C%20saya%20sudah%20mengisi%20formulir%20prospek.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-6 button-primary inline-block"
                    >
                        Konfirmasi via WhatsApp
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className={`template-wrapper template-${template} flex items-center justify-center min-h-screen p-4`}>
             <style>{`
                .template-wrapper { background-color: var(--public-bg); color: var(--public-text-primary); }
                .template-classic .form-container { max-width: 42rem; width: 100%; margin: auto; }
                .template-modern .form-container { max-width: 56rem; width: 100%; margin: auto; display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; align-items: center; }
                .template-gallery .form-container { max-width: 36rem; width: 100%; margin: auto; font-family: serif; }
                @media (max-width: 768px) { .template-modern .form-container { grid-template-columns: 1fr; } }
            `}</style>
            <div className="form-container">
                {template === 'modern' && (
                    <div className="p-8 hidden md:block">
                        {userProfile.logoBase64 ? <img src={userProfile.logoBase64} alt="logo" className="h-12 mb-4" /> : <h2 className="text-2xl font-bold text-gradient">{userProfile.companyName}</h2>}
                        <p className="text-public-text-secondary text-sm mt-4">{userProfile.bio}</p>
                    </div>
                )}
                <div className="bg-public-surface p-4 sm:p-6 md:p-8 rounded-2xl shadow-lg border border-public-border">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <Logo />
                        </div>
                        <h1 className="text-3xl font-bold text-gradient">Formulir Kontak {userProfile.companyName}</h1>
                        <div className="text-sm text-public-text-secondary mt-4 space-y-2">
                            <p>Hai! Terimakasih telah menghubungi #venapictures</p>
                            <p>Perkenalkan aku Nina! (๑•ᴗ•๑)♡</p>
                            <p>Untuk informasi mengenai pricelist dan availability, mohon mengisi data berikut ya!</p>
                            <p>Chat kamu akan di balas secepatnya! Terimakasih )</p>
                        </div>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="input-group">
                            <input type="text" id="name" name="name" value={formState.name} onChange={handleFormChange} className="input-field" placeholder=" " required />
                            <label htmlFor="name" className="input-label">Nama Lengkap</label>
                        </div>
                        <div className="input-group">
                            <input type="tel" id="whatsapp" name="whatsapp" value={formState.whatsapp} onChange={handleFormChange} className="input-field" placeholder=" " required />
                            <label htmlFor="whatsapp" className="input-label">Nomor WhatsApp</label>
                        </div>
                        <div className="input-group">
                            <select id="eventType" name="eventType" value={formState.eventType} onChange={handleFormChange} className="input-field" required>
                                {userProfile.projectTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                            </select>
                            <label htmlFor="eventType" className="input-label">Jenis Acara</label>
                        </div>
                        <div className="input-group">
                            <input type="date" id="eventDate" name="eventDate" value={formState.eventDate} onChange={handleFormChange} className="input-field" placeholder=" " required />
                            <label htmlFor="eventDate" className="input-label">Tanggal Acara</label>
                        </div>
                         <div className="input-group">
                            <input type="text" id="eventLocation" name="eventLocation" value={formState.eventLocation} onChange={handleFormChange} className="input-field" placeholder=" " required />
                            <label htmlFor="eventLocation" className="input-label">Lokasi (Kota)</label>
                        </div>

                        <div className="pt-6">
                            <button type="submit" disabled={isSubmitting} className="w-full button-primary">
                                {isSubmitting ? 'Mengirim...' : 'Kirim Informasi'}
                            </button>
                            <a
                                href={`https://wa.me/${cleanPhoneNumber(userProfile.phone)}?text=Halo%20${encodeURIComponent(userProfile.companyName)}%2C%20saya%20tertarik%20dengan%20layanan%20Anda.`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full block mt-3 button-secondary text-center"
                            >
                                Atau Hubungi via WhatsApp
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PublicLeadForm;
