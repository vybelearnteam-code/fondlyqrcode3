import { motion } from 'framer-motion';
import { useCampaign } from '@/context/CampaignContext';
import GoldButton from '@/components/GoldButton';
import { Check } from 'lucide-react';

const ConfirmationPage = () => {
  const { spinResult, userData, whatsappNumber, whatsappMessage } = useCampaign();

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `${whatsappMessage} Reward: ${spinResult?.title}. Name: ${userData.name}. Coupon: ${userData.couponCode}.`
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="w-16 h-16 rounded-full gradient-gold flex items-center justify-center mb-8">
        <Check className="w-8 h-8 text-primary-foreground" />
      </motion.div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }} className="text-xs tracking-[0.35em] uppercase text-gold mb-4 font-sans">Confirmed</motion.p>
      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }} className="font-serif text-2xl md:text-3xl text-center text-cream mb-3 max-w-sm">{spinResult?.title}</motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.8 }} className="text-muted-foreground text-sm text-center max-w-xs font-sans mb-4">
        Your reward has been locked in, {userData.name}. Connect with us on WhatsApp to complete the process.
      </motion.p>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.6 }} className="bg-secondary/50 border border-border rounded-sm p-6 w-full max-w-xs mb-10 space-y-2">
        <div className="flex justify-between text-xs font-sans gap-2"><span className="text-muted-foreground shrink-0">Name</span><span className="text-cream text-right">{userData.name}</span></div>
        <div className="flex justify-between text-xs font-sans gap-2"><span className="text-muted-foreground shrink-0">Phone</span><span className="text-cream font-mono">+91 {userData.phone}</span></div>
        <div className="flex justify-between text-xs font-sans gap-2"><span className="text-muted-foreground shrink-0">WhatsApp</span><span className="text-cream font-mono">+91 {userData.whatsappNumber || '—'}</span></div>
        <div className="flex justify-between text-xs font-sans gap-2"><span className="text-muted-foreground shrink-0">Email</span><span className="text-cream text-right max-w-[60%]">{userData.email || '—'}</span></div>
        <div className="flex justify-between text-xs font-sans gap-2"><span className="text-muted-foreground shrink-0">Coupon</span><span className="text-gold font-mono text-right">{userData.couponCode}</span></div>
        <div className="flex justify-between text-xs font-sans gap-2"><span className="text-muted-foreground shrink-0">Address</span><span className="text-cream text-right max-w-[55%]">{userData.address}</span></div>
        <div className="flex justify-between text-xs font-sans gap-2"><span className="text-muted-foreground shrink-0">Reward</span><span className="text-gold text-right">{spinResult?.title}</span></div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, duration: 0.8 }} className="w-full max-w-xs">
        <GoldButton onClick={handleWhatsApp}>Continue to WhatsApp</GoldButton>
      </motion.div>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.5, delay: 1.6 }} className="w-12 h-px bg-gold mt-12" />
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 0.8 }} className="mt-4 text-xs text-muted-foreground font-sans">Fondly — Wellness, Curated.</motion.p>
    </div>
  );
};

export default ConfirmationPage;
