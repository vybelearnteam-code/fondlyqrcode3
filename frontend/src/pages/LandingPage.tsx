import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCampaign } from '@/context/CampaignContext';
import GoldButton from '@/components/GoldButton';
import { toast } from 'sonner';
import { normalizeCouponInput } from '@/lib/couponCodes';
import { ApiError, lookupCoupon, phoneHasSubmission } from '@/lib/api';

const LandingPage = () => {
  const { setStep, updateUserData } = useCampaign();
  const [coupon, setCoupon] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const code = normalizeCouponInput(coupon);
    if (!code) {
      toast.error('Enter your coupon code.');
      return;
    }
    if (phone.replace(/\D/g, '').length !== 10) {
      toast.error('Enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);

    let couponRow: { used: boolean };
    try {
      couponRow = await lookupCoupon(code);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        toast.error('Invalid coupon code.');
      } else {
        toast.error('Coupon system unavailable. Check that the API server is running and MongoDB is configured.');
      }
      setLoading(false);
      return;
    }
    if (couponRow.used) {
      toast.error('This coupon has already been used for a spin.');
      setLoading(false);
      return;
    }

    const digits = phone.replace(/\D/g, '');
    try {
      const { exists } = await phoneHasSubmission(digits);
      if (exists) {
        toast.error('This phone number has already been used.');
        setLoading(false);
        return;
      }
    } catch {
      toast.error('Could not verify your number. Check your connection and try again.');
      setLoading(false);
      return;
    }

    updateUserData({ phone: digits, couponCode: code, otpVerified: true });
    setStep('spin');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden py-12">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80 pointer-events-none" />

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        className="w-16 h-px bg-gold mb-10"
      />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="text-xs tracking-[0.35em] uppercase text-gold mb-8 font-sans"
      >
        Fondly
      </motion.p>

      <motion.h1
        initial={{ opacity: 1, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="font-serif text-3xl md:text-5xl text-center leading-tight text-cream max-w-lg"
      >
        You found it.
        <br />
        <span className="italic text-gold">You weren&apos;t supposed to.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.6 }}
        className="mt-6 text-muted-foreground text-sm text-center max-w-sm font-sans leading-relaxed"
      >
        Not everyone reaches this page. What happens next is exclusively yours.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 2 }}
        className="mt-12 w-full max-w-xs space-y-6"
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-gold/80 font-sans mb-2">Coupon code</p>
          <input
            type="text"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 18))}
            placeholder="Enter code from your invite"
            className="w-full bg-transparent border-b border-border py-3 text-cream font-sans text-sm tracking-widest placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold transition-colors"
          />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-gold/80 font-sans mb-2">Phone number</p>
          <div className="relative">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gold text-sm font-sans">+91</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile"
              className="w-full bg-transparent border-b border-border py-3 pl-10 text-cream font-sans text-lg tracking-wide placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold transition-colors"
            />
          </div>
        </div>
        <GoldButton onClick={handleContinue} disabled={loading}>
          {loading ? 'Please wait…' : 'Continue'}
        </GoldButton>
      </motion.div>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 2.4 }}
        className="w-16 h-px bg-gold mt-14"
      />
    </div>
  );
};

export default LandingPage;
