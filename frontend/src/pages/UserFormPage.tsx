import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useCampaign } from '@/context/CampaignContext';
import GoldButton from '@/components/GoldButton';

const UserFormPage = () => {
  const { userData, setStep } = useCampaign();

  const referenceTime = useMemo(() => new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }), []);

  const handleSubmit = () => setStep('confirmation');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }} className="text-xs tracking-[0.35em] uppercase text-gold mb-4 font-sans">Summary</motion.p>
      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }} className="font-serif text-2xl text-center text-cream mb-2">Review details</motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55, duration: 0.8 }} className="text-muted-foreground text-xs text-center max-w-xs font-sans mb-8">
        Contact detail collection has been removed.
      </motion.p>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.8 }} className="w-full max-w-xs space-y-5">
        <div className="rounded-sm border border-border/60 bg-secondary/20 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans mb-1">Reference time</p>
          <p className="text-sm text-cream font-sans tabular-nums">{referenceTime}</p>
        </div>

        <div className="rounded-sm border border-border/60 bg-secondary/20 px-3 py-2.5 text-xs space-y-1">
          <p className="text-muted-foreground font-sans">Name: <span className="text-cream">{userData.planName || '—'}</span></p>
          <p className="text-muted-foreground font-sans">Phone: <span className="text-cream font-mono">+91 {userData.phone || '—'}</span></p>
          <p className="text-muted-foreground font-sans">Coupon: <span className="text-gold font-mono">{userData.couponCode || '—'}</span></p>
        </div>

        <div className="pt-4">
          <GoldButton
            onClick={handleSubmit}
          >
            Continue
          </GoldButton>
        </div>
      </motion.div>
    </div>
  );
};

export default UserFormPage;
