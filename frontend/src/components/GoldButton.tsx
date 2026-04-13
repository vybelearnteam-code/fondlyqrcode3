import { motion } from 'framer-motion';
import React from 'react';

interface GoldButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

const GoldButton: React.FC<GoldButtonProps> = ({ children, onClick, disabled, type = 'button', className = '' }) => (
  <motion.button
    type={type}
    onClick={onClick}
    disabled={disabled}
    whileHover={{ scale: disabled ? 1 : 1.02 }}
    whileTap={{ scale: disabled ? 1 : 0.98 }}
    className={`relative w-full py-4 px-8 font-sans text-sm font-medium tracking-[0.2em] uppercase
      gradient-gold text-primary-foreground
      disabled:opacity-40 disabled:cursor-not-allowed
      transition-all duration-300 ${className}`}
    style={{ borderRadius: '2px' }}
  >
    {children}
  </motion.button>
);

export default GoldButton;
