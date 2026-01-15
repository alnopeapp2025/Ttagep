import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  variant?: 'default' | 'primary' | 'danger';
}

export const DashboardButton = ({ 
  icon: Icon, 
  label, 
  className, 
  variant = 'default',
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
        className
      )}
      {...props}
    >
      {/* Icon Container - Inset Effect */}
      <div className={cn(
        "mb-4 p-4 rounded-full transition-colors duration-300",
        "shadow-3d-inset",
        variant === 'primary' ? "text-blue-600" : "text-gray-600 group-hover:text-blue-600"
      )}>
        <Icon className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={1.5} />
      </div>

      {/* Label */}
      <span className="text-lg font-bold text-gray-700 group-hover:text-blue-700 transition-colors text-shadow">
        {label}
      </span>
      
      {/* Decorative Shine */}
      <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full opacity-50 blur-[1px]" />
    </button>
  );
};
