import React, { useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Gift } from 'lucide-react';
import { toast } from 'sonner';
import { useCampaign } from '@/context/CampaignContext';
import type { Reward } from '@/context/CampaignContext';
import { normalizeCouponInput } from '@/lib/couponCodes';
import { ApiError, completeSpin, lookupCoupon } from '@/lib/api';

/** Effective weight = admin probability × remaining stock (both shape the wheel and the RNG). */
function rewardSpinWeight(r: Reward): number {
  const p = Math.max(0, Number(r.probability) || 0);
  const s = Math.max(0, Number(r.stock) || 0);
  return p * s;
}

type SpinModel = {
  segmentAnglesDeg: number[];
  cumulativeStartDeg: number[];
  weights: number[];
  pick: () => Reward;
};

function buildSpinModel(list: Reward[]): SpinModel {
  if (!list.length) {
    return {
      segmentAnglesDeg: [],
      cumulativeStartDeg: [0],
      weights: [],
      pick: () => list[0],
    };
  }

  let weights = list.map(rewardSpinWeight);
  let totalW = weights.reduce((a, b) => a + b, 0);

  if (totalW <= 0) {
    weights = list.map((r) => Math.max(0, Number(r.probability) || 0));
    totalW = weights.reduce((a, b) => a + b, 0);
  }
  if (totalW <= 0) {
    weights = list.map(() => 1);
    totalW = list.length;
  }

  const segmentAnglesDeg = weights.map((w) => (w / totalW) * 360);
  const cumulativeStartDeg: number[] = [0];
  for (const a of segmentAnglesDeg) {
    cumulativeStartDeg.push(cumulativeStartDeg[cumulativeStartDeg.length - 1] + a);
  }

  const pick = (): Reward => {
    let rand = Math.random() * totalW;
    for (let i = 0; i < list.length; i++) {
      rand -= weights[i];
      if (rand <= 0) return list[i];
    }
    return list[list.length - 1];
  };

  return { segmentAnglesDeg, cumulativeStartDeg, weights, pick };
}

const SpinWheel: React.FC = () => {
  const { rewards, userData, setSpinResult, setHasSpun, setStep, setSubmissionId } = useCampaign();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  const activeRewards = useMemo(
    () => rewards.filter((r) => r.enabled && r.stock > 0),
    [rewards],
  );

  const spinModel = useMemo(() => buildSpinModel(activeRewards), [activeRewards]);

  const handleSpin = async () => {
    if (isSpinning || activeRewards.length === 0) return;

    const code = normalizeCouponInput(userData.couponCode || '');
    const phoneN = userData.phone?.replace(/\D/g, '');
    if (!code || phoneN.length !== 10) {
      toast.error('Missing coupon or phone. Return to the first screen.');
      return;
    }

    try {
      const row = await lookupCoupon(code);
      if (row.used) {
        toast.error('This coupon is no longer valid for a spin.');
        return;
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        toast.error('This coupon is no longer valid for a spin.');
        return;
      }
      toast.error('Could not verify coupon. Check your connection and try again.');
      return;
    }

    setIsSpinning(true);

    const winner = spinModel.pick();
    const winnerIndex = activeRewards.findIndex((r) => r.id === winner.id);
    const seg = spinModel.segmentAnglesDeg[winnerIndex] ?? 0;
    const start = spinModel.cumulativeStartDeg[winnerIndex] ?? 0;
    const targetSegmentCenter = start + seg / 2;
    const fullRotations = 5 + Math.floor(Math.random() * 3);
    const finalRotation = rotation + fullRotations * 360 + (360 - targetSegmentCenter);

    setRotation(finalRotation);

    window.setTimeout(async () => {
      let row: { id: string };
      try {
        row = await completeSpin({
          phone: phoneN,
          couponCode: code,
          rewardId: winner.id,
          rewardTitle: winner.title,
        });
      } catch (e) {
        console.error(e);
        const msg =
          e instanceof ApiError && e.status === 409
            ? e.message
            : 'Could not complete your spin. Please try again.';
        toast.error(msg);
        setIsSpinning(false);
        return;
      }

      setSubmissionId(row.id);
      setIsSpinning(false);
      setSpinResult(winner);
      setHasSpun(true);
      window.setTimeout(() => setStep('reward'), 800);
    }, 4500);
  };

  const colors = [
    'hsl(38, 45%, 15%)', 'hsl(38, 45%, 10%)',
    'hsl(38, 40%, 18%)', 'hsl(38, 35%, 8%)',
    'hsl(38, 45%, 13%)', 'hsl(38, 40%, 6%)',
    'hsl(38, 45%, 16%)', 'hsl(38, 35%, 11%)',
  ];

  const wheelSize = 320;
  const radius = wheelSize / 2;

  return (
    <div className="flex flex-col items-center gap-10">
      <div className="relative" style={{ width: wheelSize, height: wheelSize }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
          <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[24px] border-l-transparent border-r-transparent border-t-gold" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-gold/30" />
        <motion.div
          ref={wheelRef}
          animate={{ rotate: rotation }}
          transition={{ duration: 4.5, ease: [0.2, 0.8, 0.2, 1] }}
          className="w-full h-full rounded-full overflow-hidden relative"
          style={{ transformOrigin: 'center center' }}
        >
          <svg width={wheelSize} height={wheelSize} viewBox={`0 0 ${wheelSize} ${wheelSize}`}>
            <defs>
              {activeRewards.map((reward, i) => {
                const startDeg = spinModel.cumulativeStartDeg[i] ?? 0;
                const endDeg = spinModel.cumulativeStartDeg[i + 1] ?? 0;
                const segDeg = endDeg - startDeg;
                const startAngle = (startDeg * Math.PI) / 180;
                const endAngle = (endDeg * Math.PI) / 180;
                const x1 = radius + radius * Math.sin(startAngle);
                const y1 = radius - radius * Math.cos(startAngle);
                const x2 = radius + radius * Math.sin(endAngle);
                const y2 = radius - radius * Math.cos(endAngle);
                const largeArc = segDeg > 180 ? 1 : 0;
                const pathD = `M${radius},${radius} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;
                return (
                  <clipPath key={`clip-def-${reward.id}`} id={`wheel-clip-${reward.id}`}>
                    <path d={pathD} />
                  </clipPath>
                );
              })}
            </defs>

            {activeRewards.map((reward, i) => {
              const startDeg = spinModel.cumulativeStartDeg[i] ?? 0;
              const endDeg = spinModel.cumulativeStartDeg[i + 1] ?? 0;
              const segDeg = endDeg - startDeg;
              const startAngle = (startDeg * Math.PI) / 180;
              const endAngle = (endDeg * Math.PI) / 180;
              const midAngle = (startAngle + endAngle) / 2;
              const x1 = radius + radius * Math.sin(startAngle);
              const y1 = radius - radius * Math.cos(startAngle);
              const x2 = radius + radius * Math.sin(endAngle);
              const y2 = radius - radius * Math.cos(endAngle);
              const largeArc = segDeg > 180 ? 1 : 0;
              const pathD = `M${radius},${radius} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;

              const labelRadius = radius * 0.62;
              const textX = radius + labelRadius * Math.sin(midAngle);
              const textY = radius - labelRadius * Math.cos(midAngle);
              const textRotationDeg = (midAngle * 180) / Math.PI;
              const labelRotation =
                textRotationDeg > 90 && textRotationDeg < 270 ? textRotationDeg + 180 : textRotationDeg;

              const fo = 56;
              const foX = textX - fo / 2;
              const foY = textY - fo / 2;

              return (
                <g key={reward.id}>
                  <path
                    d={pathD}
                    fill={colors[i % colors.length]}
                    stroke="hsl(38, 45%, 25%)"
                    strokeWidth="0.5"
                  />
                  <g clipPath={`url(#wheel-clip-${reward.id})`}>
                    <foreignObject
                      x={foX}
                      y={foY}
                      width={fo}
                      height={fo}
                      transform={`rotate(${labelRotation}, ${textX}, ${textY})`}
                    >
                      <div
                        xmlns="http://www.w3.org/1999/xhtml"
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 2,
                          pointerEvents: 'none',
                          userSelect: 'none',
                        }}
                      >
                        {reward.image ? (
                          <img
                            src={reward.image}
                            alt=""
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '1px solid hsl(38 45% 35% / 0.6)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                            }}
                          />
                        ) : (
                          <Gift
                            size={26}
                            strokeWidth={1.35}
                            color="hsl(38, 50%, 78%)"
                            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}
                            aria-hidden
                          />
                        )}
                        <span
                          style={{
                            fontSize: 7,
                            fontWeight: 500,
                            fontFamily: 'DM Sans, system-ui, sans-serif',
                            color: 'hsl(38, 35%, 68%)',
                            textAlign: 'center',
                            lineHeight: 1.15,
                            maxWidth: 50,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical' as const,
                            wordBreak: 'break-word',
                          }}
                        >
                          {reward.title}
                        </span>
                      </div>
                    </foreignObject>
                  </g>
                </g>
              );
            })}
          </svg>
        </motion.div>
        <button
          type="button"
          onClick={handleSpin}
          disabled={isSpinning}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full gradient-gold flex items-center justify-center text-primary-foreground text-xs font-sans font-semibold tracking-wider uppercase disabled:opacity-50 transition-transform hover:scale-105 active:scale-95 z-20"
        >
          {isSpinning ? '...' : 'Spin'}
        </button>
      </div>
    </div>
  );
};

export default SpinWheel;
