import React from 'react';
import { LucideIcon, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  variant?: 'default' | 'primary' | 'danger';
  locked?: boolean;
}

export const DashboardButton = ({ 
  icon: Icon, 
  label, 
  className, 
  variant = 'default',
  locked = false,
  ...props 
}: DashboardButtonProps) => {
  return (
    <button
      className={cn(
        "group relative flex flex-col items-center justify-center p-6 transition-all duration-300 ease-out",
        "bg-[#eef2f6] rounded-2xl",
        "shadow-3d hover:shadow-3d-hover active:shadow-3d-active",
        "border border-white/20", // Subtle highlight border
        "w-full aspect-square sm:aspect-[4/3]",
        locked && "opacity-80 grayscale-[0.5]",
        className
      )}
      {...props}
    >
      {/* Icon Container - Inset Effect */}
      <div className={cn(
        "mb-4 p-4 rounded-full transition-colors duration-300 relative",
        "shadow-3d-inset",
        variant === 'primary' ? "text-blue-600" : "text-gray-600 group-hover:text-blue-600"
      )}>
        <Icon className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={1.5} />
        {locked && (
            <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 border-2 border-[#eef2f6]">
                <Lock className="w-3 h-3 text-white" />
            </div>
        )}
      </div>

      {/* Label */}
      <span className="text-lg font-bold text-gray-700 group-hover:text-blue-700 transition-colors text-shadow">
        {label}
      </span>
      
      {/* PRO Badge if locked */}
      {locked && (
          <span className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm">
              PRO
          </span>
      )}
      
      {/* Decorative Shine */}
      <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full opacity-50 blur-[1px]" />
    </button>
  );
};
