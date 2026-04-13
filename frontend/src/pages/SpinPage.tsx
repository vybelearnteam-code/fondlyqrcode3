import { motion } from 'framer-motion';
import SpinWheel from '@/components/SpinWheel';
import { useCampaign } from '@/context/CampaignContext';

const SpinPage = () => {
  const { userData } = useCampaign();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="text-xs tracking-[0.35em] uppercase text-gold mb-4 font-sans"
      >
        Your moment
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="font-serif text-2xl md:text-3xl text-center text-cream mb-2"
      >
        One spin. One reward.
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="text-muted-foreground text-sm mb-2 text-center font-sans max-w-xs"
      >
        Tap the center to discover what&apos;s yours.
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75, duration: 0.8 }}
        className="text-[11px] text-muted-foreground/80 font-sans text-center max-w-sm mb-10"
      >
        Coupon <span className="text-gold/90 font-mono tracking-wide">{userData.couponCode || '—'}</span>
        {' · '}
        +91 {userData.phone || '—'}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.85, duration: 0.8 }}
      >
        <SpinWheel />
      </motion.div>
    </div>
  );
};

export default SpinPage;
