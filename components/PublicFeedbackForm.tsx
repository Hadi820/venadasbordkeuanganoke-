import React, { useState } from 'react';
import { ClientFeedback, SatisfactionLevel } from '../types';
import { StarIcon } from '../constants';
import { createClientFeedback } from '../services/clientFeedback';

interface PublicFeedbackFormProps {
    setClientFeedback: React.Dispatch<React.SetStateAction<ClientFeedback[]>>;
}

const getSatisfactionFromRating = (rating: number): SatisfactionLevel => {
    if (rating >= 5) return SatisfactionLevel.VERY_SATISFIED;
    if (rating >= 4) return SatisfactionLevel.SATISFIED;
    if (rating >= 3) return SatisfactionLevel.NEUTRAL;
    return SatisfactionLevel.UNSATISFIED;
};

const PublicFeedbackForm: React.FC<PublicFeedbackFormProps> = ({ setClientFeedback }) => {
    const [formState, setFormState] = useState({
        clientName: '',
        rating: 0,
        feedback: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleRatingChange = (rating: number) => {
        setFormState(prev => ({ ...prev, rating }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formState.rating === 0) {
            alert('Mohon berikan peringkat bintang.');
            return;
        }
        setIsSubmitting(true);

        const payload: Omit<ClientFeedback, 'id'> = {
            clientName: formState.clientName,
            rating: formState.rating,
            satisfaction: getSatisfactionFromRating(formState.rating),
            feedback: formState.feedback,
            date: new Date().toISOString(),
        };

        try {
            const created = await createClientFeedback(payload);
            setClientFeedback(prev => [created, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setIsSubmitted(true);
        } catch (err: any) {
            alert('Gagal mengirim masukan. Silakan coba lagi.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-brand-bg p-4">
                <div className="w-full max-w-lg p-8 text-center bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                    <h1 className="text-2xl font-bold text-gradient">Terima Kasih!</h1>
                    <p className="mt-4 text-brand-text-primary">Saran dan masukan Anda sangat berharga bagi kami. Tim kami akan segera meninjaunya untuk menjadi lebih baik lagi.</p>
                    <a href="#" className="mt-6 button-primary inline-block">Kembali ke Beranda</a>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-brand-bg p-4">
            <div className="w-full max-w-2xl mx-auto">
                 <div className="bg-brand-surface p-8 rounded-2xl shadow-lg border border-brand-border">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gradient">Formulir Masukan Klien</h1>
                        <p className="text-sm text-brand-text-secondary mt-2">Kami sangat menghargai waktu Anda untuk memberikan masukan.</p>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="input-group">
                           <input type="text" id="clientName" name="clientName" value={formState.clientName} onChange={handleFormChange} className="input-field" placeholder=" " required/>
                           <label htmlFor="clientName" className="input-label">Nama Anda</label>
                       </div>

                        <div className="pt-2">
                            <label className="text-sm text-brand-text-secondary">Peringkat Kepuasan Anda</label>
                            <div className="flex items-center justify-center gap-4 mt-3">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button key={star} type="button" onClick={() => handleRatingChange(star)} className={`p-2 rounded-full transition-colors ${formState.rating >= star ? 'bg-yellow-400/20' : 'bg-brand-input hover:bg-brand-input/70'}`}>
                                        <StarIcon className={`w-8 h-8 ${formState.rating >= star ? 'text-yellow-400 fill-current' : 'text-gray-500'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="input-group">
                            <textarea id="feedback" name="feedback" value={formState.feedback} onChange={handleFormChange} className="input-field" placeholder=" " required rows={5}></textarea>
                            <label htmlFor="feedback" className="input-label">Saran & Masukan Anda</label>
                        </div>
                        
                        <div className="pt-6">
                            <button type="submit" disabled={isSubmitting} className="w-full button-primary">
                                {isSubmitting ? 'Mengirim...' : 'Kirim Masukan'}
                            </button>
                        </div>
                    </form>
                 </div>
            </div>
        </div>
    );
};

export default PublicFeedbackForm;