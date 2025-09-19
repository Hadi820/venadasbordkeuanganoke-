import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  change?: string;
  changeType?: 'increase' | 'decrease';
  iconBgColor?: string;
  iconColor?: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
    icon, 
    title, 
    value, 
    change, 
    changeType,
    iconBgColor = 'bg-gray-700/50', 
    iconColor = 'text-brand-text-primary',
    subtitle
}) => {
  
  const changeColor = changeType === 'increase' ? 'text-brand-success' : 'text-brand-danger';

  const TrendingUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
  );

  const TrendingDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
      <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/>
          <polyline points="16 17 22 17 22 11"/>
      </svg>
  );

  return (
    <div className="
      bg-brand-surface 
      p-3 sm:p-4
      rounded-2xl 
      flex items-start
      gap-3 sm:gap-4
      shadow-soft
      border border-brand-border/50 
      hover:shadow-lg 
      hover:shadow-brand-accent/5
      hover:border-brand-border
      hover:-translate-y-0.5
      transition-all duration-300 ease-out
      group
      relative
      overflow-hidden
      h-full
    ">
      <div className="
        absolute inset-0 
        bg-gradient-to-br 
        from-brand-accent/0 
        to-brand-accent/0 
        group-hover:from-brand-accent/5 
        group-hover:to-transparent 
        transition-all duration-300
        pointer-events-none
      " />
      
      <div className={`
        w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12
        rounded-xl
        flex items-center justify-center 
        flex-shrink-0 
        ${iconBgColor} ${iconColor}
        shadow-sm
        group-hover:scale-105
        transition-all duration-300
      `}>
        <div className="
          w-5 h-5 sm:w-6 sm:h-6
        ">
          {icon}
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="
          text-xs sm:text-sm
          text-brand-text-secondary 
          font-medium 
          mb-0.5
          truncate
          leading-tight sm:leading-snug
        ">
          {title}
        </p>
        
        <div className="flex items-baseline gap-x-2 flex-wrap">
          <p className="
            text-lg sm:text-xl lg:text-2xl
            font-bold 
            text-brand-text-light 
            break-words
            group-hover:text-brand-accent
            transition-colors duration-300
            leading-tight
          ">
            {value}
          </p>
          
          {change && (
            <div className={`
              flex items-center 
              text-xs 
              font-semibold 
              ${changeColor}
              gap-1
              bg-white/50
              dark:bg-black/20
              px-2 py-0.5
              rounded-full
              shadow-sm
              flex-shrink-0
            `}>
              {changeType === 'increase' ? (
                <TrendingUpIcon className="w-3 h-3" />
              ) : (
                <TrendingDownIcon className="w-3 h-3" />
              )}
              <span>{change}</span>
            </div>
          )}
        </div>
        
        {subtitle && (
          <p className="
            text-xs 
            text-brand-text-secondary 
            mt-1
            line-clamp-2
            leading-normal
          ">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;