import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, children }) => {
  return (
    <div className="mb-6 md:flex md:items-center md:justify-between">
      <div className="flex-1 min-w-0">
        <h2 className="text-2xl md:text-3xl font-bold leading-tight text-gradient sm:truncate">
          {title}
        </h2>
        {subtitle && (
            <p className="mt-2 text-base text-brand-text-secondary">{subtitle}</p>
        )}
      </div>
      {children && <div className="mt-4 flex md:mt-0 md:ml-4">{children}</div>}
    </div>
  );
};

export default PageHeader;