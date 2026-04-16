import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useCampaign } from '@/context/CampaignContext';
import { updateUserSubmission } from '@/lib/api';
import GoldButton from '@/components/GoldButton';
import { toast } from 'sonner';

const UserFormPage = () => {
  const { userData, updateUserData, setStep, spinResult, submissionId } = useCampaign();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const referenceTime = useMemo(() => new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }), []);

  const handleSubmit = async () => {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const wa = whatsappNumber.replace(/\D/g, '').slice(-10);
    if (!name.trim() || !address.trim() || !emailOk || wa.length !== 10) {
      toast.error('Please fill Full Name, Address, Email ID, and WhatsApp Number.');
      return;
    }

    setLoading(true);

    if (submissionId) {
      try {
        await updateUserSubmission(submissionId, {
          name,
          address,
          email,
          whatsapp_number: wa,
        });
      } catch {
        toast.error('Could not save your details. Try again.');
        setLoading(false);
        return;
      }
    }

    updateUserData({
      name,
      address,
      email,
      whatsappNumber: wa,
      reward: spinResult,
      timestamp: new Date().toISOString(),
    });

    setStep('confirmation');
    setLoading(false);
  };

  const inputClass = 'w-full bg-transparent border-b border-border py-3 text-cream font-sans tracking-wide placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold transition-colors';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }} className="text-xs tracking-[0.35em] uppercase text-gold mb-4 font-sans">Delivery</motion.p>
      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }} className="font-serif text-2xl text-center text-cream mb-2">Contact details</motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55, duration: 0.8 }} className="text-muted-foreground text-xs text-center max-w-xs font-sans mb-8">
        Please share your details so our team can connect with you.
      </motion.p>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.8 }} className="w-full max-w-xs space-y-5">
        <div className="rounded-sm border border-border/60 bg-secondary/20 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans mb-1">Reference time</p>
          <p className="text-sm text-cream font-sans tabular-nums">{referenceTime}</p>
        </div>

        <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />

        <div className="relative">
          <input type="tel" value={userData.phone} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
          <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-gold font-sans">+91</span>
        </div>

        <input type="text" placeholder="Full address" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
        <input
          type="email"
          placeholder="Email ID"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <input
          type="tel"
          inputMode="numeric"
          placeholder="WhatsApp Number (10 digits)"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
          className={inputClass}
        />

        <div className="pt-4">
          <GoldButton
            onClick={handleSubmit}
            disabled={!name.trim() || !address.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || whatsappNumber.replace(/\D/g, '').slice(-10).length !== 10 || loading}
          >
            {loading ? 'Saving...' : 'Complete'}
          </GoldButton>
        </div>
      </motion.div>
    </div>
  );
};

export default UserFormPage;
