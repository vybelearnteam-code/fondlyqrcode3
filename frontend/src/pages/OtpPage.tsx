import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useCampaign } from '@/context/CampaignContext';
import { fetchSubmissionOtp, updateUserSubmission } from '@/lib/api';
import GoldButton from '@/components/GoldButton';
import { toast } from 'sonner';

const OtpPage = () => {
  const { userData, updateUserData, setStep, submissionId } = useCampaign();
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 4 || !submissionId) return;
    setLoading(true);

    let data: { otp_code: string | null; otp_expires_at: string | null };
    try {
      data = await fetchSubmissionOtp(submissionId);
    } catch {
      toast.error('Verification failed.');
      setLoading(false);
      return;
    }

    if (data.otp_code !== code) {
      toast.error('Invalid code. Try again.');
      setLoading(false);
      return;
    }

    if (!data.otp_expires_at || new Date(data.otp_expires_at) < new Date()) {
      toast.error('Code expired. Please go back and try again.');
      setLoading(false);
      return;
    }

    try {
      await updateUserSubmission(submissionId, { otp_verified: true });
    } catch {
      toast.error('Could not save verification. Try again.');
      setLoading(false);
      return;
    }
    updateUserData({ otpVerified: true });
    setStep('form');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }} className="text-xs tracking-[0.35em] uppercase text-gold mb-4 font-sans">Verification</motion.p>
      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }} className="font-serif text-2xl text-center text-cream mb-3">Enter the code</motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }} className="text-muted-foreground text-sm text-center font-sans mb-10">Sent to +91 {userData.phone}</motion.p>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.8 }} className="flex gap-4 mb-10">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={el => { inputRefs.current[i] = el; }}
            type="text" inputMode="numeric" maxLength={1} value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-14 h-14 bg-secondary border border-border text-center text-cream text-xl font-sans rounded-sm focus:outline-none focus:border-gold transition-colors"
          />
        ))}
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.8 }} className="w-full max-w-xs">
        <GoldButton onClick={handleVerify} disabled={otp.join('').length < 4 || loading}>
          {loading ? 'Verifying...' : 'Verify'}
        </GoldButton>
      </motion.div>
    </div>
  );
};

export default OtpPage;
