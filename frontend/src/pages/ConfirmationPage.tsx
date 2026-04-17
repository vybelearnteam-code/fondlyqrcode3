import { motion } from 'framer-motion';
import { useCampaign } from '@/context/CampaignContext';
import GoldButton from '@/components/GoldButton';
import { Check } from 'lucide-react';

/** Shown when campaign settings have no custom WhatsApp message. */
const DEFAULT_CLAIM_WHATSAPP_INTRO =
  'Hi! I have claimed my Fondly gift and would like to complete the next steps.';

const ConfirmationPage = () => {
  const { spinResult, userData, whatsappNumber, whatsappMessage } = useCampaign();

  const openWhatsApp = () => {
    const intro = whatsappMessage?.trim() || DEFAULT_CLAIM_WHATSAPP_INTRO;
    const text = [
      intro,
      `Reward: ${spinResult?.title ?? '—'}.`,
      `Plan name: ${userData.planName || '—'}.`,
      `Coupon: ${userData.couponCode || '—'}.`,
      `Phone: +91 ${userData.phone || '—'}.`,
    ].join(' ');
    const message = encodeURIComponent(text);
    const digits = whatsappNumber.replace(/\D/g, '');
    if (!digits) return;
    window.open(`https://wa.me/${digits}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="w-16 h-16 rounded-full gradient-gold flex items-center justify-center mb-8">
        <Check className="w-8 h-8 text-primary-foreground" />
      </motion.div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }} className="text-xs tracking-[0.35em] uppercase text-gold mb-4 font-sans">Confirmed</motion.p>
      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }} className="font-serif text-2xl md:text-3xl text-center text-cream mb-3 max-w-sm">{spinResult?.title}</motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.8 }} className="text-muted-foreground text-sm text-center max-w-xs font-sans mb-4">
        Your reward has been locked in successfully.
      </motion.p>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.6 }} className="bg-secondary/50 border border-border rounded-sm p-6 w-full max-w-xs mb-10 space-y-2">
        <div className="flex justify-between text-xs font-sans gap-2"><span className="text-muted-foreground shrink-0">Plan name</span><span className="text-cream text-right">{userData.planName || '—'}</span></div>
        <div className="flex justify-between text-xs font-sans gap-2"><span className="text-muted-foreground shrink-0">Phone</span><span className="text-cream font-mono">+91 {userData.phone}</span></div>
        <div className="flex justify-between text-xs font-sans gap-2"><span className="text-muted-foreground shrink-0">Coupon</span><span className="text-gold font-mono text-right">{userData.couponCode}</span></div>
        <div className="flex justify-between text-xs font-sans gap-2"><span className="text-muted-foreground shrink-0">Reward</span><span className="text-gold text-right">{spinResult?.title}</span></div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.25, duration: 0.8 }}
        className="w-full max-w-xs"
      >
        <GoldButton onClick={openWhatsApp}>Continue to WhatsApp</GoldButton>
        <p className="mt-3 text-[10px] text-center text-muted-foreground font-sans leading-relaxed">
          Opens WhatsApp with a default message about your claimed gift. You can edit before sending.
        </p>
      </motion.div>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.5, delay: 1.6 }} className="w-12 h-px bg-gold mt-12" />
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 0.8 }} className="mt-4 text-xs text-muted-foreground font-sans">Fondly — Wellness, Curated.</motion.p>
    </div>
  );
};

export default ConfirmationPage;
