import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { fetchCampaignSettings, fetchPublicRewards } from '@/lib/api';

export interface Reward {
  id: string;
  title: string;
  description: string;
  /** Longer body shown on the prize screen */
  content?: string;
  /** Secondary / fine print under main content */
  subContent?: string;
  image?: string;
  probability: number;
  stock: number;
  enabled: boolean;
}

export interface UserData {
  phone: string;
  couponCode: string;
  otpVerified: boolean;
  name: string;
  address: string;
  email: string;
  whatsappNumber: string;
  city: string;
  pinCode: string;
  source: string;
  reward: Reward | null;
  timestamp: string;
}

type FlowStep = 'landing' | 'spin' | 'reward' | 'form' | 'confirmation';

interface CampaignState {
  step: FlowStep;
  setStep: (step: FlowStep) => void;
  userData: UserData;
  updateUserData: (data: Partial<UserData>) => void;
  rewards: Reward[];
  spinResult: Reward | null;
  setSpinResult: (reward: Reward) => void;
  hasSpun: boolean;
  setHasSpun: (val: boolean) => void;
  spinEnabled: boolean;
  whatsappNumber: string;
  whatsappMessage: string;
  couponValidUntil: string;
  couponValidityText: string;
  wheelImageSize: number;
  submissionId: string | null;
  setSubmissionId: (id: string | null) => void;
}

const CampaignContext = createContext<CampaignState | null>(null);

export const useCampaign = () => {
  const ctx = useContext(CampaignContext);
  if (!ctx) throw new Error('useCampaign must be used within CampaignProvider');
  return ctx;
};

function mapApiRewardsToContext(
  rewardsList: Awaited<ReturnType<typeof fetchPublicRewards>>,
): Reward[] {
  return rewardsList.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description || '',
    content: r.content || undefined,
    subContent: r.sub_content || undefined,
    probability: r.probability,
    stock: r.stock,
    enabled: r.enabled,
    image: r.image_url || undefined,
  }));
}

export const CampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [step, setStep] = useState<FlowStep>('landing');
  const [hasSpun, setHasSpun] = useState(false);
  const [spinResult, setSpinResult] = useState<Reward | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [spinEnabled, setSpinEnabled] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState('919999999999');
  const [whatsappMessage, setWhatsappMessage] = useState('Hi, I received the Fondly reward.');
  const [couponValidUntil, setCouponValidUntil] = useState('2026-04-19T01:00:00+05:30');
  const [couponValidityText, setCouponValidityText] = useState('Coupon validity ended on 19-04-2026, 01:00 AM.');
  const [wheelImageSize, setWheelImageSize] = useState(28);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData>({
    phone: '',
    couponCode: '',
    otpVerified: false,
    name: '',
    address: '',
    email: '',
    whatsappNumber: '',
    city: '',
    pinCode: '',
    source: '',
    reward: null,
    timestamp: '',
  });

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [liteRewards, settings] = await Promise.all([
          fetchPublicRewards({ omitDataImages: true }),
          fetchCampaignSettings(),
        ]);
        if (cancelled) return;
        setRewards(mapApiRewardsToContext(liteRewards));
        setSpinEnabled(settings.spin_enabled);
        setWhatsappNumber(settings.whatsapp_number || '919999999999');
        setWhatsappMessage(settings.whatsapp_message || 'Hi, I received the Fondly reward.');
        setCouponValidUntil(settings.coupon_valid_until || '2026-04-19T01:00:00+05:30');
        setCouponValidityText(
          settings.coupon_validity_text || 'Coupon validity ended on 19-04-2026, 01:00 AM.',
        );
        setWheelImageSize(
          typeof settings.wheel_image_size === 'number' && Number.isFinite(settings.wheel_image_size)
            ? settings.wheel_image_size
            : 28,
        );

        void fetchPublicRewards({ omitDataImages: false })
          .then((fullRewards) => {
            if (cancelled) return;
            const byId = new Map(fullRewards.map((r) => [r.id, r.image_url]));
            setRewards((prev) =>
              prev.map((r) => {
                const url = byId.get(r.id);
                return typeof url === 'string' && url.length > 0 ? { ...r, image: url } : r;
              }),
            );
            setSpinResult((prev) => {
              if (!prev) return prev;
              const url = byId.get(prev.id);
              return typeof url === 'string' && url.length > 0 ? { ...prev, image: url } : prev;
            });
          })
          .catch(() => {
            /* wheel shows placeholders until retry */
          });
      } catch {
        /* keep defaults; individual screens may toast */
      }
    };
    void fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateUserData = useCallback((data: Partial<UserData>) => {
    setUserData(prev => ({ ...prev, ...data }));
  }, []);

  return (
    <CampaignContext.Provider value={{
      step, setStep, userData, updateUserData, rewards, spinResult, setSpinResult,
      hasSpun, setHasSpun, spinEnabled, whatsappNumber, whatsappMessage, couponValidUntil,
      couponValidityText, wheelImageSize, submissionId, setSubmissionId,
    }}>
      {children}
    </CampaignContext.Provider>
  );
};
