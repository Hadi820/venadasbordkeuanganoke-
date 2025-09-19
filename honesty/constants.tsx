


import React from 'react';
import { ViewType, TransactionType, PaymentStatus, PocketType, ClientStatus, LeadStatus, ContactChannel, CardType, AssetStatus, PerformanceNoteType, SatisfactionLevel, RevisionStatus, Notification, SocialMediaPost, PostType, PostStatus, PromoCode, SOP, ClientType, ProjectStatusConfig, VendorData, BookingStatus, ChatTemplate } from './types';
import type { User } from './types';

// --- UTILITY FUNCTIONS ---
export const cleanPhoneNumber = (phone: string | undefined) => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, ''); // Remove all non-numeric characters
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    } else if (!cleaned.startsWith('62')) {
        cleaned = '62' + cleaned;
    }
    return cleaned;
};

export const lightenColor = (hex: string, percent: number): string => {
    if (!hex || !hex.startsWith('#')) return '#ffffff';
    let [r, g, b] = hex.match(/\w\w/g)?.map(x => parseInt(x, 16)) || [255, 255, 255];
    const factor = percent / 100;
    r = Math.min(255, Math.floor(r + (255 - r) * factor));
    g = Math.min(255, Math.floor(g + (255 - g) * factor));
    b = Math.min(255, Math.floor(b + (255 - b) * factor));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export const darkenColor = (hex: string, percent: number): string => {
    if (!hex || !hex.startsWith('#')) return '#000000';
    let [r, g, b] = hex.match(/\w\w/g)?.map(x => parseInt(x, 16)) || [0, 0, 0];
    const factor = 1 - percent / 100;
    r = Math.floor(r * factor);
    g = Math.floor(g * factor);
    b = Math.floor(b * factor);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export const hexToHsl = (hex: string): string => {
    if (!hex || !hex.startsWith('#')) return '0 0% 0%';
    let r = 0, g = 0, b = 0;
    if (hex.length == 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length == 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    r /= 255; g /= 255; b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;
    if (max == min) {
        h = s = 0; // achromatic
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);
    return `${h} ${s}% ${l}%`;
}

// --- ICONS (NEW THEME) ---
// A collection of SVG icon components used throughout the application. Style based on a consistent, modern, and clean line-icon set.
export const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.75 10.75l9-8.25 9 8.25" />
        <path d="M4.75 9.75v10.5c0 .55.45 1 1 1h12.5c.55 0 1-.45 1-1v-10.5" />
        <path d="M9.75 21.25v-6.5c0-.55.45-1 1-1h2.5c.55 0 1 .45 1 1v6.5" />
    </svg>
);
export const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.25" />
        <path d="M3.75 19.75v-2c0-2.21 1.79-4 4-4h2.5c2.21 0 4 1.79 4 4v2" />
        <circle cx="16" cy="8" r="3.25" />
        <path d="M19.25 19.75v-2c0-2.21-1.79-4-4-4h-1.5" />
    </svg>
);
export const FolderKanbanIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.75 6.75C2.75 5.64543 3.64543 4.75 4.75 4.75H9.25L11.25 6.75H19.25C20.3546 6.75 21.25 7.64543 21.25 8.75V17.25C21.25 18.3546 20.3546 19.25 19.25 19.25H4.75C3.64543 19.25 2.75 18.3546 2.75 17.25V6.75Z" />
        <line x1="9.75" y1="12.25" x2="9.75" y2="15.25" />
        <line x1="12.75" y1="10.75" x2="12.75" y2="15.25" />
        <line x1="15.75" y1="13.25" x2="15.75" y2="15.25" />
    </svg>
);
export const BriefcaseIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.75" y="7.75" width="18.5" height="13.5" rx="2" />
        <path d="M16.75 7.75V5.75c0-1.1-.9-2-2-2h-6c-1.1 0-2 .9-2 2v2" />
    </svg>
);
export const DollarSignIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.75V21.25" />
        <path d="M17.25 8.75A3.5 3.5 0 0 0 13.75 5.25H9.75a3.5 3.5 0 0 0 0 7h4a3.5 3.5 0 0 1 0 7H6.75" />
    </svg>
);
export const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.75" y="4.75" width="18.5" height="16.5" rx="2" />
        <path d="M2.75 9.75h18.5" />
        <path d="M8.75 2.75v4" />
        <path d="M15.25 2.75v4" />
    </svg>
);
export const PackageIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.75 8.75v8.5c0 .55.45 1 1 1h16.5c.55 0 1-.45 1-1v-8.5" />
        <path d="M2.75 8.75L12 4.75l9.25 4" />
        <path d="M12 21.25v-12" />
        <path d="M18.25 12.25l-6.25 4-6.25-4" />
        <path d="M2.75 8.75h18.5" />
    </svg>
);
export const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8.75a3.25 3.25 0 100 6.5 3.25 3.25 0 000-6.5z" />
        <path d="M18.18 10.63a1.5 1.5 0 00.32-2.07l.55-.95a2 2 0 00-1-3.46l-1.1.2c-1-.7-2.18-1.1-3.45-1.1h-.01c-1.27 0-2.45.4-3.45 1.1l-1.1-.2a2 2 0 00-1 3.46l.55.95c.2.34.36.73.32 1.13 0 .4-.13.79-.32 1.13l-.55.95a2 2 0 001 3.46l1.1-.2c1 .7 2.18 1.1 3.45 1.1h.01c1.27 0 2.45-.4 3.45-1.1l1.1.2a2 2 0 001-3.46l-.55-.95a1.5 1.5 0 00-.32-1.13z" />
    </svg>
);
export const ChartPieIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.75a9.25 9.25 0 109.25 9.25H12v-9.25z" />
        <path d="M12.75 2.75a9.25 9.25 0 11-10 10" />
    </svg>
);
export const TargetIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9.25" />
        <circle cx="12" cy="12" r="5.25" />
        <circle cx="12" cy="12" r="1.25" />
    </svg>
);
export const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
export const LogOutIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15.75 8.75l3.5 3.25-3.5 3.25" />
    <path d="M8.75 12h10.5" />
    <path d="M8.75 20.25h-4c-1.1 0-2-.9-2-2V5.75c0-1.1.9-2 2-2h4" />
  </svg>
);
export const MoonIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.75 18.25A9.25 9.25 0 1121.25 9.75c-2.03 4.2-6.55 7.2-11.75 6.75-1.2-.1-2.35-.45-3.4-1" />
  </svg>
);
export const SunIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4.25" />
      <path d="M12 2.75V1.75" />
      <path d="M12 22.25V21.25" />
      <path d="M4.75 4.75l-.7-.7" />
      <path d="M19.25 19.25l-.7-.7" />
      <path d="M2.75 12H1.75" />
      <path d="M22.25 12H21.25" />
      <path d="M4.75 19.25l-.7.7" />
      <path d="M19.25 4.75l-.7.7" />
  </svg>
);
export const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
);
export const CreditCardIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.75" y="4.75" width="18.5" height="14.5" rx="2" />
        <line x1="2.75" y1="9.75" x2="21.25" y2="9.75" />
    </svg>
);
export const ClipboardListIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15.75 4.75h3.5c.55 0 1 .45 1 1v14.5c0 .55-.45 1-1 1h-13c-.55 0-1-.45 1-1v-14.5c0-.55.45-1 1-1h3.5" />
        <path d="M12.75 2.75h-1.5c-.55 0-1 .45-1 1v2c0 .55.45 1 1 1h1.5c.55 0 1-.45 1-1v-2c0-.55-.45-1-1-1z" />
        <path d="M8.75 12.75h6.5" />
        <path d="M8.75 16.75h6.5" />
    </svg>
);
export const LightbulbIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.75 18.25h4.5" />
        <path d="M12 21.25v-3" />
        <path d="M12 15.25c-3.18 0-5.75-2.57-5.75-5.75 0-3.18 2.57-5.75 5.75-5.75s5.75 2.57 5.75 5.75c0 1.94-.97 3.67-2.45 4.75" />
    </svg>
);
export const StarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
);
export const CameraIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.75 8.75a2 2 0 012-2h3.5l1.5-2.5h5l1.5 2.5h3.5a2 2 0 012 2v10.5a2 2 0 01-2 2h-16.5a2 2 0 01-2-2v-10.5z" />
        <circle cx="12" cy="13.5" r="3.25" />
    </svg>
);
export const FileTextIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13.75 2.75v6.5h6.5" />
        <path d="M14.75 21.25H5.75c-1.1 0-2-.9-2-2V4.75c0-1.1.9-2 2-2h8l5.5 5.5v9c0 1.1-.9 2-2 2z" />
        <path d="M8.75 13.75h6.5" />
        <path d="M8.75 17.75h6.5" />
    </svg>
);
export const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.75 12c1.5-4.5 5-7.25 9.25-7.25s7.75 2.75 9.25 7.25c-1.5 4.5-5 7.25-9.25 7.25s-7.75-2.75-9.25-7.25z" />
        <circle cx="12" cy="12" r="2.25" />
    </svg>
);
export const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.75 3.25a2.121 2.121 0 013 3L8.75 17.25l-4 1 1-4L16.75 3.25z" />
        <path d="M14.75 5.25l3 3" />
    </svg>
);
export const Trash2Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.75 6.75h16.5" />
        <path d="M18.75 6.75v12.5c0 1.1-.9 2-2 2h-9.5c-1.1 0-2-.9-2-2V6.75" />
        <path d="M8.75 6.75V4.75c0-1.1.9-2 2-2h2.5c1.1 0 2 .9 2 2v2" />
        <path d="M9.75 11.75v5.5" />
        <path d="M14.25 11.75v5.5" />
    </svg>
);
export const PrinterIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5.75 18.25h12.5" />
        <path d="M19.25 12.25v-6.5c0-.55-.45-1-1-1h-12.5c-.55 0-1 .45 1-1v6.5" />
        <path d="M4.75 12.25h1.5c.28 0 .5.22.5.5v7.5c0 .55.45 1 1 1h8.5c.55 0 1-.45 1-1v-7.5c0-.28.22-.5.5-.5h1.5c.55 0 1 .45 1 1v4c0 .55-.45 1-1 1h-1.5" />
    </svg>
);
export const Share2Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"></circle>
        <circle cx="6" cy="12" r="3"></circle>
        <circle cx="18" cy="19" r="3"></circle>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
    </svg>
);
export const HistoryIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.75 7.75v-4h4" />
        <path d="M3.56 12.25a9.25 9.25 0 102.19-4.5L2.75 7.75" />
        <path d="M12 7.75v4.5l3 2" />
    </svg>
);
export const TrendingUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
);
export const AlertCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9.25" />
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
);
export const MessageSquareIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.25 11.75c0 4.14-3.36 7.5-7.5 7.5h-1l-4.5 3v-3h-1.5c-4.14 0-7.5-3.36-7.5-7.5v-4.5c0-4.14 3.36-7.5 7.5-7.5h6c4.14 0 7.5 3.36 7.5 7.5v1.5z" />
    </svg>
);
export const MessageCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.75 21.25C8.05 21.25 4.75 18.15 4.75 13.75C4.75 9.35 8.05 6.25 12.75 6.25C17.45 6.25 20.75 9.35 20.75 13.75C20.75 15.15 20.25 16.45 19.45 17.55L21.25 19.25L19.25 21.25L17.55 19.45C16.45 20.25 15.15 20.75 13.75 20.75H12.75Z"/>
    </svg>
);
export const PhoneIncomingIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15.75 14.25l-3.5 3.5" />
        <path d="M12.25 17.75v-3.5h-3.5" />
        <path d="M21.25 15.25c0 .55-.45 1-1 1-2.02 0-3.92-.78-5.3-2.17s-2.17-3.28-2.17-5.3c0-.55.45-1 1-1 .9 0 1.76.15 2.55.43.34.12.55.51.45.88l-.6 2.1c-.1.36-.45.6-.83.5s-.7-.28-.95-.53c-.76-.76-.76-2 0-2.76.25-.25.38-.6.28-.95l-1.05-3.7c-.1-.36-.48-.57-.85-.45-1.07.35-2.07.86-3 1.57-2.7 2.07-3.88 5.78-2.5 9.25 1.5 3.75 4.88 6.5 8.75 6.5 1.4 0 2.75-.3 4-1 .98-.7 1.6-1.7 1.9-2.88" />
    </svg>
);
export const MapPinIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21.25C12 21.25 4.75 15.25 4.75 10C4.75 6.54822 7.29822 3.75 12 3.75C16.7018 3.75 19.25 6.54822 19.25 10C19.25 15.25 12 21.25 12 21.25Z" />
        <circle cx="12" cy="10" r="3.25" />
    </svg>
);
export const TrendingDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
        <polyline points="17 18 23 18 23 12"></polyline>
    </svg>
);
export const ArrowDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <polyline points="19 12 12 19 5 12"></polyline>
    </svg>
);
export const ArrowUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="19" x2="12" y2="5"></line>
        <polyline points="5 12 12 5 19 12"></polyline>
    </svg>
);
export const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.75 14.75v3.5c0 .55.45 1 1 1h16.5c.55 0 1-.45 1-1v-3.5" />
        <path d="M12 15.75v-13" />
        <path d="M8.75 12.75l3.25 3 3.25-3" />
    </svg>
);
export const ListIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"></line>
        <line x1="8" y1="12" x2="21" y2="12"></line>
        <line x1="8" y1="18" x2="21" y2="18"></line>
        <line x1="3" y1="6" x2="3.01" y2="6"></line>
        <line x1="3" y1="12" x2="3.01" y2="12"></line>
        <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>
);
export const LayoutGridIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
    </svg>
);
export const CheckSquareIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.75 11.75l2.5 2.5 5-5" />
        <path d="M2.75 5.75c0-1.1.9-2 2-2h14.5c1.1 0 2 .9 2 2v12.5c0 1.1-.9 2-2 2H4.75c-1.1 0-2-.9-2-2V5.75z" />
    </svg>
);
export const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9.25" />
        <path d="M12 7.75v4.5l3 2" />
    </svg>
);
export const SendIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.25 3.75L2.75 11.25l7.5 2.5 2.5 7.5 7.5-18.5z" />
        <path d="M10.25 13.75l7.5-7.5" />
    </svg>
);
export const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21.25a9.25 9.25 0 100-18.5 9.25 9.25 0 000 18.5z" />
        <path d="M8.75 12.25l2.5 2.5 5-5" />
    </svg>
);
export const PiggyBankIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.75 14.75v4.5c0 .55.45 1 1 1h4" />
        <path d="M19.75 14.75c1.1 0 2 .9 2 2v2.5" />
        <path d="M2.75 12.75c0-4.14 3.36-7.5 7.5-7.5h.5c3.85 0 7.08 2.92 7.45 6.75" />
        <path d="M11.75 14.75h4.5c.55 0 1 .45 1 1v4.5c0 .55-.45 1-1 1h-12c-1.1 0-2-.9-2-2V13.75c0-1 .6-1.87 1.5-2.2" />
        <path d="M15.75 8.75v1.5" />
    </svg>
);
export const UserCheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.75 18.75v-2c0-2.21-1.79-4-4-4h-4.5c-2.21 0-4 1.79-4 4v2" />
        <circle cx="8.25" cy="6.75" r="3" />
        <path d="M16.75 11.75l2 2 4-4" />
    </svg>
);
export const LockIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.75" y="11.75" width="16.5" height="9.5" rx="2" />
        <path d="M6.75 11.75V7.75c0-2.76 2.24-5 5-5s5 2.24 5 5v4" />
    </svg>
);
export const Users2Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.25" />
        <path d="M3.75 19.75v-2c0-2.21 1.79-4 4-4h2.5c2.21 0 4 1.79 4 4v2" />
        <circle cx="16" cy="8" r="3.25" />
        <path d="M19.25 19.75v-2c0-2.21-1.79-4-4-4h-1.5" />
    </svg>
);
export const BarChart2Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"></line>
        <line x1="12" y1="20" x2="12" y2="4"></line>
        <line x1="6" y1="20" x2="6" y2="14"></line>
    </svg>
);
export const BanIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9.25"></circle>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
    </svg>
);
export const CashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.75" y="6.75" width="18.5" height="10.5" rx="2" />
        <circle cx="12" cy="12" r="2.25" />
    </svg>
);
export const KeyIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8.25" cy="15.75" r="4.5" />
        <path d="M12.75 11.25l5-5" />
        <path d="M15.75 9.25l2-2" />
    </svg>
);
export const SmileIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9.25" />
        <path d="M8.75 14.75s1.5 2 3.25 2 3.25-2 3.25-2" />
        <circle cx="9.25" cy="9.75" r=".5" fill="currentColor" />
        <circle cx="14.75" cy="9.75" r=".5" fill="currentColor" />
    </svg>
);
export const ThumbsUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 10v12" />
        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a2 2 0 0 1 3 1.88Z" />
    </svg>
);
export const MehIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9.25" />
        <path d="M8.75 15.75h6.5" />
        <circle cx="9.25" cy="9.75" r=".5" fill="currentColor" />
        <circle cx="14.75" cy="9.75" r=".5" fill="currentColor" />
    </svg>
);
export const FrownIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9.25" />
        <path d="M15.25 15.75s-1.5-2-3.25-2-3.25 2-3.25 2" />
        <circle cx="9.25" cy="9.75" r=".5" fill="currentColor" />
        <circle cx="14.75" cy="9.75" r=".5" fill="currentColor" />
    </svg>
);
export const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
);
export const GalleryHorizontalIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="2" />
        <circle cx="8.75" cy="8.75" r="1.5" />
        <path d="M21.25 14.75l-4.5-4.5-9 9" />
    </svg>
);
export const BookOpenIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
    </svg>
);
export const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);
export const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);

export const SparkleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2.5l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5 1.5-4z"/>
        <path d="M18.5 12.5l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z"/>
        <path d="M18.5 2.5l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z"/>
    </svg>
);
export const QrCodeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
        <line x1="14" y1="14" x2="14" y2="14.01"></line>
        <line x1="17" y1="14" x2="17" y2="14.01"></line>
        <line x1="14" y1="17" x2="14" y2="17.01"></line>
        <line x1="17" y1="17" x2="17" y2="17.01"></line>
        <line x1="21" y1="14" x2="21" y2="14.01"></line>
        <line x1="14" y1="21" x2="14" y2="21.01"></line>
        <line x1="17" y1="21" x2="17" y2="21.01"></line>
        <line x1="21" y1="17" x2="21" y2="21.01"></line>
        <line x1="21" y1="21" x2="21" y2="21.01"></line>
    </svg>
);
export const WhatsappIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.47 14.38C17.2 14.24 16.1 13.71 15.88 13.62C15.67 13.53 15.51 13.5 15.36 13.77C15.21 14.04 14.67 14.65 14.53 14.81C14.38 14.97 14.24 15 13.97 14.86C13.7 14.71 12.83 14.41 11.8 13.54C11 12.86 10.45 12.03 10.31 11.76C10.16 11.49 10.31 11.35 10.45 11.21C10.58 11.07 10.75 10.85 10.9 10.69C11.04 10.53 11.1 10.41 11.21 10.22C11.33 10.03 11.27 9.87 11.2 9.73C11.12 9.59 10.61 8.31 10.4 7.78C10.19 7.25 9.98 7.32 9.83 7.31C9.69 7.31 9.53 7.31 9.38 7.31C9.23 7.31 8.95 7.38 8.75 7.65C8.55 7.92 7.9 8.49 7.9 9.61C7.9 10.73 8.78 11.82 8.92 11.96C9.06 12.11 10.66 14.49 13 15.46C15.34 16.43 15.34 16.03 15.82 15.96C16.3 15.89 17.24 15.35 17.42 14.81C17.6 14.27 17.6 13.8 17.52 13.66C17.44 13.53 17.3 13.46 17.16 13.41L17.47 14.38Z" />
        <path d="M21.12 12.42C21.12 17.39 17.14 21.38 12.18 21.38C10.29 21.38 8.52 20.85 7.03 19.94L3 21L4.09 17.12C3.12 15.65 2.55 13.92 2.55 12.23C2.55 7.26 6.53 3.28 11.49 3.28C13.88 3.28 16.04 4.16 17.76 5.61C19.48 7.06 20.57 8.93 20.57 11.01" />
    </svg>
);
export const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
);
export const HashtagIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="9" x2="20" y2="9"></line>
        <line x1="4" y1="15" x2="20" y2="15"></line>
        <line x1="10" y1="3" x2="8" y2="21"></line>
        <line x1="16" y1="3" x2="14" y2="21"></line>
    </svg>
);


// --- NAVIGATION ---
export const NAV_ITEMS = [
    { view: ViewType.DASHBOARD, label: 'Dasbor', icon: HomeIcon },
    { view: ViewType.PROSPEK, label: 'Prospek', icon: TargetIcon },
    { view: ViewType.BOOKING, label: 'Booking', icon: ClipboardListIcon },
    { view: ViewType.CLIENTS, label: 'Klien', icon: UsersIcon },
    { view: ViewType.PROJECTS, label: 'Proyek', icon: FolderKanbanIcon },
    { view: ViewType.TEAM, label: 'Freelancer', icon: BriefcaseIcon },
    { view: ViewType.FINANCE, label: 'Keuangan', icon: DollarSignIcon },
    { view: ViewType.CALENDAR, label: 'Kalender', icon: CalendarIcon },
    { view: ViewType.SOCIAL_MEDIA_PLANNER, label: 'Perencana Sosmed', icon: Share2Icon },
    { view: ViewType.MARKETING, label: 'Marketing', icon: TrendingUpIcon },
    { view: ViewType.PACKAGES, label: 'Paket', icon: PackageIcon },
    { view: ViewType.ASSETS, label: 'Aset', icon: CameraIcon },
    { view: ViewType.CONTRACTS, label: 'Kontrak', icon: FileTextIcon },
    { view: ViewType.PROMO_CODES, label: 'Kode Promo', icon: LightbulbIcon },
    { view: ViewType.SOP, label: 'SOP', icon: BookOpenIcon },
    { view: ViewType.CLIENT_REPORTS, label: 'Laporan Klien', icon: ChartPieIcon },
    { view: ViewType.SETTINGS, label: 'Pengaturan', icon: SettingsIcon },
];

// --- [NEW] CHAT TEMPLATES ---
export const CHAT_TEMPLATES: ChatTemplate[] = [
    {
        id: 'welcome',
        title: 'Ucapan Selamat Datang',
        template: 'Halo {clientName}, selamat! Booking Anda untuk proyek "{projectName}" telah kami konfirmasi. Kami sangat senang bisa bekerja sama dengan Anda! Tim kami akan segera menghubungi Anda untuk langkah selanjutnya. Terima kasih!'
    },
    {
        id: 'next_steps',
        title: 'Langkah Selanjutnya',
        template: 'Hai {clientName}, menindaklanjuti konfirmasi proyek "{projectName}", berikut adalah beberapa langkah selanjutnya yang bisa kita diskusikan: [Sebutkan langkah selanjutnya, misal: jadwal meeting, survey lokasi, dll]. Mohon informasikan waktu terbaik Anda. Terima kasih.'
    },
    {
        id: 'payment_reminder',
        title: 'Pengingat Pelunasan',
        template: 'Yth. {clientName},\n\nIni adalah pengingat ramah untuk pembayaran pelunasan proyek "{projectName}" Anda yang akan segera jatuh tempo.\n\nMohon informasikan jika Anda sudah melakukan pembayaran.\n\nTerima kasih.'
    }
];

const ADMIN_USER_ID = 'c1e1f2b4-a0f1-4a47-9c9c-2b2a6b2a0c1b';
const MEMBER_USER_ID = 'd2e2f3b5-b1f2-5b58-8d8d-3c3b7c3b1d2c';
const PROFILE_ID = `prof-${ADMIN_USER_ID.slice(0, 23)}`;

export const MOCK_USERS: User[] = [
    { id: ADMIN_USER_ID, email: 'admin@vena.pictures', password: 'admin', fullName: 'Andi Vena', companyName: 'Vena Pictures', role: 'Admin' },
    { id: MEMBER_USER_ID, email: 'member@vena.pictures', password: 'member', fullName: 'Rina Asisten', companyName: 'Vena Pictures', role: 'Member', permissions: [ViewType.DASHBOARD, ViewType.CLIENTS, ViewType.PROJECTS, ViewType.CALENDAR, ViewType.SOCIAL_MEDIA_PLANNER] },
];

// --- IDs for consistency
const CLIENT_1_ID = 'CLI001'; // Budi & Sinta
const CLIENT_2_ID = 'CLI002'; // PT Sejahtera Abadi
const CLIENT_4_ID = 'CLI004'; // Dewi & Rian
const CLIENT_5_ID = 'CLI005'; // Farhan & Aisyah
const CLIENT_6_ID = 'CLI006'; // Agung & Bella
const CLIENT_7_ID = 'CLI007'; // Rina & Doni
const CLIENT_8_ID = 'CLI008'; // CV Maju Jaya (Vendor)
const CLIENT_9_ID = 'CLI009'; // Kevin & Laura (Lost)

const TEAM_1_ID = 'TM001'; // Andi Pratama (Photo)
const TEAM_2_ID = 'TM002'; // Citra Lestari (Video)
const TEAM_3_ID = 'TM003'; // Doni Firmansyah (Editor)
const TEAM_4_ID = 'TM004'; // Rian Hidayat (Asisten)
const TEAM_5_ID = 'TM005'; // Fira Anjani (MUA)
const TEAM_6_ID = 'TM006'; // Eka Wijaya (Drone Pilot)

const PKG_1_ID = 'PKG001'; // Silver Wedding
const PKG_2_ID = 'PKG002'; // Gold Wedding
const PKG_3_ID = 'PKG003'; // Corporate
const PKG_4_ID = 'PKG004'; // Engagement
const PKG_5_ID = 'PKG005'; // Prewedding
const PKG_6_ID = 'PKG006'; // Family Session

const PROJ_1_ID = 'PRJ001'; // Budi & Sinta
const PROJ_2_ID = 'PRJ002'; // PT SA
const PROJ_4_ID = 'PRJ004'; // Dewi & Rian
const PROJ_5_ID = 'PRJ005'; // Farhan & Aisyah
const PROJ_7_ID = 'PRJ007'; // Agung & Bella
const PROJ_8_ID = 'PRJ008'; // Rina & Doni
const PROJ_9_ID = 'PRJ009'; // CV Maju Jaya Product Shoot
const PROJ_10_ID = 'PRJ010'; // Prewedding Kevin & Laura
const PROJ_11_ID = 'PRJ011'; // Pernikahan Budi & Sinta (Dibatalkan)
const PROJ_12_ID = 'PRJ012'; // Maternity Budi & Sinta (New)

const ADDON_1_ID = 'ADDON001'; // Same Day Edit
const ADDON_2_ID = 'ADDON002'; // Drone
const ADDON_3_ID = 'ADDON003'; // MUA
const ADDON_4_ID = 'ADDON004'; // Extra Album

const PROMO_1_ID = 'PROMO001';
const PROMO_2_ID = 'PROMO002'; // Inactive

const CONTRACT_1_ID = 'CTR001'; 
const CONTRACT_2_ID = 'CTR002'; 
const CONTRACT_3_ID = 'CTR003'; 

const REV_1_ID = 'REV001'; 
const REV_2_ID = 'REV002'; 

export const MOCK_DP_PROOF_BASE64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxISEhUSEhIVFRUVFRUVFRUVFRUVFRUVFRUWFhUVFRUYHSggGBolHRUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OFw8QFS0ZFR0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/aAAwBAQEAAAAAAAABtZtqW6T2HYp0qS0S37ANYGOa6v77W6gZgAAAAAAAAAAAAAAAAAAAAAAGc3ZbgMalai17+QGkBkpN+xAAAAAAAAGakm7L6gMojFR9bAYHQXX+TAVEc0U/IDAAYOhHvxmMrRaJrqq4GkAAAAAAAAAAAAAAAAAAAAAAAZSlaTYGtXqt1ZbPRgNVOSi9GtuwDYhJJq6AxAznaibEVZK2MDAAAAAAAAAAAAaNKpyvl6gbwAMqU1AXf0AxpVOdX6bANwAAAAAZTkopylZKK3sDVpVObm2bQN0AAAAAAAAAAAAAAAAAAAAAAAZSlaTYGtUqc0uLugGlCpZZJSW3aBuykpJdLYDEFWpLRd3oZIrJJdwMAAAAAAAAAAAAg6s5S2WWKK3dAarpyhqrNb94GyqsXtWj3AbAI1KyWxXdwNd1Zy0Sst24GKrSnq7Pu2A2lSitt3vMsqKirID0AAAAAAGc5WTYGtKpzdW6gaEKvK0pbNgbgIZVIy1i0wMAAAAAAAAAAAAAAAAAAAAAAAAr1Zc0m/oBupUeWKT3agbsZKSutgMQVqkrJvq9CMVZJdwMAAAAAAAAAAAAAAAi6s5S2WWKK3dAaqpTjqrNb94Gwq0XtWj3AbQIVZyeiUV3A1XOcl+WK7gYKnKWrs+7cDYVKMVuu95koqKskB6AAAAABlOVk2BrSpzNtv6AaNOpytS2o3ARnSjNWaaAwAAAAAAAAAAAAAAAAAAAAAAAClUkorXxA1ZVGdHo9OwGlCpySSlsa3Ab0ZKSutgPQAAAAAArYjEcsVFfmkBySnKpOy2yfIDoUKSgrLZbcDKMVFWSAwAABWq/p9SW0U9O+xM1s0K3I7S9l7AN0AAAAAAACjUblUaW1uyA6EYqKSWwAAAAAAAAAAAAAAFGvT5lzewDcRnTU4uL2MCnGpzKz2rZcDRAr16PK+ZbHoBvRlzipeAGQAAAAAAAAAAAAa9afKrlOq7u7AwAAAAAAAAAAAAAAAAAAAAAAAAAAADVrq8GuqA0qUuSSb2MDejJSSktjAyqT5IuXYc85ubvJ3YwYgAByVMPCa1WvUBzVMBOOz3dGaaMqkZWa2MDeoYpS0lpLp0A3AAAAAAAAMqceVXAygAAAAAAAAAAAAAAAACpJ80o7u/uY1cQqS1WreBupSlN80twOhCOSKj2AxgAAAAAIyipaNAMJ0JxeaDXUDaq1o01d+5HNUnKbvJ3fUDGEYxVooDAAAAAAAAAAAAP//Z';

const MOCK_PACKAGES: VendorData['packages'] = [
    { 
        id: PKG_1_ID, 
        name: 'Paket Pernikahan Silver', 
        price: 12000000, 
        category: 'Pernikahan', 
        physicalItems: [{ name: 'Album Cetak Eksklusif 20x30cm 20 Halaman', price: 850000 }, { name: 'Cetak Foto 16R + Bingkai Minimalis (2pcs)', price: 400000 }], 
        digitalItems: ['Semua file foto (JPG) hasil seleksi', '1 Video highlight (3-5 menit)'], 
        processingTime: '30 hari kerja', 
        photographers: '2 Fotografer', 
        videographers: '1 Videografer',
        coverImage: 'https://images.unsplash.com/photo-1517825738778-7decc3c3a406?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80'
    },
    { id: PKG_2_ID, name: 'Paket Pernikahan Gold', price: 25000000, category: 'Pernikahan', physicalItems: [{ name: 'Album Cetak Premium 25x30cm 30 Halaman', price: 1500000 }, { name: 'Cetak Foto 20R + Bingkai Premium (2pcs)', price: 750000 }, { name: 'Box Kayu Eksklusif + Flashdisk 64GB', price: 500000 }], digitalItems: ['Semua file foto (JPG) tanpa seleksi', '1 Video sinematik (5-7 menit)', 'Video Teaser 1 menit untuk sosmed'], processingTime: '45 hari kerja', photographers: '2 Fotografer', videographers: '2 Videografer' },
    { id: PKG_3_ID, name: 'Paket Acara Korporat', price: 8000000, category: 'Korporat', physicalItems: [], digitalItems: ['Dokumentasi foto (JPG)', '1 Video dokumentasi (10-15 menit)'], processingTime: '14 hari kerja', photographers: '1 Fotografer', videographers: '1 Videografer' },
    { id: PKG_4_ID, name: 'Paket Lamaran', price: 5000000, category: 'Lamaran', physicalItems: [], digitalItems: ['Semua file foto (JPG) hasil seleksi', '1 Video highlight (1-2 menit)'], processingTime: '14 hari kerja', photographers: '1 Fotografer' },
    { id: PKG_5_ID, name: 'Paket Prewedding', price: 6500000, category: 'Prewedding', physicalItems: [{name: 'Cetak Foto Kanvas 40x60cm', price: 600000}], digitalItems: ['50 foto edit high-resolution', '1 video sinematik 1 menit'], processingTime: '21 hari kerja', photographers: '1 Fotografer', videographers: '1 Videografer' },
    { id: PKG_6_ID, name: 'Sesi Foto Keluarga', price: 3500000, category: 'Keluarga', physicalItems: [{ name: 'Cetak Foto 10R + Bingkai (5pcs)', price: 350000 }], digitalItems: ['25 foto edit high-resolution'], processingTime: '10 hari kerja', photographers: '1 Fotografer' },
];

const MOCK_ADDONS: VendorData['addOns'] = [
    { id: ADDON_1_ID, name: 'Same Day Edit Video', price: 2500000 },
    { id: ADDON_2_ID, name: 'Aerial Drone Shot', price: 1500000 },
    { id: ADDON_3_ID, name: 'Jasa MUA Profesional', price: 1000000 },
    { id: ADDON_4_ID, name: 'Album Tambahan untuk Orang Tua', price: 1200000 },
];

const MOCK_USER_PROFILE: VendorData['profile'] = {
    id: PROFILE_ID,
    adminUserId: ADMIN_USER_ID,
    fullName: 'Andi Vena',
    email: 'admin@vena.pictures',
    phone: '081288889999',
    companyName: 'Vena Pictures',
    website: 'https://venapictures.com',
    address: 'Jl. Kreatif No. 10, Jakarta Pusat',
    bankAccount: 'BCA - 9876543210 a/n Vena Pictures',
    authorizedSigner: 'Andi Vena',
    idNumber: '3171234567890002',
    bio: 'Mengabadikan momen dengan sentuhan sinematik. Spesialis pernikahan dan prewedding di Vena Pictures.',
    incomeCategories: ['DP Proyek', 'Pelunasan Proyek', 'Penjualan Cetak', 'Sewa Alat', 'Modal', 'Penjualan Add-on'],
    expenseCategories: ['Gaji Freelancer', 'Transportasi', 'Akomodasi', 'Konsumsi', 'Peralatan', 'Marketing', 'Operasional Kantor', 'Sewa Tempat', 'Cetak Album', 'Penarikan Hadiah Freelancer', 'Transfer Internal', 'Penutupan Anggaran', 'Biaya Produksi Lain'],
    projectTypes: ['Pernikahan', 'Lamaran', 'Prewedding', 'Korporat', 'Ulang Tahun', 'Produk', 'Keluarga'],
    eventTypes: ['Meeting Klien', 'Survey Lokasi', 'Libur', 'Workshop', 'Acara Internal', 'Lainnya'],
    assetCategories: ['Kamera', 'Lensa', 'Lighting', 'Komputer', 'Drone', 'Aksesoris', 'Lainnya'],
    sopCategories: ['Pernikahan', 'Korporat', 'Umum', 'Editing', 'Prewedding'],
    packageCategories: ['Pernikahan', 'Lamaran', 'Prewedding', 'Korporat', 'Ulang Tahun', 'Produk', 'Keluarga'],
    projectStatusConfig: [
        { id: 'status_1', name: 'Persiapan', color: '#6366f1', subStatuses: [{name: 'Briefing Internal', note: 'Rapat tim internal untuk membahas konsep.'}, {name: 'Survey Lokasi', note: 'Kunjungan ke lokasi acara jika diperlukan.'}], note: 'Tahap awal persiapan proyek.' },
        { id: 'status_2', name: 'Dikonfirmasi', color: '#3b82f6', subStatuses: [{name: 'Pembayaran DP', note: 'Menunggu konfirmasi pembayaran DP dari klien.'}, {name: 'Penjadwalan Tim', note: 'Mengalokasikan freelancer untuk proyek.'}], note: 'Proyek telah dikonfirmasi oleh klien.' },
        { id: 'status_3', name: 'Editing', color: '#8b5cf6', subStatuses: [{name: 'Seleksi Foto', note: 'Proses pemilihan foto terbaik oleh tim atau klien.'}, {name: 'Color Grading Video', note: 'Penyesuaian warna pada video.'}, {name: 'Music Scoring', note: 'Pemilihan musik latar untuk video.'}], note: 'Proses pasca-produksi.' },
        { id: 'status_4', name: 'Revisi', color: '#14b8a6', subStatuses: [], note: 'Tahap revisi berdasarkan masukan klien.' },
        { id: 'status_5', name: 'Cetak', color: '#f97316', subStatuses: [{name: 'Approval Desain Album', note: 'Menunggu persetujuan final desain album dari klien.'}, {name: 'Proses Cetak', note: 'Album dan foto sedang dalam proses pencetakan.'}, {name: 'QC Album', note: 'Pemeriksaan kualitas hasil cetakan.'}], note: 'Proses pencetakan output fisik.' },
        { id: 'status_6', name: 'Dikirim', color: '#06b6d4', subStatuses: [], note: 'Hasil akhir telah dikirim ke klien.' },
        { id: 'status_7', name: 'Selesai', color: '#10b981', subStatuses: [], note: 'Proyek telah selesai dan semua pembayaran lunas.' },
        { id: 'status_8', name: 'Dibatalkan', color: '#ef4444', subStatuses: [], note: 'Proyek dibatalkan oleh klien atau vendor.' },
    ],
    notificationSettings: { newProject: true, paymentConfirmation: true, deadlineReminder: true },
    securitySettings: { twoFactorEnabled: false },
    briefingTemplate: 'Halo tim,\nBerikut adalah briefing untuk acara besok.\n\nKey Persons:\n- [Nama CP Klien]\n- [Nama WO]\n\nJangan lupa:\n- Bawa baterai cadangan & memory card kosong.\n- Datang 1 jam sebelum acara dimulai.\n- Dress code: Hitam rapi.\n\nSemangat!',
    termsAndConditions: '📜 **Syarat & Ketentuan Umum**\n- Harga yang tertera dapat berubah sewaktu-waktu sebelum adanya kesepakatan.\n\n💰 **Pembayaran**\n- Pemesanan dianggap sah setelah pembayaran Uang Muka (DP) sebesar 50% dari total biaya.\n- Pelunasan wajib dilakukan paling lambat 3 (tiga) hari sebelum tanggal acara.\n\n⏱ **Pembatalan & Perubahan Jadwal**\n- Uang Muka (DP) yang telah dibayarkan tidak dapat dikembalikan (non-refundable) jika terjadi pembatalan dari pihak klien.\n- Perubahan jadwal dapat dilakukan maksimal 1 (satu) kali dengan konfirmasi selambat-lambatnya 14 hari sebelum tanggal acara, tergantung ketersediaan tim.\n\n📦 **Hasil Akhir**\n- Waktu pengerjaan hasil akhir (foto & video) adalah sesuai dengan yang tertera pada detail paket, dihitung setelah semua materi dan data dari klien kami terima.\n- Hak cipta hasil foto dan video tetap menjadi milik Vena Pictures. Klien mendapatkan hak guna pribadi dan non-komersial.\n- Vena Pictures berhak menggunakan hasil foto dan video untuk keperluan portofolio dan promosi dengan seizin klien.',
    logoBase64: undefined,
    brandColor: '#3b82f6',
    publicPageConfig: {
      template: 'classic',
      title: 'Galeri & Paket Layanan Kami',
      introduction: 'Lihat portofolio terbaru dan paket layanan yang kami tawarkan. Kami siap mengabadikan momen spesial Anda.',
      galleryImages: [],
    },
    packageShareTemplate: 'Halo {leadName},\n\nTerima kasih atas ketertarikan Anda dengan layanan dari {companyName}. Berikut adalah tautan untuk melihat daftar paket layanan kami:\n\n{packageLink}\n\nJangan ragu untuk bertanya jika ada yang kurang jelas.\n\nTerima kasih,\nTim {companyName}',
    bookingFormTemplate: 'Halo {leadName},\n\nMenindaklanjuti diskusi kita, silakan isi formulir pemesanan pada tautan berikut untuk melanjutkan ke tahap selanjutnya:\n\n{bookingFormLink}\n\nKami tunggu konfirmasinya.\n\nTerima kasih,\nTim {companyName}',
    chatTemplates: CHAT_TEMPLATES,
};

// --- [NEW] VENDOR-SPECIFIC DATA SETS ---

export const MOCK_DATA: VendorData = {
    profile: MOCK_USER_PROFILE,
    packages: MOCK_PACKAGES,
    addOns: MOCK_ADDONS,
    clients: [
        { id: CLIENT_1_ID, name: 'Budi & Sinta', email: 'budi.sinta@email.com', phone: '081234567890', whatsapp: '6281234567890', instagram: '@budi.sinta.wedding', since: '2023-05-15', status: ClientStatus.ACTIVE, clientType: ClientType.DIRECT, lastContact: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(), portalAccessId: 'portal-budi-sinta-1a2b' },
        { id: CLIENT_2_ID, name: 'PT Sejahtera Abadi', email: 'hrd@sejahtera.co.id', phone: '021-555-0123', whatsapp: '62215550123', since: '2023-02-20', status: ClientStatus.ACTIVE, clientType: ClientType.VENDOR, lastContact: new Date(new Date().setDate(new Date().getDate() - 60)).toISOString(), portalAccessId: 'portal-sejahtera-abadi-3c4d' },
        { id: CLIENT_4_ID, name: 'Dewi & Rian', email: 'dewi.rian@email.com', phone: '081298765432', whatsapp: '6281298765432', since: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(), status: ClientStatus.ACTIVE, clientType: ClientType.DIRECT, lastContact: new Date().toISOString(), portalAccessId: 'portal-dewi-rian-7g8h' },
        { id: CLIENT_5_ID, name: 'Farhan & Aisyah', email: 'farhan.aisyah@email.com', phone: '085712345678', whatsapp: '6285712345678', since: '2023-08-01', status: ClientStatus.ACTIVE, clientType: ClientType.DIRECT, lastContact: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), portalAccessId: 'portal-farhan-aisyah-9i0j' },
        { id: CLIENT_6_ID, name: 'Agung & Bella (The Senjaya)', email: 'agung.senjaya@email.com', phone: '081333444555', whatsapp: '6281333444555', instagram: '@thesenjayastory', since: '2023-09-20', status: ClientStatus.ACTIVE, clientType: ClientType.DIRECT, lastContact: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), portalAccessId: 'portal-agung-bella-1k2l' },
        { id: CLIENT_7_ID, name: 'Rina & Doni', email: 'rina.doni@email.com', phone: '081212123434', whatsapp: '6281212123434', since: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(), status: ClientStatus.ACTIVE, clientType: ClientType.DIRECT, lastContact: new Date().toISOString(), portalAccessId: 'portal-rina-doni-3k4l' },
        { id: CLIENT_8_ID, name: 'CV Maju Jaya', email: 'marketing@majujaya.com', phone: '031-888-999', whatsapp: '6231888999', since: '2023-11-10', status: ClientStatus.INACTIVE, clientType: ClientType.VENDOR, lastContact: new Date(new Date().setDate(new Date().getDate() - 90)).toISOString(), portalAccessId: 'portal-majujaya-5m6n' },
        { id: CLIENT_9_ID, name: 'Kevin & Laura', email: 'kevin.laura@email.com', phone: '081812341234', whatsapp: '6281812341234', since: '2023-10-05', status: ClientStatus.LOST, clientType: ClientType.DIRECT, lastContact: new Date(new Date().setDate(new Date().getDate() - 40)).toISOString(), portalAccessId: 'portal-kevinlaura-7o8p' },
    ],
    teamMembers: [
        { id: TEAM_1_ID, name: 'Andi Pratama', role: 'Fotografer', email: 'andi.p@freelance.com', phone: '081111111111', standardFee: 1500000, noRek: 'WBank 111222333', rewardBalance: 850000, rating: 4.8, performanceNotes: [{ id: 'PN001', date: new Date(new Date().setDate(new Date().getDate() - 70)).toISOString(), note: 'Hasil foto di acara PT SA sangat tajam dan komposisinya bagus.', type: PerformanceNoteType.PRAISE }], portalAccessId: 'freelancer-andi-pratama' },
        { id: TEAM_2_ID, name: 'Citra Lestari', role: 'Videografer', email: 'citra.l@freelance.com', phone: '082222222222', standardFee: 2000000, noRek: 'M-Bank 444555666', rewardBalance: 850000, rating: 4.9, performanceNotes: [{ id: 'PN002', date: new Date(new Date().setDate(new Date().getDate() - 65)).toISOString(), note: 'Video highlight acara PT SA selesai lebih cepat dari deadline.', type: PerformanceNoteType.PRAISE }], portalAccessId: 'freelancer-citra-lestari' },
        { id: TEAM_3_ID, name: 'Doni Firmansyah', role: 'Editor', email: 'doni.f@freelance.com', phone: '083333333333', standardFee: 1000000, noRek: 'WBank 777888999', rewardBalance: 150000, rating: 4.5, performanceNotes: [{ id: 'PN003', date: new Date(new Date().setDate(new Date().getDate() - 20)).toISOString(), note: 'Sedikit terlambat dalam pengumpulan draf pertama untuk revisi pernikahan Farhan & Aisyah.', type: PerformanceNoteType.LATE_DEADLINE }], portalAccessId: 'freelancer-doni-firmansyah' },
        { id: TEAM_4_ID, name: 'Rian Hidayat', role: 'Asisten Fotografer', email: 'rian.h@freelance.com', phone: '084444444444', standardFee: 500000, noRek: 'WBank 123123123', rewardBalance: 0, rating: 4.6, performanceNotes: [], portalAccessId: 'freelancer-rian-hidayat' },
        { id: TEAM_5_ID, name: 'Fira Anjani', role: 'MUA & Asisten', email: 'fira.a@freelance.com', phone: '085555555555', standardFee: 750000, noRek: 'WBank 456456456', rewardBalance: 0, rating: 4.7, performanceNotes: [], portalAccessId: 'freelancer-fira-anjani' },
        { id: TEAM_6_ID, name: 'Eka Wijaya', role: 'Pilot Drone', email: 'eka.w@freelance.com', phone: '086666666666', standardFee: 1200000, noRek: 'M-Bank 789789789', rewardBalance: 0, rating: 4.8, performanceNotes: [], portalAccessId: 'freelancer-eka-wijaya' },
    ],
    projects: [
        { id: PROJ_1_ID, projectName: 'Pernikahan Budi & Sinta', clientId: CLIENT_1_ID, clientName: 'Budi & Sinta', projectType: 'Pernikahan', packageId: PKG_1_ID, packageName: 'Paket Pernikahan Silver', addOns: [{ id: ADDON_2_ID, name: 'Aerial Drone Shot', price: 1500000 }], date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(), deadlineDate: new Date(new Date().setDate(new Date().getDate())).toISOString(), location: 'Gedung Serbaguna, Bandung', progress: 100, status: 'Selesai', activeSubStatuses: [], totalCost: 13500000, amountPaid: 13500000, paymentStatus: PaymentStatus.LUNAS, team: [{ memberId: TEAM_1_ID, name: 'Andi Pratama', role: 'Fotografer', fee: 1500000 }, { memberId: TEAM_2_ID, name: 'Citra Lestari', role: 'Videografer', fee: 2000000 }, { memberId: TEAM_3_ID, name: 'Doni Firmansyah', role: 'Editor', fee: 1000000 }, { memberId: TEAM_6_ID, name: 'Eka Wijaya', role: 'Pilot Drone', fee: 1200000 }], driveLink: 'https://docs.google.com/document/d/example1/edit', finalDriveLink: 'https://www.dropbox.com/sh/example1/AAA_example', image: 'https://images.unsplash.com/photo-1597157639073-69284dc0fdaf?q=80&w=300', bookingStatus: BookingStatus.TERKONFIRMASI },
        { id: PROJ_2_ID, projectName: 'Gathering Tahunan PT SA', clientId: CLIENT_2_ID, clientName: 'PT Sejahtera Abadi', projectType: 'Korporat', packageId: PKG_3_ID, packageName: 'Paket Acara Korporat', addOns: [], date: new Date(new Date().setDate(new Date().getDate() - 60)).toISOString(), deadlineDate: new Date(new Date().setDate(new Date().getDate() - 46)).toISOString(), location: 'Hotel Grand Hyatt, Jakarta', progress: 100, status: 'Selesai', totalCost: 8000000, amountPaid: 8000000, paymentStatus: PaymentStatus.LUNAS, team: [{ memberId: TEAM_1_ID, name: 'Andi Pratama', role: 'Fotografer', fee: 1500000, reward: 250000 }, { memberId: TEAM_2_ID, name: 'Citra Lestari', role: 'Videografer', fee: 2000000, reward: 250000 }], finalDriveLink: 'https://www.dropbox.com/sh/example2/AAD_example', bookingStatus: BookingStatus.TERKONFIRMASI },
        { id: PROJ_4_ID, projectName: 'Lamaran Dewi & Rian', clientId: CLIENT_4_ID, clientName: 'Dewi & Rian', projectType: 'Lamaran', packageId: PKG_4_ID, packageName: 'Paket Lamaran', addOns: [], date: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString(), deadlineDate: new Date(new Date().setDate(new Date().getDate() + 21)).toISOString(), location: 'Kediaman Mempelai, Yogyakarta', progress: 10, status: 'Dikonfirmasi', totalCost: 5000000, amountPaid: 2500000, paymentStatus: PaymentStatus.DP_TERBAYAR, team: [{memberId: TEAM_1_ID, name: 'Andi Pratama', role: 'Fotografer', fee: 1000000}], dpProofUrl: MOCK_DP_PROOF_BASE64, image: 'https://images.unsplash.com/photo-1618231622393-277e9startup/photo-1593181431272-747c32742518?q=80&w=300', bookingStatus: BookingStatus.TERKONFIRMASI },
        { id: PROJ_5_ID, projectName: 'Akad Nikah Farhan & Aisyah', clientId: CLIENT_5_ID, clientName: 'Farhan & Aisyah', projectType: 'Pernikahan', packageId: PKG_1_ID, packageName: 'Paket Pernikahan Silver', addOns: [{ id: ADDON_3_ID, name: 'Jasa MUA Profesional', price: 1000000 }], date: new Date(new Date().setDate(new Date().getDate() - 20)).toISOString(), deadlineDate: new Date(new Date().setDate(new Date().getDate() + 10)).toISOString(), location: 'Masjid Istiqlal, Jakarta', progress: 75, status: 'Revisi', activeSubStatuses: [], totalCost: 13000000, amountPaid: 13000000, paymentStatus: PaymentStatus.LUNAS, team: [{ memberId: TEAM_1_ID, name: 'Andi Pratama', role: 'Fotografer', fee: 1500000 }, { memberId: TEAM_3_ID, name: 'Doni Firmansyah', role: 'Editor', fee: 1000000, reward: 150000 }, { memberId: TEAM_5_ID, name: 'Fira Anjani', role: 'MUA & Asisten', fee: 750000 }], revisions: [{ id: REV_1_ID, date: new Date().toISOString(), adminNotes: 'Tolong perbaiki transisi di menit 2:15 agar lebih mulus. Ganti musik latar dengan opsi kedua yang sudah diberikan.', deadline: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString(), freelancerId: TEAM_3_ID, status: RevisionStatus.PENDING }], bookingStatus: BookingStatus.TERKONFIRMASI, image: 'https://images.unsplash.com/photo-1592214389136-9852075d53b9?q=80&w=300' },
        { id: PROJ_7_ID, projectName: 'Resepsi Agung & Bella (The Senjaya)', clientId: CLIENT_6_ID, clientName: 'Agung & Bella (The Senjaya)', projectType: 'Pernikahan', packageId: PKG_2_ID, packageName: 'Paket Pernikahan Gold', addOns: [{ id: ADDON_1_ID, name: 'Same Day Edit Video', price: 2500000 }, { id: ADDON_3_ID, name: 'Jasa MUA Profesional', price: 1000000 }], date: new Date(new Date().setDate(new Date().getDate() - 45)).toISOString(), deadlineDate: new Date().toISOString(), location: 'The Ritz-Carlton, Bali', progress: 90, status: 'Cetak', activeSubStatuses: ['Proses Cetak'], totalCost: 25650000, amountPaid: 25650000, paymentStatus: PaymentStatus.LUNAS, team: [{ memberId: TEAM_1_ID, name: 'Andi Pratama', role: 'Fotografer', fee: 1500000, reward: 300000 }, { memberId: TEAM_2_ID, name: 'Citra Lestari', role: 'Videografer', fee: 2000000, reward: 300000 }, { memberId: TEAM_3_ID, name: 'Doni Firmansyah', role: 'Editor', fee: 1000000, subJob: 'Same Day Edit' }, { memberId: TEAM_5_ID, name: 'Fira Anjani', role: 'MUA & Asisten', fee: 750000 }], promoCodeId: PROMO_1_ID, discountAmount: 2850000, printingDetails: [{ id: 'PRINT001', type: 'Cetak Album', customName: 'Album Premium 25x30', details: '30 Halaman, Hard Cover Linen', cost: 1500000 }], printingCost: 1500000, transportCost: 3500000, bookingStatus: BookingStatus.TERKONFIRMASI, image: 'https://images.unsplash.com/photo-1511285560921-4c92ada47494?q=80&w=300' },
        { id: PROJ_8_ID, projectName: 'Lamaran Rina & Doni', clientId: CLIENT_7_ID, clientName: 'Rina & Doni', projectType: 'Lamaran', packageId: PKG_4_ID, packageName: 'Paket Lamaran', addOns: [], date: new Date(new Date().setDate(new Date().getDate() + 20)).toISOString(), deadlineDate: new Date(new Date().setDate(new Date().getDate() + 34)).toISOString(), location: 'Kediaman Mempelai, Surabaya', progress: 0, status: 'Persiapan', totalCost: 5000000, amountPaid: 0, paymentStatus: PaymentStatus.BELUM_BAYAR, team: [], bookingStatus: BookingStatus.BARU },
        { id: PROJ_9_ID, projectName: 'Product Shoot CV Maju Jaya', clientId: CLIENT_8_ID, clientName: 'CV Maju Jaya', projectType: 'Produk', packageId: PKG_3_ID, packageName: 'Paket Acara Korporat', addOns: [], date: new Date(new Date().setDate(new Date().getDate() - 80)).toISOString(), deadlineDate: new Date(new Date().setDate(new Date().getDate() - 70)).toISOString(), location: 'Studio Vena Pictures', progress: 100, status: 'Selesai', totalCost: 7500000, amountPaid: 7500000, paymentStatus: PaymentStatus.LUNAS, team: [{ memberId: TEAM_1_ID, name: 'Andi Pratama', role: 'Fotografer', fee: 1200000 }], bookingStatus: BookingStatus.TERKONFIRMASI },
        { id: PROJ_10_ID, projectName: 'Prewedding Kevin & Laura', clientId: CLIENT_9_ID, clientName: 'Kevin & Laura', projectType: 'Prewedding', packageId: PKG_5_ID, packageName: 'Paket Prewedding', addOns: [{ id: ADDON_2_ID, name: 'Aerial Drone Shot', price: 1500000 }], date: new Date(new Date().setDate(new Date().getDate() - 50)).toISOString(), deadlineDate: new Date(new Date().setDate(new Date().getDate() - 29)).toISOString(), location: 'Bromo, Jawa Timur', progress: 100, status: 'Dibatalkan', totalCost: 8000000, amountPaid: 4000000, paymentStatus: PaymentStatus.DP_TERBAYAR, team: [], bookingStatus: BookingStatus.TERKONFIRMASI, rejectionReason: 'Klien membatalkan karena alasan pribadi, DP tidak dikembalikan sesuai kontrak.' },
        { id: PROJ_11_ID, projectName: 'Resepsi Budi & Sinta (Dibatalkan)', clientId: CLIENT_1_ID, clientName: 'Budi & Sinta', projectType: 'Pernikahan', packageId: PKG_2_ID, packageName: 'Paket Pernikahan Gold', addOns: [], date: new Date(new Date().setDate(new Date().getDate() + 90)).toISOString(), deadlineDate: new Date(new Date().setDate(new Date().getDate() + 135)).toISOString(), location: 'Bandung', progress: 0, status: 'Dibatalkan', totalCost: 25000000, amountPaid: 0, paymentStatus: PaymentStatus.BELUM_BAYAR, team: [], bookingStatus: BookingStatus.DITOLAK, rejectionReason: 'Jadwal bentrok dengan proyek lain.' },
        { id: PROJ_12_ID, projectName: 'Maternity Shoot Budi & Sinta', clientId: CLIENT_1_ID, clientName: 'Budi & Sinta', projectType: 'Keluarga', packageId: PKG_6_ID, packageName: 'Sesi Foto Keluarga', addOns: [], date: new Date(new Date().setDate(new Date().getDate() + 45)).toISOString(), deadlineDate: new Date(new Date().setDate(new Date().getDate() + 55)).toISOString(), location: 'Studio Vena Pictures', progress: 5, status: 'Persiapan', totalCost: 3500000, amountPaid: 0, paymentStatus: PaymentStatus.BELUM_BAYAR, team: [], bookingStatus: BookingStatus.TERKONFIRMASI },
    ],
    transactions: [
        // Capital Injections for balance consistency
        { id: 'TRN-INIT-W-BANK', date: new Date(new Date().setDate(new Date().getDate() - 90)).toISOString(), description: 'Modal Awal WBank', amount: 31850000, type: TransactionType.INCOME, category: 'Modal', method: 'Transfer Bank', cardId: 'CARD001' },
        { id: 'TRN-INIT-CASH', date: new Date(new Date().setDate(new Date().getDate() - 90)).toISOString(), description: 'Modal Awal Kas Tunai', amount: 14000000, type: TransactionType.INCOME, category: 'Modal', method: 'Tunai', cardId: 'CARD_CASH' },
        
        // Income
        { id: 'TRN001', date: new Date(new Date().setDate(new Date().getDate() - 35)).toISOString(), description: 'DP Proyek Pernikahan Budi & Sinta', amount: 6750000, type: TransactionType.INCOME, projectId: PROJ_1_ID, category: 'DP Proyek', method: 'Transfer Bank', cardId: 'CARD001' },
        { id: 'TRN001B', date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(), description: 'Pelunasan Proyek Pernikahan Budi & Sinta', amount: 6750000, type: TransactionType.INCOME, projectId: PROJ_1_ID, category: 'Pelunasan Proyek', method: 'Transfer Bank', cardId: 'CARD001' },
        { id: 'TRN003', date: new Date(new Date().setDate(new Date().getDate() - 61)).toISOString(), description: 'Pelunasan Gathering PT SA', amount: 8000000, type: TransactionType.INCOME, projectId: PROJ_2_ID, category: 'Pelunasan Proyek', method: 'Transfer Bank', cardId: 'CARD001' },
        { id: 'TRN004', date: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(), description: 'DP Proyek Lamaran Dewi & Rian', amount: 2500000, type: TransactionType.INCOME, projectId: PROJ_4_ID, category: 'DP Proyek', method: 'Transfer Bank', cardId: 'CARD001' },
        { id: 'TRN005', date: new Date(new Date().setDate(new Date().getDate() - 18)).toISOString(), description: 'Pelunasan Akad Nikah Farhan & Aisyah', amount: 6500000, type: TransactionType.INCOME, projectId: PROJ_5_ID, category: 'Pelunasan Proyek', method: 'Transfer Bank', cardId: 'CARD001' },
        { id: 'TRN022', date: new Date(new Date().setDate(new Date().getDate() - 20)).toISOString(), description: 'DP Akad Nikah Farhan & Aisyah', amount: 6500000, type: TransactionType.INCOME, projectId: PROJ_5_ID, category: 'DP Proyek', method: 'Transfer Bank', cardId: 'CARD001' },
        { id: 'TRN023', date: new Date(new Date().setDate(new Date().getDate() - 50)).toISOString(), description: 'DP Resepsi Agung & Bella', amount: 12825000, type: TransactionType.INCOME, projectId: PROJ_7_ID, category: 'DP Proyek', method: 'Transfer Bank', cardId: 'CARD001' },
        { id: 'TRN024', date: new Date(new Date().setDate(new Date().getDate() - 48)).toISOString(), description: 'Pelunasan Resepsi Agung & Bella', amount: 12825000, type: TransactionType.INCOME, projectId: PROJ_7_ID, category: 'Pelunasan Proyek', method: 'Transfer Bank', cardId: 'CARD001' },
        { id: 'TRN025', date: new Date(new Date().setDate(new Date().getDate() - 85)).toISOString(), description: 'Pelunasan Product Shoot CV Maju Jaya', amount: 7500000, type: TransactionType.INCOME, projectId: PROJ_9_ID, category: 'Pelunasan Proyek', method: 'Transfer Bank', cardId: 'CARD001' },
        { id: 'TRN026', date: new Date(new Date().setDate(new Date().getDate() - 55)).toISOString(), description: 'DP Prewedding Kevin & Laura', amount: 4000000, type: TransactionType.INCOME, projectId: PROJ_10_ID, category: 'DP Proyek', method: 'Transfer Bank', cardId: 'CARD001' },

        // Expenses
        { id: 'TRN002', date: new Date(new Date().setDate(new Date().getDate() - 35)).toISOString(), description: 'Pembelian Lensa Kamera Sony GM 50mm f1.2', amount: 28000000, type: TransactionType.EXPENSE, category: 'Peralatan', method: 'Kartu', cardId: 'CARD002' },
        { id: 'TRN006', date: new Date(new Date().setDate(new Date().getDate() - 61)).toISOString(), description: 'Pembayaran Fee Freelancer - Acara PT SA', amount: 3500000, type: TransactionType.EXPENSE, projectId: PROJ_2_ID, category: 'Gaji Freelancer', method: 'Sistem', cardId: 'CARD001' },
        { id: 'TRN007', date: new Date(new Date().setDate(new Date().getDate() - 47)).toISOString(), description: 'Biaya Transportasi - Proyek Agung & Bella', amount: 3500000, type: TransactionType.EXPENSE, projectId: PROJ_7_ID, category: 'Transportasi', method: 'Sistem', cardId: 'CARD001' },
        { id: 'TRN008', date: new Date(new Date().setDate(new Date().getDate() - 46)).toISOString(), description: 'Biaya Cetak Album - Proyek Agung & Bella', amount: 1500000, type: TransactionType.EXPENSE, projectId: PROJ_7_ID, category: 'Cetak Album', method: 'Sistem', cardId: 'CARD001', printingItemId: 'PRINT001' },
        { id: 'TRN009', date: new Date(new Date().setDate(new Date().getDate() - 19)).toISOString(), description: 'Biaya Konsumsi Tim - Proyek Farhan & Aisyah', amount: 300000, type: TransactionType.EXPENSE, projectId: PROJ_5_ID, category: 'Konsumsi', method: 'Tunai', cardId: 'CARD_CASH' },
        { id: 'TRN010', date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(), description: 'Langganan Adobe Creative Cloud', amount: 850000, type: TransactionType.EXPENSE, category: 'Operasional Kantor', method: 'Kartu', cardId: 'CARD002' },
        { id: 'TRN011', date: new Date(new Date().setDate(new Date().getDate() - 46)).toISOString(), description: 'Biaya Fee Freelancer - Proyek Agung & Bella', amount: 5250000, type: TransactionType.EXPENSE, projectId: PROJ_7_ID, category: 'Gaji Freelancer', method: 'Sistem', cardId: 'CARD001' },
        { id: 'TRN012', date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), description: 'Biaya Fee Freelancer - Proyek Budi & Sinta', amount: 5700000, type: TransactionType.EXPENSE, projectId: PROJ_1_ID, category: 'Gaji Freelancer', method: 'Sistem', cardId: 'CARD001' },
    ],
    cards: [
        { id: 'CARD_CASH', cardHolderName: 'Kas Perusahaan', bankName: 'Tunai', cardType: CardType.TUNAI, lastFourDigits: 'CASH', balance: 13700000, colorGradient: 'from-slate-100 to-slate-300' },
        { id: 'CARD001', cardHolderName: 'Vena Pictures', bankName: 'WBank', cardType: CardType.DEBIT, lastFourDigits: '3090', expiryDate: '12/26', balance: 86550000, colorGradient: 'from-blue-500 to-sky-400' },
        { id: 'CARD002', cardHolderName: 'Vena Pictures', bankName: 'VISA', cardType: CardType.KREDIT, lastFourDigits: '8872', expiryDate: '08/25', balance: -28850000, colorGradient: 'from-gray-700 to-gray-900' },
    ],
    pockets: [
        { id: 'POCKET001', name: `Anggaran Operasional ${new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`, description: 'Dana untuk pengeluaran bulanan.', icon: 'clipboard-list', type: PocketType.EXPENSE, amount: 2000000, goalAmount: 10000000 },
        { id: 'POCKET002', name: 'Tabungan Alat Baru', description: 'Menabung untuk upgrade kamera & drone.', icon: 'piggy-bank', type: PocketType.SAVING, amount: 12000000, goalAmount: 50000000 },
        { id: 'POCKET003', name: 'Dana Darurat Terkunci', description: 'Dana yang terkunci hingga akhir tahun.', icon: 'lock', type: PocketType.LOCKED, amount: 20000000, lockEndDate: `${new Date().getFullYear()}-12-31` },
        { id: 'POCKET004', name: 'Tabungan Hadiah Freelancer', description: 'Total akumulasi hadiah untuk semua freelancer.', icon: 'star', type: PocketType.REWARD_POOL, amount: 1850000 }
    ],
    leads: [
        { id: 'LEAD001', name: 'Calon Klien - Erika', contactChannel: ContactChannel.INSTAGRAM, location: 'Surabaya', status: LeadStatus.DISCUSSION, date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), notes: 'Menanyakan paket prewedding untuk bulan Desember.' },
        { id: 'LEAD007', name: 'Calon Klien - VVIP Wedding', contactChannel: ContactChannel.REFERRAL, location: 'Jakarta', status: LeadStatus.DISCUSSION, date: new Date().toISOString(), notes: 'Referensi dari Agung & Bella. Butuh paket paling premium untuk pernikahan internasional.' },
        { id: 'LEAD002', name: 'Bapak Hendra (Korporat)', contactChannel: ContactChannel.WEBSITE, location: 'Jakarta', status: LeadStatus.FOLLOW_UP, date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(), notes: 'Butuh penawaran resmi untuk acara ulang tahun perusahaan.' },
        { id: 'LEAD003', name: 'Dewi & Rian', contactChannel: ContactChannel.WEBSITE, location: 'Yogyakarta', status: LeadStatus.CONVERTED, date: new Date(new Date().setDate(new Date().getDate() - 11)).toISOString(), notes: `Dikonversi secara otomatis dari formulir pemesanan publik. Proyek: Lamaran Dewi & Rian. Klien ID: ${CLIENT_4_ID}` },
        { id: 'LEAD004', name: 'Rina & Doni', contactChannel: ContactChannel.INSTAGRAM, location: 'Depok', status: LeadStatus.CONVERTED, date: new Date(new Date().setDate(new Date().getDate() - 4)).toISOString(), notes: `Dikonversi secara otomatis dari formulir pemesanan publik. Proyek: Lamaran Rina & Doni. Klien ID: ${CLIENT_7_ID}` },
        { id: 'LEAD005', name: 'Kevin & Laura', contactChannel: ContactChannel.REFERRAL, location: 'Bromo', status: LeadStatus.CONVERTED, date: new Date(new Date().setDate(new Date().getDate() - 56)).toISOString(), notes: `Dikonversi. Proyek: Prewedding Kevin & Laura. Klien ID: ${CLIENT_9_ID}` },
        { id: 'LEAD006', name: 'Sarah (Wedding Planner)', contactChannel: ContactChannel.PHONE, location: 'Bali', status: LeadStatus.REJECTED, date: new Date(new Date().setDate(new Date().getDate() - 15)).toISOString(), notes: 'Sudah dapat vendor lain yang lebih murah.' },
    ],
    notifications: [
        { id: 'NOTIF004', title: 'Booking Baru Diterima!', message: 'Booking dari Rina & Doni untuk proyek Lamaran telah masuk.', timestamp: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(), isRead: false, icon: 'lead', link: { view: ViewType.BOOKING } },
        { id: 'NOTIF005', title: 'Tugas Revisi Baru', message: 'Anda memiliki tugas revisi baru untuk proyek "Akad Nikah Farhan & Aisyah".', timestamp: new Date().toISOString(), isRead: false, icon: 'revision', link: { view: ViewType.PROJECTS, action: { type: 'VIEW_PROJECT_DETAILS', id: PROJ_5_ID } } },
        { id: 'NOTIF006', title: 'Umpan Balik Klien Baru', message: 'Agung & Bella telah memberikan umpan balik untuk proyek mereka.', timestamp: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), isRead: true, icon: 'feedback', link: { view: ViewType.CLIENT_REPORTS } },
        { id: 'NOTIF001', title: 'Prospek Baru Masuk', message: 'Anda memiliki prospek baru dari Referral: Calon Klien - VVIP Wedding.', timestamp: new Date().toISOString(), isRead: false, icon: 'lead', link: { view: ViewType.PROSPEK } },
        { id: 'NOTIF002', title: 'Deadline Mendekat', message: 'Proyek "Akad Nikah Farhan & Aisyah" memiliki deadline dalam 10 hari.', timestamp: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), isRead: true, icon: 'deadline', link: { view: ViewType.PROJECTS, action: { type: 'VIEW_PROJECT_DETAILS', id: PROJ_5_ID } } },
        { id: 'NOTIF003', title: 'Pembayaran DP Diterima', message: 'Pembayaran DP untuk proyek "Lamaran Dewi & Rian" telah dikonfirmasi.', timestamp: new Date(new Date().setDate(new Date().getDate() - 9)).toISOString(), isRead: true, icon: 'payment', link: { view: ViewType.CLIENTS, action: { type: 'VIEW_CLIENT_DETAILS', id: CLIENT_4_ID } } },
        { id: 'NOTIF007', title: 'Proyek Dibatalkan', message: 'Proyek "Prewedding Kevin & Laura" telah dibatalkan oleh klien.', timestamp: new Date(new Date().setDate(new Date().getDate() - 40)).toISOString(), isRead: true, icon: 'deadline', link: { view: ViewType.PROJECTS, action: { type: 'VIEW_PROJECT_DETAILS', id: PROJ_10_ID } } },
    ],
    sops: [
        { id: 'SOP001', title: 'Alur Kerja Fotografi Pernikahan', category: 'Pernikahan', content: '1. Briefing H-7...\n2. Persiapan alat H-1...\n3. Pelaksanaan hari-H...\n4. Backup data setelah acara...\n5. Proses seleksi dan editing...', lastUpdated: new Date().toISOString() },
        { id: 'SOP002', title: 'Protokol Acara Korporat', category: 'Korporat', content: '1. Koordinasi dengan Event Organizer.\n2. Dokumentasi panggung utama dan suasana.\n3. Wawancara singkat dengan manajemen (jika ada).', lastUpdated: '2023-03-15T10:00:00Z' },
        { id: 'SOP003', title: 'Checklist Alat Prewedding Outdoor', category: 'Prewedding', content: 'Kamera Utama (2), Lensa (Wide, Tele, Prime), Baterai (8), Memory Card (4), Drone, Reflektor, Tripod, Kain pembersih.', lastUpdated: '2023-04-01T10:00:00Z' },
    ],
    promoCodes: [
        { id: PROMO_1_ID, code: 'VENA10', discountType: 'percentage', discountValue: 10, isActive: true, usageCount: 1, maxUsage: 50, createdAt: '2023-09-01T10:00:00Z' },
        { id: PROMO_2_ID, code: 'DISKON500K', discountType: 'fixed', discountValue: 500000, isActive: false, usageCount: 20, maxUsage: 20, expiryDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(), createdAt: '2023-08-01T10:00:00Z' },
    ],
    socialMediaPosts: [
        { id: 'SMP001', projectId: PROJ_2_ID, clientName: 'PT Sejahtera Abadi', postType: PostType.INSTAGRAM_FEED, platform: 'Instagram', scheduledDate: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString(), caption: 'Throwback to the amazing annual gathering of PT Sejahtera Abadi! #VenaCorporate #EventDocumentation', status: PostStatus.SCHEDULED },
        { id: 'SMP002', projectId: PROJ_1_ID, clientName: 'Budi & Sinta', postType: PostType.INSTAGRAM_STORY, platform: 'Instagram', scheduledDate: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(), caption: "Another beautiful moment captured from Budi & Sinta's wedding. ✨ #VenaWedding #WeddingInspiration", status: PostStatus.DRAFT },
        { id: 'SMP003', projectId: PROJ_7_ID, clientName: 'Agung & Bella (The Senjaya)', postType: PostType.INSTAGRAM_REELS, platform: 'Instagram', scheduledDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(), caption: "The magical reception of Agung & Bella. What a night to remember! 💍 #BaliWedding #LuxuryWedding #VenaPictures", status: PostStatus.POSTED },
        { id: 'SMP004', projectId: PROJ_9_ID, clientName: 'CV Maju Jaya', postType: PostType.BLOG, platform: 'Website', scheduledDate: new Date(new Date().setDate(new Date().getDate() - 75)).toISOString(), caption: 'Studi Kasus: Meningkatkan Penjualan dengan Fotografi Produk Profesional', status: PostStatus.POSTED },
        { id: 'SMP005', projectId: PROJ_5_ID, clientName: 'Farhan & Aisyah', postType: PostType.TIKTOK, platform: 'TikTok', scheduledDate: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(), caption: 'Behind the scenes from Farhan & Aisyah wedding!', status: PostStatus.CANCELED, notes: 'Klien meminta untuk tidak diposting.' },
    ],
    assets: [
        { id: 'ASSET001', name: 'Kamera Sony A7 IV', category: 'Kamera', purchaseDate: '2023-01-10', purchasePrice: 35000000, status: AssetStatus.AVAILABLE, serialNumber: 'SN-A74-001' },
        { id: 'ASSET002', name: 'Lensa Sony GM 24-70mm f2.8', category: 'Lensa', purchaseDate: '2023-01-10', purchasePrice: 25000000, status: AssetStatus.IN_USE, notes: 'Digunakan untuk proyek Budi & Sinta' },
        { id: 'ASSET003', name: 'Drone DJI Mavic 3 Pro', category: 'Drone', purchaseDate: '2023-06-15', purchasePrice: 32000000, status: AssetStatus.MAINTENANCE, notes: 'Perbaikan gimbal setelah hard landing.' },
        { id: 'ASSET004', name: 'MacBook Pro M2 Max', category: 'Komputer', purchaseDate: '2023-03-20', purchasePrice: 45000000, status: AssetStatus.IN_USE, notes: 'Digunakan oleh Doni F. untuk editing' },
        { id: 'ASSET005', name: 'Godox AD600 Pro', category: 'Lighting', purchaseDate: '2022-11-01', purchasePrice: 12000000, status: AssetStatus.AVAILABLE, serialNumber: 'SN-AD600-012' },
    ],
    clientFeedback: [
        { id: 'FB001', clientName: 'PT Sejahtera Abadi', satisfaction: SatisfactionLevel.VERY_SATISFIED, rating: 5, feedback: 'Tim sangat profesional dan hasilnya melebihi ekspektasi! Video dokumentasinya sangat bagus.', date: new Date(new Date().setDate(new Date().getDate() - 55)).toISOString() },
        { id: 'FB002', clientName: 'Agung & Bella (The Senjaya)', satisfaction: SatisfactionLevel.VERY_SATISFIED, rating: 5, feedback: 'Hasilnya luar biasa! Tim sangat kooperatif dan profesional. Terima kasih sudah membuat hari kami lebih spesial.', date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString() },
        { id: 'FB003', clientName: 'Farhan & Aisyah', satisfaction: SatisfactionLevel.SATISFIED, rating: 4, feedback: 'Secara keseluruhan bagus, hanya saja ada sedikit keterlambatan di awal proses editing. Tapi hasilnya memuaskan.', date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString() },
    ],
    contracts: [
        { id: CONTRACT_1_ID, contractNumber: `VP/CTR/${new Date().getFullYear()}/001`, clientId: CLIENT_1_ID, projectId: PROJ_1_ID, signingDate: new Date(new Date().setDate(new Date().getDate() - 24)).toISOString(), signingLocation: 'Bandung', createdAt: new Date(new Date().setDate(new Date().getDate() - 25)).toISOString(), clientName1: 'Budi Santoso', clientAddress1: 'Jl. Mawar No. 1, Bandung', clientPhone1: '081234567890', clientName2: 'Sinta Melati', clientAddress2: 'Jl. Mawar No. 1, Bandung', clientPhone2: '081234567890', shootingDuration: '8 Jam (Akad & Resepsi)', guaranteedPhotos: '300 Foto Edit', albumDetails: '1 Album Cetak Eksklusif 20x30cm 20 Halaman', digitalFilesFormat: 'JPG High-Resolution', otherItems: '1 Video Highlight (3-5 menit), Aerial Drone Shot', personnelCount: '2 Fotografer, 1 Videografer, 1 Pilot Drone', deliveryTimeframe: '30 hari kerja', dpDate: new Date(new Date().setDate(new Date().getDate() - 25)).toISOString(), finalPaymentDate: new Date(new Date().setDate(new Date().getDate() + 23)).toISOString(), cancellationPolicy: 'DP yang sudah dibayarkan tidak dapat dikembalikan.', jurisdiction: 'Bandung', vendorSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' },
        { id: CONTRACT_2_ID, contractNumber: `VP/CTR/${new Date().getFullYear()}/002`, clientId: CLIENT_6_ID, projectId: PROJ_7_ID, signingDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), signingLocation: 'Jakarta', createdAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), clientName1: 'Agung Senjaya', clientAddress1: 'Senjaya Residence, Jakarta Selatan', clientPhone1: '081333444555', clientName2: 'Bella Putri', clientAddress2: 'Senjaya Residence, Jakarta Selatan', clientPhone2: '081333444555', shootingDuration: '10 Jam (Full Day)', guaranteedPhotos: '500+ Foto Edit', albumDetails: '1 Album Cetak Premium 25x30cm 30 Halaman, 2 Album Mini untuk Orang Tua', digitalFilesFormat: 'JPG High-Resolution & RAW (by request)', otherItems: '1 Video Sinematik (5-7 menit), Same Day Edit Video, Jasa MUA', personnelCount: '2 Fotografer, 2 Videografer, 1 Asisten, 1 MUA', deliveryTimeframe: '45 hari kerja', dpDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), finalPaymentDate: new Date(new Date().setDate(new Date().getDate() + 46)).toISOString(), cancellationPolicy: 'DP yang sudah dibayarkan tidak dapat dikembalikan. Pembatalan H-30 dikenakan biaya 50% dari total kontrak.', jurisdiction: 'Denpasar', vendorSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', clientSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e9LgAAAABJRU5ErkJggg==' },
        { id: CONTRACT_3_ID, contractNumber: `VP/CTR/${new Date().getFullYear()}/003`, clientId: CLIENT_5_ID, projectId: PROJ_5_ID, signingDate: new Date(new Date().setDate(new Date().getDate() - 19)).toISOString(), signingLocation: 'Jakarta', createdAt: new Date(new Date().setDate(new Date().getDate() - 20)).toISOString(), clientName1: 'Farhan', clientAddress1: 'Jl. Merdeka 10, Jakarta', clientPhone1: '085712345678', clientName2: 'Aisyah', clientAddress2: 'Jl. Merdeka 10, Jakarta', clientPhone2: '085712345678', shootingDuration: '6 Jam (Akad)', guaranteedPhotos: '250 Foto Edit', albumDetails: '1 Album Cetak Eksklusif 20x30cm 20 Halaman', digitalFilesFormat: 'JPG High-Resolution', otherItems: '1 Video Highlight (3-5 menit), Jasa MUA Profesional', personnelCount: '1 Fotografer, 1 Asisten, 1 MUA', deliveryTimeframe: '30 hari kerja', dpDate: new Date(new Date().setDate(new Date().getDate() - 20)).toISOString(), finalPaymentDate: new Date(new Date().setDate(new Date().getDate() - 15)).toISOString(), cancellationPolicy: 'DP yang sudah dibayarkan tidak dapat dikembalikan.', jurisdiction: 'Jakarta', vendorSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' },
    ],
    teamProjectPayments: [
        { id: 'TPP001', projectId: PROJ_2_ID, teamMemberName: 'Andi Pratama', teamMemberId: TEAM_1_ID, date: new Date(new Date().setDate(new Date().getDate() - 60)).toISOString(), status: 'Paid', fee: 1500000, reward: 250000 },
        { id: 'TPP002', projectId: PROJ_2_ID, teamMemberName: 'Citra Lestari', teamMemberId: TEAM_2_ID, date: new Date(new Date().setDate(new Date().getDate() - 60)).toISOString(), status: 'Paid', fee: 2000000, reward: 250000 },
        { id: 'TPP003', projectId: PROJ_1_ID, teamMemberName: 'Andi Pratama', teamMemberId: TEAM_1_ID, date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(), status: 'Paid', fee: 1500000 },
        { id: 'TPP004', projectId: PROJ_1_ID, teamMemberName: 'Citra Lestari', teamMemberId: TEAM_2_ID, date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(), status: 'Paid', fee: 2000000 },
        { id: 'TPP005', projectId: PROJ_1_ID, teamMemberName: 'Doni Firmansyah', teamMemberId: TEAM_3_ID, date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(), status: 'Paid', fee: 1000000 },
        { id: 'TPP006', projectId: PROJ_7_ID, teamMemberName: 'Andi Pratama', teamMemberId: TEAM_1_ID, date: new Date(new Date().setDate(new Date().getDate() - 45)).toISOString(), status: 'Paid', fee: 1500000, reward: 300000 },
        { id: 'TPP007', projectId: PROJ_7_ID, teamMemberName: 'Citra Lestari', teamMemberId: TEAM_2_ID, date: new Date(new Date().setDate(new Date().getDate() - 45)).toISOString(), status: 'Paid', fee: 2000000, reward: 300000 },
        { id: 'TPP008', projectId: PROJ_5_ID, teamMemberName: 'Andi Pratama', teamMemberId: TEAM_1_ID, date: new Date(new Date().setDate(new Date().getDate() - 15)).toISOString(), status: 'Paid', fee: 1500000 },
        { id: 'TPP009', projectId: PROJ_5_ID, teamMemberName: 'Doni Firmansyah', teamMemberId: TEAM_3_ID, date: new Date(new Date().setDate(new Date().getDate() - 15)).toISOString(), status: 'Paid', fee: 1000000, reward: 150000 },
        { id: 'TPP010', projectId: PROJ_7_ID, teamMemberName: 'Doni Firmansyah', teamMemberId: TEAM_3_ID, date: new Date(new Date().setDate(new Date().getDate() - 45)).toISOString(), status: 'Paid', fee: 1000000 },
        { id: 'TPP011', projectId: PROJ_7_ID, teamMemberName: 'Fira Anjani', teamMemberId: TEAM_5_ID, date: new Date(new Date().setDate(new Date().getDate() - 45)).toISOString(), status: 'Paid', fee: 750000 },
        { id: 'TPP012', projectId: PROJ_9_ID, teamMemberName: 'Andi Pratama', teamMemberId: TEAM_1_ID, date: new Date(new Date().setDate(new Date().getDate() - 80)).toISOString(), status: 'Paid', fee: 1200000 },
        { id: 'TPP013', projectId: PROJ_4_ID, teamMemberName: 'Andi Pratama', teamMemberId: TEAM_1_ID, date: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString(), status: 'Unpaid', fee: 1000000 },
        { id: 'TPP014', projectId: PROJ_1_ID, teamMemberName: 'Eka Wijaya', teamMemberId: TEAM_6_ID, date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(), status: 'Paid', fee: 1200000 },
    ],
    teamPaymentRecords: [
        { id: 'TPR001', recordNumber: 'PAY-FR-001', teamMemberId: TEAM_1_ID, date: new Date(new Date().setDate(new Date().getDate() - 50)).toISOString(), projectPaymentIds: ['TPP001', 'TPP008', 'TPP012'], totalAmount: 4200000, vendorSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' },
        { id: 'TPR002', recordNumber: 'PAY-FR-002', teamMemberId: TEAM_2_ID, date: new Date(new Date().setDate(new Date().getDate() - 50)).toISOString(), projectPaymentIds: ['TPP002'], totalAmount: 2000000, vendorSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' },
        { id: 'TPR003', recordNumber: 'PAY-FR-003', teamMemberId: TEAM_3_ID, date: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(), projectPaymentIds: ['TPP009'], totalAmount: 1000000 },
        { id: 'TPR004', recordNumber: 'PAY-FR-004', teamMemberId: TEAM_1_ID, date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), projectPaymentIds: ['TPP003'], totalAmount: 1500000 },
        { id: 'TPR005', recordNumber: 'PAY-FR-005', teamMemberId: TEAM_2_ID, date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), projectPaymentIds: ['TPP004'], totalAmount: 2000000 },
        { id: 'TPR006', recordNumber: 'PAY-FR-006', teamMemberId: TEAM_3_ID, date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), projectPaymentIds: ['TPP005'], totalAmount: 1000000 },
        { id: 'TPR007', recordNumber: 'PAY-FR-007', teamMemberId: TEAM_6_ID, date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), projectPaymentIds: ['TPP014'], totalAmount: 1200000 },
        { id: 'TPR008', recordNumber: 'PAY-FR-008', teamMemberId: TEAM_1_ID, date: new Date(new Date().setDate(new Date().getDate() - 40)).toISOString(), projectPaymentIds: ['TPP006'], totalAmount: 1500000 },
        { id: 'TPR009', recordNumber: 'PAY-FR-009', teamMemberId: TEAM_2_ID, date: new Date(new Date().setDate(new Date().getDate() - 40)).toISOString(), projectPaymentIds: ['TPP007'], totalAmount: 2000000 },
        { id: 'TPR010', recordNumber: 'PAY-FR-010', teamMemberId: TEAM_3_ID, date: new Date(new Date().setDate(new Date().getDate() - 40)).toISOString(), projectPaymentIds: ['TPP010'], totalAmount: 1000000 },
        { id: 'TPR011', recordNumber: 'PAY-FR-011', teamMemberId: TEAM_5_ID, date: new Date(new Date().setDate(new Date().getDate() - 40)).toISOString(), projectPaymentIds: ['TPP011'], totalAmount: 750000 },
    ],
    rewardLedgerEntries: [
        { id: 'RLE001', teamMemberId: TEAM_2_ID, date: new Date(new Date().setDate(new Date().getDate() - 50)).toISOString(), description: 'Bonus Kinerja - Proyek PT SA', amount: 250000, projectId: PROJ_2_ID },
        { id: 'RLE002', teamMemberId: TEAM_1_ID, date: new Date(new Date().setDate(new Date().getDate() - 50)).toISOString(), description: 'Bonus Kinerja - Proyek PT SA', amount: 250000, projectId: PROJ_2_ID },
        { id: 'RLE003', teamMemberId: TEAM_3_ID, date: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(), description: 'Bonus Revisi Cepat - Proyek Farhan & Aisyah', amount: 150000, projectId: PROJ_5_ID },
        { id: 'RLE004', teamMemberId: TEAM_1_ID, date: new Date(new Date().setDate(new Date().getDate() - 40)).toISOString(), description: 'Bonus Kinerja - Proyek Agung & Bella', amount: 300000, projectId: PROJ_7_ID },
        { id: 'RLE005', teamMemberId: TEAM_2_ID, date: new Date(new Date().setDate(new Date().getDate() - 40)).toISOString(), description: 'Bonus Kinerja - Proyek Agung & Bella', amount: 300000, projectId: PROJ_7_ID },
    ],
};


export const DEFAULT_USER_PROFILE: VendorData['profile'] = {
    id: '',
    adminUserId: '',
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    website: '',
    address: '',
    bankAccount: '',
    authorizedSigner: '',
    idNumber: '',
    bio: '',
    incomeCategories: ['Pembayaran Proyek', 'Penjualan Produk', 'Lainnya'],
    expenseCategories: ['Biaya Tim', 'Biaya Produksi', 'Pemasaran', 'Operasional', 'Peralatan', 'Lainnya'],
    projectTypes: ['Acara Pribadi', 'Acara Perusahaan', 'Sesi Foto Personal', 'Produk & Komersial'],
    eventTypes: ['Rapat Internal', 'Survei Lokasi', 'Acara Tim', 'Lainnya'],
    assetCategories: ['Kamera', 'Lensa', 'Pencahayaan', 'Komputer & Software', 'Aksesoris Lain'],
    sopCategories: ['Pra-Produksi', 'Produksi', 'Pasca-Produksi', 'Umum'],
    packageCategories: ['Pernikahan', 'Lamaran', 'Acara Pribadi', 'Acara Perusahaan', 'Sesi Foto Personal', 'Produk & Komersial'],
    projectStatusConfig: MOCK_USER_PROFILE.projectStatusConfig,
    notificationSettings: { newProject: true, paymentConfirmation: true, deadlineReminder: true },
    securitySettings: { twoFactorEnabled: false },
    briefingTemplate: MOCK_USER_PROFILE.briefingTemplate,
    termsAndConditions: '📜 **Syarat & Ketentuan Umum**\n- Harga yang tertera dapat berubah sewaktu-waktu sebelum adanya kesepakatan.\n\n💰 **Pembayaran**\n- Pemesanan dianggap sah setelah pembayaran Uang Muka (DP) sebesar 50% dari total biaya.\n- Pelunasan wajib dilakukan paling lambat 3 (tiga) hari sebelum tanggal acara.\n\n⏱ **Pembatalan & Perubahan Jadwal**\n- Uang Muka (DP) yang telah dibayarkan tidak dapat dikembalikan (non-refundable) jika terjadi pembatalan dari pihak klien.\n- Perubahan jadwal dapat dilakukan maksimal 1 (satu) kali dengan konfirmasi selambat-lambatnya 14 hari sebelum tanggal acara, tergantung ketersediaan tim.\n\n📦 **Hasil Akhir**\n- Waktu pengerjaan hasil akhir (foto & video) adalah sesuai dengan yang tertera pada detail paket, dihitung setelah semua materi dan data dari klien kami terima.\n- Hak cipta hasil foto dan video tetap menjadi milik Vendor. Klien mendapatkan hak guna pribadi dan non-komersial.\n- Vendor berhak menggunakan hasil foto dan video untuk keperluan portofolio dan promosi dengan seizin klien.',
    logoBase64: undefined,
    brandColor: '#3b82f6',
    publicPageConfig: {
      template: 'classic',
      title: 'Galeri & Paket Layanan Kami',
      introduction: 'Jelajahi portofolio kami dan temukan paket yang sempurna untuk acara Anda.',
      galleryImages: [],
    },
    packageShareTemplate: MOCK_USER_PROFILE.packageShareTemplate,
    bookingFormTemplate: MOCK_USER_PROFILE.bookingFormTemplate,
    chatTemplates: CHAT_TEMPLATES,
};