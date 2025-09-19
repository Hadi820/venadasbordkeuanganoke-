

import React from 'react';
import { TeamProjectPayment, Project } from '../types';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

interface FreelancerProjectsProps {
    unpaidProjects: TeamProjectPayment[];
    projectsToPay: string[];
    onToggleProject: (projectPaymentId: string) => void;
    onProceedToPayment: () => void;
    projects: Project[];
}

const FreelancerProjects: React.FC<FreelancerProjectsProps> = ({ unpaidProjects, projectsToPay, onToggleProject, onProceedToPayment, projects }) => {
    if (unpaidProjects.length === 0) {
        return <p className="text-center text-brand-text-secondary py-8">Tidak ada item yang belum dibayar untuk freelancer ini.</p>;
    }

    const totalSelected = unpaidProjects
        .filter(p => projectsToPay.includes(p.id))
        .reduce((sum, p) => sum + p.fee, 0);

    return (
        <div className="overflow-x-auto">
            <p className="text-sm text-brand-text-secondary mb-4">Pilih proyek yang akan dibayarkan. Anda dapat memilih beberapa proyek sekaligus.</p>
            <div className="border border-brand-border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-brand-text-secondary uppercase bg-brand-bg">
                        <tr>
                            <th className="px-4 py-3 w-12 text-center">
                                <input 
                                    type="checkbox" 
                                    checked={projectsToPay.length === unpaidProjects.length && unpaidProjects.length > 0}
                                    onChange={() => {
                                        if (projectsToPay.length === unpaidProjects.length) {
                                            unpaidProjects.forEach(p => onToggleProject(p.id));
                                        } else {
                                            unpaidProjects.filter(p => !projectsToPay.includes(p.id)).forEach(p => onToggleProject(p.id));
                                        }
                                    }}
                                />
                            </th>
                            <th className="px-4 py-3 font-medium tracking-wider">Proyek</th>
                            <th className="px-4 py-3 font-medium tracking-wider">Tanggal</th>
                            <th className="px-4 py-3 font-medium tracking-wider text-right">Fee/Gaji</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                        {unpaidProjects.map(p => {
                            const projectName = projects.find(proj => proj.id === p.projectId)?.projectName || 'Proyek Tidak Ditemukan';
                            const isSelected = projectsToPay.includes(p.id);
                            return (
                                <tr key={p.id} className={`transition-colors cursor-pointer ${isSelected ? 'bg-brand-accent/10' : 'hover:bg-brand-bg'}`} onClick={() => onToggleProject(p.id)}>
                                    <td className="px-4 py-3 text-center">
                                        <input type="checkbox" checked={isSelected} readOnly className="pointer-events-none"/>
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-brand-text-light">{projectName}</td>
                                    <td className="px-4 py-3 text-brand-text-primary">{new Date(p.date).toLocaleDateString('id-ID')}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-brand-text-light">{formatCurrency(p.fee)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {projectsToPay.length > 0 && (
                <div className="mt-4 p-4 bg-brand-bg rounded-lg flex justify-between items-center">
                    <div>
                        <span className="text-sm font-semibold mr-4">{projectsToPay.length} proyek dipilih</span>
                        <span className="text-sm text-brand-text-secondary">Total: <span className="font-bold text-brand-text-light">{formatCurrency(totalSelected)}</span></span>
                    </div>
                    <button type="button" onClick={onProceedToPayment} className="button-primary">
                        Lanjut ke Pembayaran &rarr;
                    </button>
                </div>
            )}
        </div>
    );
};

export default FreelancerProjects;
