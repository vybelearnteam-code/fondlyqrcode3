import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
  keyProp: string;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children, keyProp }) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={keyProp}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  </AnimatePresence>
);

export default PageTransition;
