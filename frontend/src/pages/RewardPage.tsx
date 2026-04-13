import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useCampaign } from '@/context/CampaignContext';
import GoldButton from '@/components/GoldButton';
import { Gift, Sparkles } from 'lucide-react';

const UNLOCK_LABEL = "You've unlocked";

const RewardPage = () => {
  const { spinResult, setStep } = useCampaign();
  const reduceMotion = useReducedMotion();

  const sparkles = useMemo(
    () =>
      [...Array(16)].map((_, i) => ({
        id: i,
        left: `${8 + ((i * 17) % 84)}%`,
        top: `${10 + ((i * 23) % 80)}%`,
        delay: (i % 6) * 0.08,
        duration: 1.3 + (i % 5) * 0.12,
      })),
    [],
  );

  if (!spinResult) return null;

  const isTryAgain = spinResult.title === 'Try Again';
  const burst = !reduceMotion && !isTryAgain;

  const goForm = () => setStep('form');

  if (isTryAgain) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="w-20 h-20 rounded-full border border-gold/30 flex items-center justify-center mb-8"
        >
          <Gift className="w-8 h-8 text-gold" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.75 }}
          className="font-serif text-2xl md:text-3xl text-center text-cream mb-4"
        >
          Not this time.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.75 }}
          className="text-muted-foreground text-sm text-center max-w-xs font-sans mb-10"
        >
          The universe has other plans. You can still leave your details below.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="w-full max-w-xs">
          <GoldButton onClick={goForm}>Continue</GoldButton>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {burst && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <motion.div
            className="absolute w-[min(88vw,400px)] h-[min(88vw,400px)] rounded-full border border-gold/15"
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: [0.2, 1.05, 1.2], opacity: [0, 0.45, 0] }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="absolute w-[min(48vw,220px)] h-[min(48vw,220px)] rounded-full bg-[radial-gradient(circle,hsl(38_45%_60%/0.2)_0%,transparent_70%)]"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.1], opacity: [0, 1, 0.75] }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />
          {sparkles.map((s) => (
            <motion.span
              key={s.id}
              className="absolute h-1 w-1 rounded-full bg-gold/90 shadow-[0_0_10px_hsl(38_45%_60%/0.85)]"
              style={{ left: s.left, top: s.top }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0.35, 0],
                scale: [0, 1.1, 0.5, 0],
                y: [0, -8, 6, 14],
              }}
              transition={{
                duration: s.duration,
                delay: 0.2 + s.delay,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center w-full max-w-lg">
        <motion.div
          initial={{ scale: 0, rotate: -18, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16 }}
          className="relative mb-8"
        >
          {burst && (
            <motion.div
              className="absolute inset-0 -m-4 rounded-full border border-gold/35"
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.12, 0.5] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <div className="w-28 h-28 rounded-full border border-gold/35 bg-gradient-to-b from-secondary/90 to-background flex items-center justify-center shadow-[0_0_48px_hsl(38_45%_60%/0.15)] overflow-hidden">
            {spinResult.image ? (
              <motion.img
                src={spinResult.image}
                alt=""
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 280, damping: 18 }}
                className="w-[5.25rem] h-[5.25rem] rounded-full object-cover border border-gold/25"
              />
            ) : (
              <motion.div
                animate={burst ? { y: [0, -4, 0] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Gift className="w-11 h-11 text-gold" />
              </motion.div>
            )}
          </div>
          {burst && (
            <motion.div
              className="absolute -right-0.5 -top-0.5 text-gold"
              initial={{ scale: 0, opacity: 0, rotate: -25 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 380, damping: 14 }}
            >
              <Sparkles className="w-6 h-6" strokeWidth={1.25} />
            </motion.div>
          )}
        </motion.div>

        <div className="flex flex-wrap justify-center gap-x-0.5 mb-3 max-w-md">
          {UNLOCK_LABEL.split('').map((char, i) => (
            <motion.span
              key={`${char}-${i}`}
              initial={{ opacity: 0, y: 8, filter: reduceMotion ? 'none' : 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{
                delay: 0.12 + i * (reduceMotion ? 0 : 0.024),
                duration: reduceMotion ? 0.3 : 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="text-xs tracking-[0.35em] uppercase text-gold font-sans inline-block"
            >
              {char === ' ' ? '\u00a0' : char}
            </motion.span>
          ))}
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 22, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.45, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="font-serif text-2xl md:text-4xl text-center mb-2 max-w-sm md:max-w-lg leading-tight"
        >
          {burst ? (
            <motion.span
              className="inline-block bg-gradient-to-r from-cream via-[hsl(38,48%,74%)] to-cream bg-clip-text text-transparent"
              style={{ backgroundSize: '220% 100%' }}
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            >
              {spinResult.title}
            </motion.span>
          ) : (
            <span className="text-cream">{spinResult.title}</span>
          )}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.72, duration: 0.7 }}
          className="text-muted-foreground text-sm text-center max-w-xs font-sans mb-4"
        >
          {spinResult.description}
        </motion.p>

        {(spinResult.content || spinResult.subContent) ? (
          <div className="space-y-3 mb-8 max-w-md mx-auto px-2 w-full">
            {spinResult.content ? (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.82, duration: 0.65 }}
                className="text-cream/95 text-sm text-center font-sans leading-relaxed whitespace-pre-wrap"
              >
                {spinResult.content}
              </motion.p>
            ) : null}
            {spinResult.subContent ? (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.65 }}
                className="text-muted-foreground text-xs text-center font-sans leading-relaxed whitespace-pre-wrap"
              >
                {spinResult.subContent}
              </motion.p>
            ) : null}
          </div>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.95, type: 'spring', stiffness: 200, damping: 18 }}
          className="w-full max-w-xs space-y-4"
        >
          <p className="text-center text-[11px] text-gold/90 font-sans tracking-wider uppercase">
            Collect your gift — add delivery details next
          </p>
          <GoldButton onClick={goForm}>Claim &amp; enter details</GoldButton>
        </motion.div>
      </div>
    </div>
  );
};

export default RewardPage;
