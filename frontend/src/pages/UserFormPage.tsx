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
  const [city, setCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [source, setSource] = useState('');
  const [sourceOther, setSourceOther] = useState('');
  const [loading, setLoading] = useState(false);

  const sources = ['Gym', 'Office', 'Café', 'Event', 'Friend', 'Other'] as const;

  const referenceTime = useMemo(() => new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }), []);

  const resolvedSource = source === 'Other' ? (sourceOther.trim() || 'Other') : source;

  const handleSubmit = async () => {
    if (!name || !address || !city || !pinCode.replace(/\D/g, '').length) {
      toast.error('Please fill name, address, city, and PIN code.');
      return;
    }
    if (!source) {
      toast.error('Pick where you found this.');
      return;
    }
    if (source === 'Other' && !sourceOther.trim()) {
      toast.error('Tell us where you found this.');
      return;
    }

    setLoading(true);

    const pin = pinCode.replace(/\D/g, '').slice(0, 6);

    if (submissionId) {
      try {
        await updateUserSubmission(submissionId, {
          name,
          address,
          city,
          pin_code: pin,
          source: resolvedSource || null,
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
      city,
      pinCode: pin,
      source: resolvedSource,
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
      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }} className="font-serif text-2xl text-center text-cream mb-2">Home address</motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55, duration: 0.8 }} className="text-muted-foreground text-xs text-center max-w-xs font-sans mb-8">
        Where did you find this?
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

        <input type="text" placeholder="Full home address" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
        <input type="text" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
        <input
          type="text"
          inputMode="numeric"
          placeholder="PIN code (6 digits)"
          value={pinCode}
          onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className={inputClass}
        />

        <div>
          <p className="text-xs text-muted-foreground font-sans mb-3">Where did you find this?</p>
          <div className="flex flex-wrap gap-2">
            {sources.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSource(s)}
                className={`px-3 py-2 text-xs font-sans tracking-wider border rounded-sm transition-all ${source === s ? 'border-gold text-gold bg-gold/5' : 'border-border text-muted-foreground hover:border-gold/50'}`}
              >
                {s}
              </button>
            ))}
          </div>
          {source === 'Other' && (
            <input
              type="text"
              placeholder="Please specify"
              value={sourceOther}
              onChange={(e) => setSourceOther(e.target.value)}
              className={`${inputClass} mt-3`}
            />
          )}
        </div>

        <div className="pt-4">
          <GoldButton
            onClick={handleSubmit}
            disabled={!name || !address || !city || pinCode.replace(/\D/g, '').length < 6 || !source || loading}
          >
            {loading ? 'Saving...' : 'Complete'}
          </GoldButton>
        </div>
      </motion.div>
    </div>
  );
};

export default UserFormPage;
