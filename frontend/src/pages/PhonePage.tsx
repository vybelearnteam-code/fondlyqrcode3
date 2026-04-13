import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCampaign } from '@/context/CampaignContext';
import { createUserSubmission, phoneHasSubmission } from '@/lib/api';
import GoldButton from '@/components/GoldButton';
import { toast } from 'sonner';

const PhonePage = () => {
  const { updateUserData, setStep, spinResult, setSubmissionId } = useCampaign();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (phone.length < 10) return;
    setLoading(true);

    try {
      const { exists } = await phoneHasSubmission(phone);
      if (exists) {
        toast.error('This number has already been used.');
        setLoading(false);
        return;
      }
    } catch {
      toast.error('Could not verify number. Try again.');
      setLoading(false);
      return;
    }

    const otp = String(Math.floor(1000 + Math.random() * 9000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    let id: string;
    try {
      const row = await createUserSubmission({
        phone,
        otp_code: otp,
        otp_expires_at: expiresAt,
        reward_id: spinResult?.id || null,
        reward_title: spinResult?.title || null,
      });
      id = row.id;
    } catch {
      toast.error('Something went wrong. Try again.');
      setLoading(false);
      return;
    }

    setSubmissionId(id);
    updateUserData({ phone });

    // TODO: Send OTP via Twilio edge function
    // For now, show OTP in toast for testing
    toast.info(`Your OTP is: ${otp}`, { duration: 10000 });

    setStep('otp');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} className="w-12 h-px bg-gold mb-10" />
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }} className="text-xs tracking-[0.35em] uppercase text-gold mb-4 font-sans">Verify identity</motion.p>
      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }} className="font-serif text-2xl text-center text-cream mb-3">Your phone number</motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.8 }} className="text-muted-foreground text-sm text-center max-w-xs font-sans mb-10">We'll send a one-time code to verify. One number, one reward.</motion.p>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.8 }} className="w-full max-w-xs space-y-6">
        <div className="relative">
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gold text-sm font-sans">+91</span>
          <input
            type="tel" value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="Enter your number"
            className="w-full bg-transparent border-b border-border py-3 pl-10 text-cream font-sans text-lg tracking-wide placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold transition-colors"
          />
        </div>
        <GoldButton onClick={handleSubmit} disabled={phone.length < 10 || loading}>
          {loading ? 'Sending...' : 'Send Code'}
        </GoldButton>
      </motion.div>
    </div>
  );
};

export default PhonePage;
