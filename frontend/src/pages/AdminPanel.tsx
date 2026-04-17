import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deleteUnusedCouponCodes,
  fetchAllRewards,
  fetchAllSubmissions,
  fetchCampaignSettings,
  fetchCouponCodeStrings,
  fetchCouponCodes,
  insertCouponCodes,
  updateCampaignSettings,
  updateReward,
} from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Download, LogOut, RefreshCw, Users, Gift, Settings, Ticket } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SHOP_COUPON_SEED } from '@/data/shopCouponSeed';

type Reward = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  sub_content: string | null;
  image_url: string | null;
  probability: number;
  stock: number;
  enabled: boolean;
  sort_order: number;
};

type Submission = {
  id: string;
  phone: string;
  coupon_code: string | null;
  pin_code: string | null;
  otp_verified: boolean;
  name: string | null;
  address: string | null;
  city: string | null;
  source: string | null;
  reward_title: string | null;
  created_at: string;
};

type CouponRow = {
  id: string;
  code: string;
  used: boolean;
  unlimited: boolean;
  used_at: string | null;
  created_at: string;
  updated_at: string | null;
};

type CampaignSettings = {
  id: string;
  spin_enabled: boolean;
  whatsapp_number: string | null;
  whatsapp_message: string | null;
  coupon_inventory_saved_at: string | null;
  coupon_valid_until: string | null;
  coupon_validity_text: string | null;
  wheel_image_size: number | null;
};

type CampaignSettingsDraft = {
  spin_enabled: boolean;
  coupon_validity_text: string;
  coupon_valid_until_local: string;
  wheel_image_size: string;
};

type RewardDraft = {
  title: string;
  description: string;
  image_url: string | null;
  probability: string;
  stock: string;
  enabled: boolean;
  content: string;
  sub_content: string;
};

const AdminPanel = () => {
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [settings, setSettings] = useState<CampaignSettings | null>(null);
  const [filterReward, setFilterReward] = useState('');
  const [loading, setLoading] = useState(true);
  const [couponBusy, setCouponBusy] = useState(false);
  const [singleCoupon, setSingleCoupon] = useState('');
  const [singleCouponUnlimited, setSingleCouponUnlimited] = useState(false);
  const [bulkCouponText, setBulkCouponText] = useState('');
  const [bulkCouponUnlimited, setBulkCouponUnlimited] = useState(false);
  const [addCouponsBusy, setAddCouponsBusy] = useState(false);
  const [removeLegacyBusy, setRemoveLegacyBusy] = useState(false);
  const [purgeFndBusy, setPurgeFndBusy] = useState(false);
  const [imageUploadBusyByReward, setImageUploadBusyByReward] = useState<Record<string, boolean>>({});
  const [rewardDrafts, setRewardDrafts] = useState<Record<string, RewardDraft>>({});
  const [savingRewardById, setSavingRewardById] = useState<Record<string, boolean>>({});
  const [savingWheelSize, setSavingWheelSize] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<CampaignSettingsDraft>({
    spin_enabled: true,
    coupon_validity_text: 'Coupon validity ended on 19-04-2026, 01:00 AM.',
    coupon_valid_until_local: '',
    wheel_image_size: '28',
  });
  const [adminTab, setAdminTab] = useState('rewards');

  useEffect(() => {
    if (sessionStorage.getItem('fondly_admin') !== 'true') {
      navigate('/admin-login');
      return;
    }
    fetchAll();
  }, []);

  /** Load coupon rows from DB and return them (empty table is `null` from PostgREST — treat as []). */
  const refreshCouponsFromDb = async (): Promise<CouponRow[]> => {
    const rows = await fetchCouponCodes();
    setCoupons(rows as CouponRow[]);
    return rows as CouponRow[];
  };

  const refreshCouponInventoryMeta = async (): Promise<CampaignSettings | null> => {
    const [rows, s] = await Promise.all([fetchCouponCodes(), fetchCampaignSettings()]);
    const next = s as CampaignSettings;
    setCoupons(rows as CouponRow[]);
    setSettings(next);
    return next;
  };

  /** Split pasted bulk text: one code per line, or comma / semicolon / space separated. */
  const parseBulkCouponInput = (text: string): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const part of text.split(/[\n,;\s\t]+/)) {
      const c = part.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!c || seen.has(c)) continue;
      seen.add(c);
      out.push(c);
    }
    return out;
  };

  const formatIssued = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—';

  const toLocalDateTimeInputValue = (isoLike: string | null | undefined): string => {
    if (!isoLike) return '';
    const d = new Date(isoLike);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r, s, c] = await Promise.all([
        fetchAllRewards(),
        fetchAllSubmissions(),
        fetchCampaignSettings(),
      ]);
      setRewards(r as Reward[]);
      setRewardDrafts(
        Object.fromEntries(
          (r as Reward[]).map((row) => [
            row.id,
            {
              title: row.title || '',
              description: row.description || '',
              image_url: row.image_url || null,
              probability: String(row.probability ?? 0),
              stock: String(row.stock ?? 0),
              enabled: Boolean(row.enabled),
              content: row.content || '',
              sub_content: row.sub_content || '',
            } satisfies RewardDraft,
          ]),
        ),
      );
      setSubmissions(s as Submission[]);
      const cs = c as CampaignSettings;
      setSettings(cs);
      setSettingsDraft({
        spin_enabled: cs.spin_enabled ?? true,
        coupon_validity_text: cs.coupon_validity_text || 'Coupon validity ended on 19-04-2026, 01:00 AM.',
        coupon_valid_until_local: toLocalDateTimeInputValue(cs.coupon_valid_until),
        wheel_image_size: String(cs.wheel_image_size ?? 28),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load campaign data. Is the API server running?');
      setLoading(false);
      return;
    }

    try {
      const cp = await fetchCouponCodes();
      setCoupons(cp as CouponRow[]);
    } catch (e) {
      setCoupons([]);
      toast.error(
        e instanceof Error
          ? e.message
          : 'Could not load coupons. Confirm MONGODB_URI and that the server can reach Atlas.',
        { duration: 12_000 },
      );
    }
    setLoading(false);
  };

  const fetchExistingCodeSet = async (): Promise<Set<string>> => {
    const set = new Set<string>();
    const pageSize = 1000;
    let from = 0;
    for (;;) {
      const { codes } = await fetchCouponCodeStrings(from, pageSize);
      if (!codes.length) break;
      codes.forEach((code) => set.add(code));
      if (codes.length < pageSize) break;
      from += pageSize;
    }
    return set;
  };

  /** Returns how many rows were inserted (missing codes only). */
  const insertMissingCodes = async (codes: readonly string[]): Promise<number> => {
    if (!codes.length) return 0;
    const existing = await fetchExistingCodeSet();
    const toInsert = codes.filter((c) => !existing.has(c));
    if (!toInsert.length) return 0;
    const chunkSize = 50;
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      const r = await insertCouponCodes(chunk);
      inserted += r.inserted;
    }
    return inserted;
  };

  const resyncCampaignCoupons = async () => {
    setCouponBusy(true);
    try {
      const added = await insertMissingCodes(SHOP_COUPON_SEED);
      const s = await refreshCouponInventoryMeta();
      if (added > 0) {
        const when = s?.coupon_inventory_saved_at ? formatIssued(s.coupon_inventory_saved_at) : '';
        toast.success(
          when
            ? `Imported ${added} new code${added === 1 ? '' : 's'} from file. Saved ${when}.`
            : `Imported ${added} new code${added === 1 ? '' : 's'} from file.`,
        );
      } else if (SHOP_COUPON_SEED.length === 0) {
        toast.message('Bundled campaign file has no codes to import.');
      } else {
        toast.message('Bundled campaign list is already fully imported.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setCouponBusy(false);
    }
  };

  const addSingleCouponManually = async () => {
    const code = singleCoupon.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!code) {
      toast.error('Enter a coupon code.');
      return;
    }
    setAddCouponsBusy(true);
    try {
      const { inserted } = await insertCouponCodes([code], singleCouponUnlimited);
      const s = await refreshCouponInventoryMeta();
      if (inserted > 0) {
        const when = s?.coupon_inventory_saved_at ? formatIssued(s.coupon_inventory_saved_at) : '';
        toast.success(when ? `Added ${code}. Issued (saved) ${when}.` : `Added ${code}.`);
      } else {
        toast.message('That code already exists.');
      }
      setSingleCoupon('');
      setSingleCouponUnlimited(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add coupon');
    } finally {
      setAddCouponsBusy(false);
    }
  };

  const addBulkCouponsManually = async () => {
    const codes = parseBulkCouponInput(bulkCouponText);
    if (!codes.length) {
      toast.error('Paste codes: one per line, or separate with commas or spaces.');
      return;
    }
    setAddCouponsBusy(true);
    try {
      let inserted = 0;
      const chunkSize = 50;
      for (let i = 0; i < codes.length; i += chunkSize) {
        const chunk = codes.slice(i, i + chunkSize);
        const r = await insertCouponCodes(chunk, bulkCouponUnlimited);
        inserted += r.inserted;
      }
      const s = await refreshCouponInventoryMeta();
      const when = s?.coupon_inventory_saved_at ? formatIssued(s.coupon_inventory_saved_at) : '';
      const dup = codes.length - inserted;
      if (inserted > 0) {
        toast.success(
          when
            ? `Issued ${inserted} new code${inserted === 1 ? '' : 's'}. Saved ${when}.${dup ? ` ${dup} duplicate(s) skipped.` : ''}`
            : `Issued ${inserted} new code${inserted === 1 ? '' : 's'}.${dup ? ` ${dup} duplicate(s) skipped.` : ''}`,
        );
      } else {
        toast.message(`No new codes (${dup} already in the database).`);
      }
      setBulkCouponText('');
      setBulkCouponUnlimited(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add coupons');
    } finally {
      setAddCouponsBusy(false);
    }
  };

  const removeUnusedLegacyFndCoupons = async () => {
    if (
      !window.confirm(
        'Remove all unused coupons whose code starts with FND? Codes that were already used for a spin stay in the database.',
      )
    ) {
      return;
    }
    setRemoveLegacyBusy(true);
    try {
      const { deleted } = await deleteUnusedCouponCodes({ prefix: 'FND' });
      await refreshCouponInventoryMeta();
      toast.success(`Removed ${deleted} unused FND coupon row${deleted === 1 ? '' : 's'}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove coupons');
    } finally {
      setRemoveLegacyBusy(false);
    }
  };

  const purgeAllFndCoupons = async () => {
    if (
      !window.confirm(
        'Remove every coupon whose code starts with FND, including ones already used? Submissions will still show the old coupon text, but those codes will no longer exist in the coupon list.',
      )
    ) {
      return;
    }
    if (
      !window.confirm('This cannot be undone. Delete ALL FND coupons from the database now?')
    ) {
      return;
    }
    setPurgeFndBusy(true);
    try {
      const { deleted } = await deleteUnusedCouponCodes({ prefix: 'FND', includeUsed: true });
      await refreshCouponInventoryMeta();
      toast.success(`Removed ${deleted} FND coupon row${deleted === 1 ? '' : 's'} (unused and used).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove coupons');
    } finally {
      setPurgeFndBusy(false);
    }
  };

  /** While Coupons tab is open, keep lists in sync when codes are redeemed on the site. */
  useEffect(() => {
    if (loading || adminTab !== 'coupons') return;

    const syncCouponsTab = async () => {
      try {
        await refreshCouponsFromDb();
      } catch {
        /* fetchAll or next poll will surface errors */
      }
    };

    void syncCouponsTab();
    const interval = window.setInterval(() => {
      void (async () => {
        try {
          await refreshCouponsFromDb();
        } catch {
          /* ignore transient errors while polling */
        }
      })();
    }, 8000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncCouponsTab();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [adminTab, loading]);

  const updateRewardRow = async (id: string, updates: Partial<Reward>): Promise<boolean> => {
    try {
      await updateReward(id, updates as Record<string, string | number | boolean | null>);
      toast.success('Updated');
      fetchAll();
      return true;
    } catch {
      toast.error('Failed to update');
      return false;
    }
  };

  const setRewardDraftField = <K extends keyof RewardDraft>(rewardId: string, key: K, value: RewardDraft[K]) => {
    setRewardDrafts((prev) => ({
      ...prev,
      [rewardId]: {
        ...(prev[rewardId] ?? {
          title: '',
          description: '',
          image_url: null,
          probability: '0',
          stock: '0',
          enabled: true,
          content: '',
          sub_content: '',
        }),
        [key]: value,
      },
    }));
  };

  const saveRewardDraft = async (rewardId: string) => {
    const d = rewardDrafts[rewardId];
    if (!d) return;
    setSavingRewardById((prev) => ({ ...prev, [rewardId]: true }));
    try {
      const ok = await updateRewardRow(rewardId, {
        title: d.title,
        description: d.description || null,
        image_url: d.image_url,
        probability: parseInt(d.probability, 10) || 0,
        stock: parseInt(d.stock, 10) || 0,
        enabled: d.enabled,
        content: d.content || null,
        sub_content: d.sub_content || null,
      });
      if (ok) toast.success('Reward saved.');
    } finally {
      setSavingRewardById((prev) => ({ ...prev, [rewardId]: false }));
    }
  };

  const updateSettings = async () => {
    if (!settings) return;
    const wheelSize = parseInt(settingsDraft.wheel_image_size, 10) || 28;
    const updates: Record<string, string | number | boolean | null> = {
      spin_enabled: settingsDraft.spin_enabled,
      coupon_validity_text: settingsDraft.coupon_validity_text || null,
      coupon_valid_until: settingsDraft.coupon_valid_until_local
        ? new Date(settingsDraft.coupon_valid_until_local).toISOString()
        : null,
      wheel_image_size: Math.max(12, Math.min(96, wheelSize)),
    };
    setSavingSettings(true);
    try {
      await updateCampaignSettings(settings.id, updates);
      toast.success('Settings updated');
      await fetchAll();
    } catch {
      toast.error('Failed to update');
    } finally {
      setSavingSettings(false);
    }
  };

  const saveWheelImageSizeFromRewards = async () => {
    if (!settings) return;
    const size = Math.max(12, Math.min(96, parseInt(settingsDraft.wheel_image_size, 10) || 28));
    setSavingWheelSize(true);
    try {
      await updateCampaignSettings(settings.id, { wheel_image_size: size });
      toast.success('Wheel image size updated');
      await fetchAll();
    } catch {
      toast.error('Failed to update wheel image size');
    } finally {
      setSavingWheelSize(false);
    }
  };

  const uploadRewardImage = async (rewardId: string, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image too large. Use a file under 2 MB.');
      return;
    }

    setImageUploadBusyByReward((prev) => ({ ...prev, [rewardId]: true }));
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read image file'));
        reader.readAsDataURL(file);
      });
      if (!dataUrl) throw new Error('Image read failed');
      setRewardDraftField(rewardId, 'image_url', dataUrl);
      toast.success('Image selected. Click Save reward to apply.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Image upload failed');
    } finally {
      setImageUploadBusyByReward((prev) => ({ ...prev, [rewardId]: false }));
    }
  };

  const removeRewardImage = async (rewardId: string) => {
    setImageUploadBusyByReward((prev) => ({ ...prev, [rewardId]: true }));
    try {
      setRewardDraftField(rewardId, 'image_url', null);
      toast.success('Image removed in draft. Click Save reward to apply.');
    } catch {
      toast.error('Could not remove image');
    } finally {
      setImageUploadBusyByReward((prev) => ({ ...prev, [rewardId]: false }));
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Phone', 'Coupon', 'PIN', 'Verified', 'Reward', 'Date'];
    const rows = submissions.map(s => [
      s.name || '', s.phone, s.coupon_code || '', s.pin_code || '', s.otp_verified ? 'Yes' : 'No', s.reward_title || '',
      new Date(s.created_at).toLocaleString(),
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'fondly-submissions.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCouponsCsv = () => {
    if (!coupons.length) {
      toast.error('No coupons to export.');
      return;
    }
    const headers = ['code', 'type', 'issued_at', 'used', 'used_at'];
    const rows = coupons.map((c) => [
      c.code,
      c.unlimited ? 'unlimited' : 'single-use',
      c.created_at || '',
      c.used ? 'yes' : 'no',
      c.used_at || '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'fondly-coupon-codes.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Download started');
  };

  const filteredSubmissions = filterReward
    ? submissions.filter(s => s.reward_title?.toLowerCase().includes(filterReward.toLowerCase()))
    : submissions;

  const totalSpins = submissions.length;
  const couponsUsed = coupons.filter(c => c.used).length;
  const couponsAvailable = coupons.filter((c) => !c.used).length;
  const sortByCode = (a: CouponRow, b: CouponRow) => a.code.localeCompare(b.code);
  const availableCouponRows = coupons.filter((c) => !c.used).sort(sortByCode);
  const usedCouponRows = coupons.filter((c) => c.used).sort(sortByCode);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-2xl text-gold">Fondly Admin</h1>
            <p className="text-xs text-muted-foreground mt-1">Campaign Management</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => { sessionStorage.removeItem('fondly_admin'); navigate('/admin-login'); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total spins</p><p className="text-2xl font-serif text-gold">{totalSpins}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Coupons used</p><p className="text-2xl font-serif text-gold">{couponsUsed}</p><p className="text-[10px] text-muted-foreground mt-1">of {coupons.length} issued</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active rewards</p><p className="text-2xl font-serif text-gold">{rewards.filter(r => r.enabled).length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Spin status</p><p className="text-2xl font-serif text-gold">{settings?.spin_enabled ? 'Active' : 'Paused'}</p></CardContent></Card>
        </div>

        <Tabs value={adminTab} onValueChange={setAdminTab}>
          <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="rewards" className="gap-1"><Gift className="w-3 h-3" /> Rewards</TabsTrigger>
            <TabsTrigger value="coupons" className="gap-1"><Ticket className="w-3 h-3" /> Coupons</TabsTrigger>
            <TabsTrigger value="users" className="gap-1"><Users className="w-3 h-3" /> Users</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1"><Settings className="w-3 h-3" /> Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="rewards">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reward management</CardTitle>
                <CardDescription>
                  Title + short description for lists and the wheel. <strong>Main text</strong> and <strong>Sub text</strong> are the long prize copy on the reward screen after a spin.
                </CardDescription>
                <div className="flex flex-wrap items-end gap-2 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Wheel image width / height (px)</Label>
                    <Input
                      type="number"
                      min={12}
                      max={96}
                      className="w-28"
                      value={settingsDraft.wheel_image_size}
                      onChange={(e) => setSettingsDraft((prev) => ({ ...prev, wheel_image_size: e.target.value }))}
                    />
                  </div>
                  <Button type="button" size="sm" onClick={() => void saveWheelImageSizeFromRewards()} disabled={savingWheelSize}>
                    {savingWheelSize ? 'Saving…' : 'Save image size'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {rewards.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border p-4 space-y-4">
                    <div className="flex flex-wrap items-start gap-4">
                      {r.image_url ? (
                        <img src={r.image_url} alt="" className="w-14 h-14 rounded-full object-cover border border-border shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-secondary border border-dashed border-border shrink-0" />
                      )}
                      <div className="flex-1 min-w-[200px] grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Title</Label>
                          <Input
                            value={rewardDrafts[r.id]?.title ?? r.title}
                            onChange={(e) => setRewardDraftField(r.id, 'title', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Short description</Label>
                          <Input
                            value={rewardDrafts[r.id]?.description ?? (r.description || '')}
                            onChange={(e) => setRewardDraftField(r.id, 'description', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Reward image (upload from device)</Label>
                        {(rewardDrafts[r.id]?.image_url ?? r.image_url) ? (
                          <div className="flex items-center gap-3">
                            <img src={(rewardDrafts[r.id]?.image_url ?? r.image_url) || ''} alt="" className="w-11 h-11 rounded-full object-cover border border-border" />
                            <span className="text-[11px] text-muted-foreground">Image uploaded</span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">No image uploaded. Spin wheel will show gift icon.</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            className="text-xs max-w-[260px]"
                            disabled={Boolean(imageUploadBusyByReward[r.id])}
                            onChange={(e) => {
                              const f = e.target.files?.[0] || null;
                              void uploadRewardImage(r.id, f);
                              e.currentTarget.value = '';
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!(rewardDrafts[r.id]?.image_url ?? r.image_url) || Boolean(imageUploadBusyByReward[r.id])}
                            onClick={() => void removeRewardImage(r.id)}
                          >
                            Delete image
                          </Button>
                        </div>
                        {imageUploadBusyByReward[r.id] ? (
                          <p className="text-[10px] text-muted-foreground">Saving image…</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Possibility %</Label>
                          <Input
                            type="number"
                            className="w-24"
                            value={rewardDrafts[r.id]?.probability ?? String(r.probability)}
                            title="Spin chance percentage. Higher value means more likely."
                            onChange={(e) => setRewardDraftField(r.id, 'probability', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Stock</Label>
                          <Input
                            type="number"
                            className="w-24"
                            value={rewardDrafts[r.id]?.stock ?? String(r.stock)}
                            onChange={(e) => setRewardDraftField(r.id, 'stock', e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-2 pb-1">
                          <Switch
                            checked={rewardDrafts[r.id]?.enabled ?? r.enabled}
                            onCheckedChange={(val) => setRewardDraftField(r.id, 'enabled', val)}
                          />
                          <span className="text-xs text-muted-foreground">Enabled</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Main reward text (long, optional)</Label>
                      <Textarea
                        rows={4}
                        className="text-sm resize-y min-h-[88px]"
                        value={rewardDrafts[r.id]?.content ?? (r.content || '')}
                        placeholder="Shown as the main body on the prize screen after spin…"
                        onChange={(e) => setRewardDraftField(r.id, 'content', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Sub text / fine print (optional)</Label>
                      <Textarea
                        rows={3}
                        className="text-sm resize-y min-h-[72px]"
                        value={rewardDrafts[r.id]?.sub_content ?? (r.sub_content || '')}
                        placeholder="Smaller text under the main body (terms, delivery note, etc.)"
                        onChange={(e) => setRewardDraftField(r.id, 'sub_content', e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" size="sm" onClick={() => void saveRewardDraft(r.id)} disabled={Boolean(savingRewardById[r.id])}>
                        {savingRewardById[r.id] ? 'Saving…' : 'Save reward'}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coupons">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">Coupon codes</CardTitle>
                    <CardDescription className="mt-1 text-xs max-w-xl">
                      <span className="text-muted-foreground">Last coupon save (add / remove / sync):</span>{' '}
                      <span className="text-foreground font-medium tabular-nums">
                        {settings?.coupon_inventory_saved_at ? formatIssued(settings.coupon_inventory_saved_at) : '—'}
                      </span>
                      <span className="block mt-1 text-muted-foreground">
                        Issue codes below; each row shows when that code was added. CSV export includes issued date.
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={resyncCampaignCoupons} disabled={couponBusy}>
                      {couponBusy ? 'Syncing…' : 'Sync from file'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadCouponsCsv} disabled={!coupons.length}>
                      <Download className="w-4 h-4 mr-1" /> Download CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border border-border bg-muted/20 p-4 space-y-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gold/90">Manual coupon creation</p>
                    <p className="text-sm font-medium text-foreground mt-1">Issue new coupons</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Create codes in the database: one at a time, or a bulk list (line breaks, commas, or spaces). You can
                      mark new codes as unlimited, so the same code can be used by unlimited users.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Add one code</Label>
                      <Input
                        className="font-mono text-sm uppercase"
                        placeholder="e.g. FD7K2A"
                        value={singleCoupon}
                        onChange={(e) => setSingleCoupon(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void addSingleCouponManually();
                        }}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground pb-2">
                      <Switch checked={singleCouponUnlimited} onCheckedChange={setSingleCouponUnlimited} />
                      Unlimited use
                    </label>
                    <Button type="button" onClick={() => void addSingleCouponManually()} disabled={addCouponsBusy}>
                      {addCouponsBusy ? 'Saving…' : 'Issue one'}
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Bulk issue (paste list)</Label>
                    <Textarea
                      rows={6}
                      className="font-mono text-xs resize-y min-h-[120px]"
                      placeholder={'FD7K2A, FD9X4M, FD3Q8L\nor one per line…'}
                      value={bulkCouponText}
                      onChange={(e) => setBulkCouponText(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground pr-2">
                        <Switch checked={bulkCouponUnlimited} onCheckedChange={setBulkCouponUnlimited} />
                        Unlimited use
                      </label>
                      <Button type="button" variant="secondary" onClick={() => void addBulkCouponsManually()} disabled={addCouponsBusy}>
                        {addCouponsBusy ? 'Saving…' : 'Issue all from list'}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => void removeUnusedLegacyFndCoupons()}
                        disabled={removeLegacyBusy || purgeFndBusy}
                      >
                        {removeLegacyBusy ? 'Removing…' : 'Remove unused FND… codes'}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="border-destructive/80 bg-destructive/90"
                        onClick={() => void purgeAllFndCoupons()}
                        disabled={purgeFndBusy || removeLegacyBusy}
                      >
                        {purgeFndBusy ? 'Purging…' : 'Remove ALL FND coupons'}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium text-emerald-400/95">Not used</h3>
                      <Badge variant="outline" className="font-sans border-emerald-600/50 bg-emerald-950/30 text-emerald-200">
                        {couponsAvailable}
                      </Badge>
                    </div>
                    <div className="max-h-[min(60vh,520px)] overflow-y-auto border border-border rounded-sm">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead className="whitespace-nowrap">Type</TableHead>
                            <TableHead className="whitespace-nowrap">Issued</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availableCouponRows.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-xs text-muted-foreground">
                                No unused codes.
                              </TableCell>
                            </TableRow>
                          ) : (
                            availableCouponRows.map((c) => (
                              <TableRow key={c.id}>
                                <TableCell className="font-mono text-xs">{c.code}</TableCell>
                                <TableCell className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {c.unlimited ? 'Unlimited' : 'Single'}
                                </TableCell>
                                <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap tabular-nums">
                                  {formatIssued(c.created_at)}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Used</h3>
                      <Badge variant="secondary" className="font-sans">
                        {couponsUsed}
                      </Badge>
                    </div>
                    <div className="max-h-[min(60vh,520px)] overflow-y-auto border border-border rounded-sm">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead className="whitespace-nowrap">Type</TableHead>
                            <TableHead className="whitespace-nowrap">Issued</TableHead>
                            <TableHead className="whitespace-nowrap">Used at</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {usedCouponRows.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-xs text-muted-foreground">
                                No used codes yet.
                              </TableCell>
                            </TableRow>
                          ) : (
                            usedCouponRows.map((c) => (
                              <TableRow key={c.id}>
                                <TableCell className="font-mono text-xs">{c.code}</TableCell>
                                <TableCell className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {c.unlimited ? 'Unlimited' : 'Single'}
                                </TableCell>
                                <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap tabular-nums">
                                  {formatIssued(c.created_at)}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                                  {c.used_at ? formatIssued(c.used_at) : '—'}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="text-lg">User submissions</CardTitle>
                    <CardDescription>{filteredSubmissions.length} entries</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Filter by reward…" className="w-48" value={filterReward} onChange={e => setFilterReward(e.target.value)} />
                    <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> CSV</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Coupon</TableHead>
                      <TableHead>PIN</TableHead>
                      <TableHead>Reward</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map(s => (
                      <TableRow key={s.id}>
                        <TableCell>{s.name || '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{s.phone}</TableCell>
                        <TableCell className="font-mono text-xs">{s.coupon_code || '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{s.pin_code || '—'}</TableCell>
                        <TableCell>{s.reward_title || '—'}</TableCell>
                        <TableCell className="text-xs">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Campaign settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Spin wheel</p><p className="text-xs text-muted-foreground">Enable or disable the spin globally</p></div>
                  <Switch
                    checked={settingsDraft.spin_enabled}
                    onCheckedChange={(val) => setSettingsDraft((prev) => ({ ...prev, spin_enabled: val }))}
                  />
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-sm">Coupon validity message (spin page + expiry response)</p>
                  <Input
                    value={settingsDraft.coupon_validity_text}
                    placeholder="Coupon validity ended on ..."
                    onChange={(e) => setSettingsDraft((prev) => ({ ...prev, coupon_validity_text: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-sm">Coupon valid until (date & time)</p>
                  <Input
                    type="datetime-local"
                    value={settingsDraft.coupon_valid_until_local}
                    onChange={(e) => setSettingsDraft((prev) => ({ ...prev, coupon_valid_until_local: e.target.value }))}
                  />
                </div>
                <div className="pt-2">
                  <Button type="button" onClick={() => void updateSettings()} disabled={savingSettings}>
                    {savingSettings ? 'Saving…' : 'Save settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;
