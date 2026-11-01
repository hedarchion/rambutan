import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon,
  className = '',
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-semibold tracking-tight rounded-xl transition-colors select-none whitespace-nowrap focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500/60 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-rose-600 text-white hover:bg-rose-500 border border-transparent shadow-sm shadow-rose-950/40 active:bg-rose-700 active:scale-[0.99]",
    secondary: "bg-zinc-800/90 text-zinc-200 border border-zinc-700/80 hover:bg-zinc-700 hover:text-white hover:border-zinc-600 active:bg-zinc-700 active:scale-[0.99] shadow-sm",
    danger: "bg-red-500/10 text-red-300 border border-red-500/25 hover:bg-red-500/20 hover:text-red-200 hover:border-red-500/40 active:bg-red-500/30",
    ghost: "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100 active:bg-zinc-800"
  };

  const sizes = {
    xs: "px-2.5 py-1 text-xs gap-1",
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-3 text-[15px] gap-2",
    icon: "p-2"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className={`shrink-0 ${children ? "mr-1" : ""}`}>{icon}</span>}
      {children}
    </button>
  );
};