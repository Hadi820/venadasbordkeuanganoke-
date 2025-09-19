import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Package, Profile, Lead, Client, ContactChannel, LeadStatus } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import { SparkleIcon, BarChart2Icon, LightbulbIcon, AlertCircleIcon, InstagramIcon, HashtagIcon, ClockIcon, MessageSquareIcon, UsersIcon } from '../constants';

interface MarketingProps {
    packages: Package[];
    profile: Profile;
    showNotification: (message: string) => void;
    handleResetData: () => void;
    leads: Lead[];
    clients: Client[];
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

const MarketingToolCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}> = ({ title, description, icon, children }) => (
    <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full flex flex-col">
        <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent flex-shrink-0">
                {icon}
            </div>
            <div>
                <h3 className="text-lg font-bold text-gradient">{title}</h3>
                <p className="text-sm text-brand-text-secondary">{description}</p>
            </div>
        </div>
        <div className="flex-grow flex flex-col">{children}</div>
    </div>
);

const Marketing: React.FC<MarketingProps> = ({ packages, profile, showNotification, handleResetData, leads, clients }) => {
    // Ad Copy State
    const [adCopyPackageId, setAdCopyPackageId] = useState<string>('');
    const [adCopyAudience, setAdCopyAudience] = useState<string>('Pasangan usia 25-35, mencari vendor fotografi premium.');
    const [adCopyOffer, setAdCopyOffer] = useState<string>('Diskon 10% untuk booking bulan ini.');
    const [adCopyResults, setAdCopyResults] = useState<{ headline: string; body: string }[]>([]);
    const [isAdCopyLoading, setIsAdCopyLoading] = useState<boolean>(false);
    
    // Market Research State
    const [marketResearchService, setMarketResearchService] = useState<string>('Fotografi pernikahan mewah');
    const [marketResearchLocation, setMarketResearchLocation] = useState<string>('Bali, Indonesia');
    const [marketResearchResults, setMarketResearchResults] = useState<any>(null);
    const [isMarketResearchLoading, setIsMarketResearchLoading] = useState<boolean>(false);

    // Post Ideas State
    const [postIdeaTopic, setPostIdeaTopic] = useState<string>('Tips memilih fotografer pernikahan');
    const [postIdeaResults, setPostIdeaResults] = useState<{ title: string; description: string }[]>([]);
    const [isPostIdeaLoading, setIsPostIdeaLoading] = useState<boolean>(false);

    // Social Media Analysis State
    const [activeSocialTab, setActiveSocialTab] = useState('hashtag');
    const [hashtagTopic, setHashtagTopic] = useState('Foto prewedding di pantai');
    const [hashtagResults, setHashtagResults] = useState<{ trending: string[], niche: string[], general: string[] } | null>(null);
    const [isHashtagLoading, setIsHashtagLoading] = useState(false);
    const [timingAudience, setTimingAudience] = useState('Fotografer dan calon pengantin di Indonesia');
    const [timingResults, setTimingResults] = useState<{ time: string, justification: string }[] | null>(null);
    const [isTimingLoading, setIsTimingLoading] = useState(false);
    const [sentimentText, setSentimentText] = useState('Hasil fotonya keren banget, suka sama warnanya!');
    const [sentimentResult, setSentimentResult] = useState<{ sentiment: string, explanation: string } | null>(null);
    const [isSentimentLoading, setIsSentimentLoading] = useState(false);
    const [competitorUsername, setCompetitorUsername] = useState('mpppandeglang');
    const [competitorResult, setCompetitorResult] = useState<{
        follower_count: string;
        following_count: string;
        post_count: string;
        posting_frequency: string;
        follower_demographics_estimation: string;
        content_strategy: {
            themes: string[];
            format_breakdown: string;
        };
        engagement_analysis: {
            style: string;
            estimated_rate: string;
        };
        strategic_takeaway: {
            strength: string;
            weakness: string;
            recommendation: string;
        };
    } | null>(null);
    const [isCompetitorLoading, setIsCompetitorLoading] = useState(false);
    
    // Instagram Insights Analysis State
    const [instagramData, setInstagramData] = useState<string>('Performa 7 hari terakhir:\nJangkauan: 15.000 akun\nInteraksi: 2.500 (1.800 suka, 200 komentar, 500 simpan)\n\nKonten Teratas:\n1. Video Reels "Behind the scenes prewedding" - Jangkauan 8.000\n2. Foto Carousel "Album Pernikahan Budi & Sinta" - Interaksi 900\n\nAudiens:\n- Wanita, 24-35 tahun\n- Lokasi: Jakarta, Bandung\n- Waktu aktif: 19.00 - 21.00 WIB');
    const [instagramAnalysis, setInstagramAnalysis] = useState<{ performance_summary: string; prospect_insights: string; content_strategy: string; improvement_suggestions: string[] } | null>(null);
    const [isInstagramAnalysisLoading, setIsInstagramAnalysisLoading] = useState<boolean>(false);

    const [activeAnalysisTab, setActiveAnalysisTab] = useState<'general' | 'correlation'>('general');
    const [correlationInstagramData, setCorrelationInstagramData] = useState<string>(instagramData);
    const [correlationAnalysis, setCorrelationAnalysis] = useState<any | null>(null);
    const [isCorrelationLoading, setIsCorrelationLoading] = useState<boolean>(false);

    // Reset Data State
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetConfirmationText, setResetConfirmationText] = useState('');
    
    const [error, setError] = useState<string | null>(null);
    
    const ClipboardIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>);

    const handleGenerateAdCopy = async () => {
        if (!adCopyPackageId) { showNotification("Pilih paket terlebih dahulu."); return; }
        const selectedPackage = packages.find(p => p.id === adCopyPackageId);
        if (!selectedPackage) { showNotification("Detail paket tidak ditemukan."); return; }

        setIsAdCopyLoading(true); setError(null); setAdCopyResults([]);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Anda adalah copywriter profesional untuk bisnis fotografi '${profile.companyName}'. Buat 3 variasi copy iklan Instagram.
                - Paket: ${selectedPackage.name} (${formatCurrency(selectedPackage.price)})
                - Audiens: ${adCopyAudience}
                - Penawaran: ${adCopyOffer}
                - Poin Utama: ${[...selectedPackage.digitalItems, ...selectedPackage.physicalItems.map(i => i.name)].join(', ')}
                Respons HARUS berupa objek JSON dengan kunci "ad_copies", yang merupakan array objek, masing-masing dengan "headline" dan "body".`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { ad_copies: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { headline: { type: Type.STRING }, body: { type: Type.STRING } }, required: ['headline', 'body'] } } }, required: ['ad_copies'] } } });
            const result = JSON.parse(response.text.trim());
            setAdCopyResults(result.ad_copies);
        } catch (err) { setError("Gagal membuat copy iklan."); } finally { setIsAdCopyLoading(false); }
    };

    const handleGenerateMarketResearch = async () => {
        if (!marketResearchService || !marketResearchLocation) { showNotification("Isi layanan dan lokasi."); return; }
        setIsMarketResearchLoading(true); setError(null); setMarketResearchResults(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Lakukan riset pasar untuk layanan '${marketResearchService}' di lokasi '${marketResearchLocation}'.
                Analisis: demografi target, channel marketing yang disarankan, kompetitor potensial, dan proposisi penjualan unik (USP).
                Respons HARUS berupa objek JSON dengan kunci: "analysis_summary", "target_demographics", "suggested_channels", "potential_competitors", "unique_selling_propositions". Nilainya harus berupa string atau array string.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { analysis_summary: { type: Type.STRING }, target_demographics: { type: Type.ARRAY, items: { type: Type.STRING } }, suggested_channels: { type: Type.ARRAY, items: { type: Type.STRING } }, potential_competitors: { type: Type.ARRAY, items: { type: Type.STRING } }, unique_selling_propositions: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['analysis_summary', 'target_demographics', 'suggested_channels', 'potential_competitors', 'unique_selling_propositions'] } } });
            setMarketResearchResults(JSON.parse(response.text.trim()));
        } catch (err) { setError("Gagal melakukan riset pasar."); } finally { setIsMarketResearchLoading(false); }
    };
    
    const handleGeneratePostIdeas = async () => {
        if (!postIdeaTopic) { showNotification("Isi topik ide."); return; }
        setIsPostIdeaLoading(true); setError(null); setPostIdeaResults([]);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Buat 5 ide postingan media sosial kreatif untuk bisnis fotografi dengan topik: '${postIdeaTopic}'.
                Respons HARUS berupa objek JSON dengan kunci "post_ideas", yang merupakan array objek, masing-masing dengan "title" dan "description".`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { post_ideas: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } }, required: ['title', 'description'] } } }, required: ['post_ideas'] } } });
            setPostIdeaResults(JSON.parse(response.text.trim()).post_ideas);
        } catch (err) { setError("Gagal membuat ide postingan."); } finally { setIsPostIdeaLoading(false); }
    };
    
    const handleGenerateHashtags = async () => {
        if (!hashtagTopic) return;
        setIsHashtagLoading(true); setError(null); setHashtagResults(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Anda adalah ahli strategi marketing Instagram. Berdasarkan topik '{${hashtagTopic}}', berikan 3 set hashtag yang relevan dan efektif (trending, niche, dan umum) untuk postingan Instagram bisnis fotografi. Kembalikan respons sebagai objek JSON dengan kunci 'trending', 'niche', dan 'general', masing-masing berisi array string hashtag.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { trending: { type: Type.ARRAY, items: { type: Type.STRING } }, niche: { type: Type.ARRAY, items: { type: Type.STRING } }, general: { type: Type.ARRAY, items: { type: Type.STRING } } } } } });
            setHashtagResults(JSON.parse(response.text.trim()));
        } catch (err) { setError("Gagal membuat hashtag."); } finally { setIsHashtagLoading(false); }
    };

    const handleGenerateTiming = async () => {
        if (!timingAudience) return;
        setIsTimingLoading(true); setError(null); setTimingResults(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Anda adalah analis Instagram untuk bisnis fotografi. Berdasarkan deskripsi audiens target ini: '${timingAudience}', sarankan 3 waktu terbaik (hari dan rentang waktu dalam WIB) untuk memposting di Instagram untuk engagement maksimal. Berikan justifikasi singkat untuk setiap saran. Kembalikan respons sebagai objek JSON dengan kunci 'suggestions', yang merupakan array objek, masing-masing dengan properti 'time' dan 'justification'.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { suggestions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { time: { type: Type.STRING }, justification: { type: Type.STRING } } } } } } } });
            setTimingResults(JSON.parse(response.text.trim()).suggestions);
        } catch (err) { setError("Gagal memprediksi waktu."); } finally { setIsTimingLoading(false); }
    };

    const handleAnalyzeSentiment = async () => {
        if (!sentimentText) return;
        setIsSentimentLoading(true); setError(null); setSentimentResult(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Analisis sentimen dari teks berikut dari komentar Instagram untuk bisnis fotografi. Klasifikasikan sebagai 'Positif', 'Negatif', atau 'Netral'. Berikan penjelasan singkat satu kalimat untuk klasifikasi Anda. Kembalikan respons sebagai objek JSON dengan kunci 'sentiment' dan 'explanation'. Teks: '${sentimentText}'`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { sentiment: { type: Type.STRING }, explanation: { type: Type.STRING } } } } });
            setSentimentResult(JSON.parse(response.text.trim()));
        } catch (err) { setError("Gagal menganalisis sentimen."); } finally { setIsSentimentLoading(false); }
    };

    const handleAnalyzeCompetitor = async () => {
        if (!competitorUsername) return;
        setIsCompetitorLoading(true); setError(null); setCompetitorResult(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Anda adalah seorang analis media sosial profesional dengan spesialisasi di industri fotografi. Lakukan analisis mendalam pada akun Instagram kompetitor '@${competitorUsername}' berdasarkan data publik yang dapat Anda simulasikan. Berikan analisis yang komprehensif. Contoh data untuk simulasi: @mpppandeglang memiliki 505 post, 2.990 followers, 336 following.

Respons HARUS berupa objek JSON yang valid dengan struktur berikut:
{
  "follower_count": "string (e.g., '2.990')",
  "following_count": "string (e.g., '336')",
  "post_count": "string (e.g., '505')",
  "posting_frequency": "string (e.g., '3-4 kali per minggu')",
  "follower_demographics_estimation": "string (Perkiraan demografi pengikut berdasarkan konten)",
  "content_strategy": {
    "themes": ["string", "..."],
    "format_breakdown": "string (e.g., 'Fokus pada Reels (60%), Carousel (30%)')"
  },
  "engagement_analysis": {
    "style": "string (e.g., 'Sangat interaktif, membalas komentar.')",
    "estimated_rate": "string ('Rendah', 'Sedang', 'Tinggi')"
  },
  "strategic_takeaway": {
    "strength": "string (Satu kekuatan utama)",
    "weakness": "string (Satu kelemahan potensial)",
    "recommendation": "string (Satu rekomendasi strategis untuk Vena Pictures)"
  }
}`;
            const response = await ai.models.generateContent({ 
                model: 'gemini-2.5-flash', 
                contents: prompt, 
                config: { 
                    responseMimeType: "application/json", 
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            follower_count: { type: Type.STRING },
                            following_count: { type: Type.STRING },
                            post_count: { type: Type.STRING },
                            posting_frequency: { type: Type.STRING },
                            follower_demographics_estimation: { type: Type.STRING },
                            content_strategy: {
                                type: Type.OBJECT,
                                properties: {
                                    themes: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    format_breakdown: { type: Type.STRING }
                                },
                                required: ['themes', 'format_breakdown']
                            },
                            engagement_analysis: {
                                type: Type.OBJECT,
                                properties: {
                                    style: { type: Type.STRING },
                                    estimated_rate: { type: Type.STRING }
                                },
                                required: ['style', 'estimated_rate']
                            },
                            strategic_takeaway: {
                                type: Type.OBJECT,
                                properties: {
                                    strength: { type: Type.STRING },
                                    weakness: { type: Type.STRING },
                                    recommendation: { type: Type.STRING }
                                },
                                required: ['strength', 'weakness', 'recommendation']
                            }
                        },
                        required: ['follower_count', 'following_count', 'post_count', 'posting_frequency', 'follower_demographics_estimation', 'content_strategy', 'engagement_analysis', 'strategic_takeaway']
                    } 
                } 
            });
            setCompetitorResult(JSON.parse(response.text.trim()));
        } catch (err) { setError("Gagal menganalisis kompetitor."); console.error(err) } finally { setIsCompetitorLoading(false); }
    };

    const handleAnalyzeInstagram = async () => {
        if (!instagramData) { showNotification("Masukkan data insight terlebih dahulu."); return; }
        setIsInstagramAnalysisLoading(true); setError(null); setInstagramAnalysis(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Anda adalah seorang analis marketing media sosial profesional yang berspesialisasi dalam industri fotografi untuk Vena Pictures. Analisis data mentah dari Instagram Insights berikut dan berikan laporan yang ringkas dan dapat ditindaklanjuti. Laporan harus mencakup: Ringkasan Performa, Wawasan Prospek, Strategi Konten, dan Saran Peningkatan. Pastikan semua respons dalam Bahasa Indonesia.

Data Mentah:
${instagramData}

Respons HARUS berupa objek JSON yang valid dengan struktur berikut: { "performance_summary": "...", "prospect_insights": "...", "content_strategy": "...", "improvement_suggestions": ["...", "..."] }`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            performance_summary: { type: Type.STRING },
                            prospect_insights: { type: Type.STRING },
                            content_strategy: { type: Type.STRING },
                            improvement_suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ['performance_summary', 'prospect_insights', 'content_strategy', 'improvement_suggestions']
                    }
                }
            });
            setInstagramAnalysis(JSON.parse(response.text.trim()));
        } catch (err) {
            setError("Gagal menganalisis data Instagram.");
            console.error(err);
        } finally {
            setIsInstagramAnalysisLoading(false);
        }
    };

    const handleAnalyzeCorrelation = async () => {
        if (!correlationInstagramData) {
            showNotification("Masukkan data insight terlebih dahulu.");
            return;
        }
        setIsCorrelationLoading(true);
        setError(null);
        setCorrelationAnalysis(null);
    
        try {
            // 1. Process internal data
            const instagramLeads = leads.filter(l => l.contactChannel === ContactChannel.INSTAGRAM);
            const convertedInstagramLeadClientIds = new Set(
                instagramLeads
                    .filter(l => l.status === LeadStatus.CONVERTED && l.notes?.includes('Klien ID:'))
                    .map(l => l.notes!.split('Klien ID: ')[1].trim())
            );
            const convertedClientsFromInstagram = clients.filter(c => convertedInstagramLeadClientIds.has(c.id));
    
            const internalDataSummary = {
                total_instagram_leads: instagramLeads.length,
                converted_instagram_leads: convertedClientsFromInstagram.length,
                conversion_rate: instagramLeads.length > 0 ? ((convertedClientsFromInstagram.length / instagramLeads.length) * 100).toFixed(1) + '%' : '0%',
                instagram_lead_locations: [...new Set(instagramLeads.map(l => l.location).filter(Boolean))],
            };
    
            // 2. Create the prompt
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                Anda adalah seorang analis data marketing strategis untuk Vena Pictures. Tugas Anda adalah menganalisis data Instagram Insights dan mengkorelasikannya dengan data internal (prospek & klien) untuk memberikan laporan akurasi dan strategi. Semua respons harus dalam Bahasa Indonesia.
    
                Data 1: Instagram Insights (disediakan oleh pengguna)
                ${correlationInstagramData}
    
                Data 2: Data Internal Bisnis (dari sistem)
                - Total Prospek dari Instagram: ${internalDataSummary.total_instagram_leads}
                - Prospek Terkonversi menjadi Klien: ${internalDataSummary.converted_instagram_leads}
                - Tingkat Konversi Prospek-ke-Klien: ${internalDataSummary.conversion_rate}
                - Lokasi Prospek dari Instagram: ${internalDataSummary.instagram_lead_locations.join(', ')}
    
                Berdasarkan DUA set data di atas, berikan laporan dalam format JSON dengan struktur berikut:
                {
                  "audience_accuracy": {
                    "summary": "Analisis singkat tentang kesesuaian demografi audiens Instagram dengan data prospek nyata dari sistem.",
                    "match_percentage_estimation": "Estimasi kasar dalam persen (%) seberapa cocok audiens IG dengan prospek nyata.",
                    "key_findings": ["Poin-poin penting perbandingan, misal: 'Lokasi teratas di IG (Jakarta) cocok dengan lokasi prospek.'"]
                  },
                  "conversion_analysis": {
                    "summary": "Ringkasan tingkat konversi dan apa artinya bagi bisnis.",
                    "effectiveness_notes": "Catatan tentang seberapa efektif Instagram dalam menghasilkan klien nyata."
                  },
                  "strategic_recommendations": {
                    "content_focus": "Saran jenis konten yang harus lebih difokuskan berdasarkan konten teratas di insights dan hubungannya dengan konversi.",
                    "audience_targeting": "Saran untuk penargetan audiens agar lebih akurat.",
                    "lead_quality_improvement": "Saran konkret untuk meningkatkan kualitas prospek dari Instagram."
                  }
                }
            `;
            
            const schema = {
                type: Type.OBJECT,
                properties: {
                    audience_accuracy: {
                        type: Type.OBJECT,
                        properties: {
                            summary: { type: Type.STRING },
                            match_percentage_estimation: { type: Type.STRING },
                            key_findings: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ['summary', 'match_percentage_estimation', 'key_findings']
                    },
                    conversion_analysis: {
                        type: Type.OBJECT,
                        properties: {
                            summary: { type: Type.STRING },
                            effectiveness_notes: { type: Type.STRING }
                        },
                        required: ['summary', 'effectiveness_notes']
                    },
                    strategic_recommendations: {
                        type: Type.OBJECT,
                        properties: {
                            content_focus: { type: Type.STRING },
                            audience_targeting: { type: Type.STRING },
                            lead_quality_improvement: { type: Type.STRING }
                        },
                        required: ['content_focus', 'audience_targeting', 'lead_quality_improvement']
                    }
                },
                required: ['audience_accuracy', 'conversion_analysis', 'strategic_recommendations']
            };
    
            const responseWithSchema = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema
                }
            });
    
            setCorrelationAnalysis(JSON.parse(responseWithSchema.text.trim()));
    
        } catch (err) {
            setError("Gagal menganalisis korelasi data.");
            console.error(err);
        } finally {
            setIsCorrelationLoading(false);
        }
    };


    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => showNotification('Teks berhasil disalin!'));
    };

    const handleConfirmReset = () => {
        if (resetConfirmationText === 'RESET') {
            showNotification('Data sedang direset...');
            setTimeout(handleResetData, 1000);
        } else {
            showNotification('Teks konfirmasi salah.');
        }
    };
    
    const socialTabs = [
        { id: 'competitor', label: 'Analisis Kompetitor', icon: <UsersIcon className="w-5 h-5" /> },
        { id: 'hashtag', label: 'Riset Hashtag', icon: <HashtagIcon className="w-5 h-5" /> },
        { id: 'timing', label: 'Waktu Unggah', icon: <ClockIcon className="w-5 h-5" /> },
        { id: 'sentiment', label: 'Analisis Sentimen', icon: <MessageSquareIcon className="w-5 h-5" /> },
    ];

    return (
        <div className="space-y-6">
            <PageHeader title="Pusat Marketing AI" subtitle="Gunakan AI untuk membuat kampanye marketing yang menarik dan efektif." />
            {error && <p className="text-red-500 bg-red-500/10 p-4 rounded-lg">{error}</p>}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <MarketingToolCard title="Generator Copy Iklan" description="Buat copy iklan persuasif untuk paket Anda." icon={<SparkleIcon className="w-6 h-6" />}>
                    <div className="space-y-4 flex-grow flex flex-col">
                        <div className="input-group"><select id="package" value={adCopyPackageId} onChange={e => setAdCopyPackageId(e.target.value)} className="input-field" required><option value="">Pilih Paket...</option>{packages.map(pkg => (<option key={pkg.id} value={pkg.id}>{pkg.name}</option>))}</select><label htmlFor="package" className="input-label">Paket</label></div>
                        <div className="input-group"><textarea id="audience" value={adCopyAudience} onChange={e => setAdCopyAudience(e.target.value)} rows={3} className="input-field" required></textarea><label htmlFor="audience" className="input-label">Target Audiens</label></div>
                        <div className="input-group"><input type="text" id="offer" value={adCopyOffer} onChange={e => setAdCopyOffer(e.target.value)} className="input-field" required /><label htmlFor="offer" className="input-label">Penawaran</label></div>
                        <button onClick={handleGenerateAdCopy} disabled={isAdCopyLoading} className="button-primary w-full mt-auto">{isAdCopyLoading ? 'Membuat...' : 'Buat Copy Iklan'}</button>
                        {!isAdCopyLoading && adCopyResults.length > 0 && <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">{adCopyResults.map((r, i) => (<div key={i} className="bg-brand-bg p-3 rounded-md"><h5 className="font-semibold text-sm">{r.headline}</h5><p className="text-xs mt-1">{r.body}</p><button onClick={() => handleCopy(`Headline: ${r.headline}\n\n${r.body}`)} className="text-xs font-semibold text-brand-accent hover:underline mt-2">Salin</button></div>))}</div>}
                    </div>
                </MarketingToolCard>

                <MarketingToolCard title="Riset Pasar AI" description="Analisis target pasar, kompetitor, dan USP untuk layanan Anda." icon={<BarChart2Icon className="w-6 h-6" />}>
                    <div className="space-y-4 flex-grow flex flex-col">
                        <div className="input-group"><textarea id="service" value={marketResearchService} onChange={e => setMarketResearchService(e.target.value)} rows={2} className="input-field" required></textarea><label htmlFor="service" className="input-label">Layanan/Produk</label></div>
                        <div className="input-group"><input type="text" id="location" value={marketResearchLocation} onChange={e => setMarketResearchLocation(e.target.value)} className="input-field" required /><label htmlFor="location" className="input-label">Lokasi Target</label></div>
                        <button onClick={handleGenerateMarketResearch} disabled={isMarketResearchLoading} className="button-primary w-full mt-auto">{isMarketResearchLoading ? 'Menganalisis...' : 'Buat Analisis'}</button>
                        {!isMarketResearchLoading && marketResearchResults && <div className="mt-4 space-y-3 text-sm max-h-60 overflow-y-auto pr-2">
                            <p>{marketResearchResults.analysis_summary}</p>
                            <div><h5 className="font-semibold text-brand-accent">Demografi Target:</h5><ul className="list-disc list-inside">{marketResearchResults.target_demographics.map((item: string, i: number) => <li key={i}>{item}</li>)}</ul></div>
                            <div><h5 className="font-semibold text-brand-accent">Saran Channel:</h5><ul className="list-disc list-inside">{marketResearchResults.suggested_channels.map((item: string, i: number) => <li key={i}>{item}</li>)}</ul></div>
                            <div><h5 className="font-semibold text-brand-accent">Kompetitor:</h5><ul className="list-disc list-inside">{marketResearchResults.potential_competitors.map((item: string, i: number) => <li key={i}>{item}</li>)}</ul></div>
                             <div><h5 className="font-semibold text-brand-accent">USP:</h5><ul className="list-disc list-inside">{marketResearchResults.unique_selling_propositions.map((item: string, i: number) => <li key={i}>{item}</li>)}</ul></div>
                        </div>}
                    </div>
                </MarketingToolCard>
                
                <MarketingToolCard title="Generator Ide Postingan" description="Dapatkan ide konten kreatif untuk media sosial Anda." icon={<LightbulbIcon className="w-6 h-6" />}>
                    <div className="space-y-4 flex-grow flex flex-col">
                        <div className="input-group"><input type="text" id="topic" value={postIdeaTopic} onChange={e => setPostIdeaTopic(e.target.value)} className="input-field" required /><label htmlFor="topic" className="input-label">Topik atau Tema</label></div>
                        <button onClick={handleGeneratePostIdeas} disabled={isPostIdeaLoading} className="button-primary w-full mt-auto">{isPostIdeaLoading ? 'Mencari Ide...' : 'Buat Ide Postingan'}</button>
                        {!isPostIdeaLoading && postIdeaResults.length > 0 && (
                            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2">
                                {postIdeaResults.map((idea, i) => (
                                    <div key={i} className="p-3 bg-brand-bg rounded-md">
                                        <h5 className="font-semibold text-sm">{idea.title}</h5>
                                        <p className="text-xs mt-1">{idea.description}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </MarketingToolCard>
                
                <MarketingToolCard title="Analisis Media Sosial AI" description="Dapatkan wawasan dari Instagram untuk meningkatkan jangkauan dan engagement." icon={<InstagramIcon className="w-6 h-6" />}>
                    <div className="border-b border-brand-border flex-shrink-0"><nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto">{socialTabs.map(tab => (<button key={tab.id} onClick={() => setActiveSocialTab(tab.id)} className={`shrink-0 inline-flex items-center gap-2 py-3 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm ${activeSocialTab === tab.id ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}>{tab.icon} <span>{tab.label}</span></button>))}</nav></div>
                    <div className="pt-4 flex-grow flex flex-col">
                        {activeSocialTab === 'hashtag' && <div className="space-y-4 flex-grow flex flex-col"><div className="input-group"><input type="text" value={hashtagTopic} onChange={e=>setHashtagTopic(e.target.value)} className="input-field" /><label className="input-label">Topik Hashtag</label></div><button onClick={handleGenerateHashtags} disabled={isHashtagLoading} className="button-primary w-full mt-auto">{isHashtagLoading?'Membuat...':'Buat Hashtag'}</button>{!isHashtagLoading && hashtagResults && <div className="mt-4 text-xs space-y-2 overflow-y-auto max-h-48"><p><strong className="text-brand-accent">Trending:</strong> {hashtagResults.trending.join(' ')}</p><p><strong className="text-brand-accent">Niche:</strong> {hashtagResults.niche.join(' ')}</p><p><strong className="text-brand-accent">Umum:</strong> {hashtagResults.general.join(' ')}</p></div>}</div>}
                        {activeSocialTab === 'timing' && <div className="space-y-4 flex-grow flex flex-col"><div className="input-group"><input type="text" value={timingAudience} onChange={e=>setTimingAudience(e.target.value)} className="input-field" /><label className="input-label">Deskripsi Audiens</label></div><button onClick={handleGenerateTiming} disabled={isTimingLoading} className="button-primary w-full mt-auto">{isTimingLoading?'Memprediksi...':'Prediksi Waktu'}</button>{!isTimingLoading && timingResults && <div className="mt-4 text-xs space-y-2 overflow-y-auto max-h-48">{timingResults.map((r,i)=><div key={i}><strong>{r.time}:</strong> {r.justification}</div>)}</div>}</div>}
                        {activeSocialTab === 'sentiment' && <div className="space-y-4 flex-grow flex flex-col"><div className="input-group"><textarea value={sentimentText} onChange={e=>setSentimentText(e.target.value)} rows={3} className="input-field"></textarea><label className="input-label">Teks/Komentar</label></div><button onClick={handleAnalyzeSentiment} disabled={isSentimentLoading} className="button-primary w-full mt-auto">{isSentimentLoading?'Menganalisis...':'Analisis Sentimen'}</button>{!isSentimentLoading && sentimentResult && <div className="mt-4 text-sm"><p><strong>Hasil:</strong> <span className={`font-bold ${sentimentResult.sentiment==='Positif'?'text-green-400':sentimentResult.sentiment==='Negatif'?'text-red-400':'text-yellow-400'}`}>{sentimentResult.sentiment}</span></p><p className="text-xs mt-1">{sentimentResult.explanation}</p></div>}</div>}
                        {activeSocialTab === 'competitor' && <div className="space-y-4 flex-grow flex flex-col">
                            <div className="input-group"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary">@</span><input type="text" value={competitorUsername} onChange={e=>setCompetitorUsername(e.target.value)} className="input-field !pl-8" /><label className="input-label !pl-8">Username Kompetitor</label></div>
                            <button onClick={handleAnalyzeCompetitor} disabled={isCompetitorLoading} className="button-primary w-full mt-auto">{isCompetitorLoading?'Menganalisis...':'Analisis Kompetitor'}</button>
                            {isCompetitorLoading && <div className="mt-4 space-y-4 animate-pulse"><div className="flex gap-4"><div className="w-1/2 h-16 bg-brand-bg rounded-lg"></div><div className="w-1/2 h-16 bg-brand-bg rounded-lg"></div></div><div className="h-24 bg-brand-bg rounded-lg"></div><div className="h-28 bg-brand-bg rounded-lg"></div></div>}
                            {!isCompetitorLoading && competitorResult && <div className="mt-4 space-y-3 text-sm max-h-[40vh] overflow-y-auto pr-2">
                                <p className='text-xs text-brand-text-secondary mb-3'>*Data berikut adalah analisis dan simulasi AI berdasarkan informasi publik.</p>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="bg-brand-bg p-2 rounded-lg"><h5 className="font-semibold text-brand-text-light text-xs">Followers</h5><p className="font-bold text-base text-brand-text-light">{competitorResult.follower_count}</p></div>
                                    <div className="bg-brand-bg p-2 rounded-lg"><h5 className="font-semibold text-brand-text-light text-xs">Following</h5><p className="font-bold text-base text-brand-text-light">{competitorResult.following_count}</p></div>
                                    <div className="bg-brand-bg p-2 rounded-lg"><h5 className="font-semibold text-brand-text-light text-xs">Posts</h5><p className="font-bold text-base text-brand-text-light">{competitorResult.post_count}</p></div>
                                </div>
                                <div className="bg-brand-bg p-3 rounded-lg"><h5 className="font-semibold text-brand-text-light text-xs mb-1">Perkiraan Demografi Pengikut</h5><p className="text-xs text-brand-text-secondary">{competitorResult.follower_demographics_estimation}</p></div>
                                <div className="bg-brand-bg p-3 rounded-lg"><h5 className="font-semibold text-brand-text-light text-xs mb-1">Strategi Konten</h5><p className="text-xs text-brand-text-secondary"><strong>Tema:</strong> {competitorResult.content_strategy.themes.join(', ')}</p><p className="text-xs text-brand-text-secondary mt-1"><strong>Format:</strong> {competitorResult.content_strategy.format_breakdown}</p></div>
                                <div className="bg-brand-bg p-3 rounded-lg"><h5 className="font-semibold text-brand-text-light text-xs mb-1">Analisis Engagement</h5><p className="text-xs text-brand-text-secondary"><strong>Gaya:</strong> {competitorResult.engagement_analysis.style}</p><p className="text-xs text-brand-text-secondary mt-1"><strong>Perkiraan Rate:</strong> {competitorResult.engagement_analysis.estimated_rate}</p></div>
                                <div className="bg-brand-bg p-3 rounded-lg"><h5 className="font-semibold text-brand-text-light text-xs mb-1">Wawasan Strategis</h5><p className="text-xs text-brand-text-secondary"><strong className="text-green-400">Kekuatan:</strong> {competitorResult.strategic_takeaway.strength}</p><p className="text-xs text-brand-text-secondary mt-1"><strong className="text-yellow-400">Kelemahan:</strong> {competitorResult.strategic_takeaway.weakness}</p><p className="text-xs text-brand-text-secondary mt-1"><strong className="text-blue-400">Rekomendasi:</strong> {competitorResult.strategic_takeaway.recommendation}</p></div>
                            </div>}
                        </div>}
                    </div>
                </MarketingToolCard>

                <div className="lg:col-span-2">
                    <MarketingToolCard title="Analisis Performa Instagram AI" description="Masukkan data Instagram Insight Anda untuk mendapatkan analisis dan strategi dari AI." icon={<BarChart2Icon className="w-6 h-6" />}>
                        <div className="border-b border-brand-border mb-4">
                            <nav className="-mb-px flex space-x-4">
                                <button onClick={() => setActiveAnalysisTab('general')} className={`shrink-0 py-3 px-1 border-b-2 font-medium text-sm ${activeAnalysisTab === 'general' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}>Analisis Umum</button>
                                <button onClick={() => setActiveAnalysisTab('correlation')} className={`shrink-0 py-3 px-1 border-b-2 font-medium text-sm ${activeAnalysisTab === 'correlation' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}>Analisis Korelasi</button>
                            </nav>
                        </div>
                        
                        {activeAnalysisTab === 'general' && (
                            <div className="space-y-4 flex-grow flex flex-col">
                                <div className="input-group">
                                    <textarea id="instagramData" value={instagramData} onChange={e => setInstagramData(e.target.value)} rows={8} className="input-field"></textarea>
                                    <label htmlFor="instagramData" className="input-label">Data Instagram Insights</label>
                                    <p className="text-xs text-brand-text-secondary mt-1">Tempelkan data seperti Jangkauan, Interaksi, Konten Teratas, dan Demografi Audiens di sini.</p>
                                </div>
                                <button onClick={handleAnalyzeInstagram} disabled={isInstagramAnalysisLoading} className="button-primary w-full mt-auto">{isInstagramAnalysisLoading ? 'Menganalisis...' : 'Analisis dengan AI'}</button>
                                {isInstagramAnalysisLoading && <div className="text-center p-4 text-brand-text-secondary">Menganalisis data...</div>}
                                {!isInstagramAnalysisLoading && instagramAnalysis && <div className="mt-4 space-y-4 text-sm max-h-96 overflow-y-auto pr-2">
                                    <div><h5 className="font-semibold text-brand-accent">Ringkasan Performa</h5><p className="text-xs mt-1">{instagramAnalysis.performance_summary}</p></div>
                                    <div><h5 className="font-semibold text-brand-accent">Wawasan Prospek</h5><p className="text-xs mt-1">{instagramAnalysis.prospect_insights}</p></div>
                                    <div><h5 className="font-semibold text-brand-accent">Strategi Konten</h5><p className="text-xs mt-1">{instagramAnalysis.content_strategy}</p></div>
                                    <div><h5 className="font-semibold text-brand-accent">Saran Peningkatan</h5><ul className="list-disc list-inside text-xs mt-1 space-y-1">{instagramAnalysis.improvement_suggestions.map((item, i) => <li key={i}>{item}</li>)}</ul></div>
                                </div>}
                            </div>
                        )}

                        {activeAnalysisTab === 'correlation' && (
                             <div className="space-y-4 flex-grow flex flex-col">
                                <div className="input-group">
                                    <textarea id="correlationInstagramData" value={correlationInstagramData} onChange={e => setCorrelationInstagramData(e.target.value)} rows={8} className="input-field"></textarea>
                                    <label htmlFor="correlationInstagramData" className="input-label">Data Instagram Insights</label>
                                    <p className="text-xs text-brand-text-secondary mt-1">AI akan membandingkan data ini dengan data prospek & klien dari Instagram yang ada di sistem Anda.</p>
                                </div>
                                <button onClick={handleAnalyzeCorrelation} disabled={isCorrelationLoading} className="button-primary w-full mt-auto">{isCorrelationLoading ? 'Menganalisis...' : 'Analisis Korelasi dengan Data Internal'}</button>
                                {isCorrelationLoading && <div className="text-center p-4 text-brand-text-secondary">Menganalisis korelasi...</div>}
                                {!isCorrelationLoading && correlationAnalysis && <div className="mt-4 space-y-4 text-sm max-h-96 overflow-y-auto pr-2">
                                    <div><h5 className="font-semibold text-brand-accent">Akurasi Audiens</h5><p className="text-xs mt-1">{correlationAnalysis.audience_accuracy.summary}</p><p className="text-xs mt-1 font-bold">Estimasi Kecocokan: {correlationAnalysis.audience_accuracy.match_percentage_estimation}</p><ul className="list-disc list-inside text-xs mt-1 space-y-1">{correlationAnalysis.audience_accuracy.key_findings.map((item: string, i:number) => <li key={i}>{item}</li>)}</ul></div>
                                    <div><h5 className="font-semibold text-brand-accent">Analisis Konversi</h5><p className="text-xs mt-1">{correlationAnalysis.conversion_analysis.summary}</p><p className="text-xs mt-1"><strong>Efektivitas:</strong> {correlationAnalysis.conversion_analysis.effectiveness_notes}</p></div>
                                    <div><h5 className="font-semibold text-brand-accent">Rekomendasi Strategis</h5><ul className="list-disc list-inside text-xs mt-1 space-y-1">
                                        <li><strong>Fokus Konten:</strong> {correlationAnalysis.strategic_recommendations.content_focus}</li>
                                        <li><strong>Penargetan Audiens:</strong> {correlationAnalysis.strategic_recommendations.audience_targeting}</li>
                                        <li><strong>Peningkatan Kualitas Prospek:</strong> {correlationAnalysis.strategic_recommendations.lead_quality_improvement}</li>
                                    </ul></div>
                                </div>}
                            </div>
                        )}
                    </MarketingToolCard>
                </div>
            </div>
            
             {/* Danger Zone */}
            <div className="mt-6 bg-brand-surface p-6 rounded-2xl shadow-lg border-2 border-dashed border-red-500/30">
                 <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 flex-shrink-0">
                        <AlertCircleIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-red-400">Zona Berbahaya</h3>
                        <p className="text-sm text-brand-text-secondary">Tindakan di area ini tidak dapat diurungkan. Harap berhati-hati.</p>
                    </div>
                </div>
                <div className="flex justify-between items-center p-4 bg-brand-bg rounded-lg">
                    <div>
                        <p className="font-semibold text-brand-text-light">Reset Semua Data Aplikasi</p>
                        <p className="text-xs text-brand-text-secondary">Mengembalikan semua data ke kondisi awal (mock data).</p>
                    </div>
                    <button onClick={() => setIsResetModalOpen(true)} className="button-secondary !text-red-400 !border-red-400/50 hover:!bg-red-400/10 flex-shrink-0">
                        Reset Data
                    </button>
                </div>
            </div>
            
            <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Konfirmasi Reset Semua Data">
                <div className="space-y-4">
                    <p className="text-brand-text-primary">Tindakan ini akan <strong className="text-red-400">MENGHAPUS SEMUA DATA</strong> yang telah Anda masukkan (klien, proyek, transaksi, dll.) dan mengembalikannya ke data demo awal.</p>
                    <p className="text-brand-text-secondary">Tindakan ini tidak dapat diurungkan. Untuk melanjutkan, ketik "<strong className="text-red-400">RESET</strong>" di bawah ini.</p>
                    <div className="input-group">
                        <input
                            type="text"
                            id="resetConfirmation"
                            value={resetConfirmationText}
                            onChange={(e) => setResetConfirmationText(e.target.value)}
                            className="input-field"
                            placeholder=" "
                        />
                        <label htmlFor="resetConfirmation" className="input-label">Ketik 'RESET' untuk konfirmasi</label>
                    </div>
                    <div className="flex justify-end pt-4 border-t border-brand-border">
                         <button
                            onClick={handleConfirmReset}
                            disabled={resetConfirmationText !== 'RESET'}
                            className="button-primary bg-red-600 hover:bg-red-700 disabled:bg-red-400/50 disabled:cursor-not-allowed disabled:text-white/50"
                        >
                            Saya mengerti, Reset Semua Data
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Marketing;