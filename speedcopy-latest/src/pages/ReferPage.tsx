import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import financeService from '../services/finance.service';

// Backend returns status: 'pending' | 'completed' | 'rewarded' | 'expired'
const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Invited',   color: '#f97316', bg: '#fff7ed' },
  completed: { label: 'Signed Up', color: '#3b82f6', bg: '#eff6ff' },
  rewarded:  { label: 'Rewarded',  color: '#16a34a', bg: '#dcfce7' },
  expired:   { label: 'Expired',   color: '#9ca3af', bg: '#f3f4f6' },
};

const AVATAR_COLORS = ['#6366f1', '#f97316', '#10b981', '#ec4899', '#3b82f6', '#8b5cf6'];

const formatDate = (iso: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatReward = (item: any) => {
  if (item.status === 'rewarded') return `₹${item.rewardAmount || 50}`;
  if (item.status === 'completed') return 'Pending';
  return '—';
};

const getInitials = (id: string) => id ? id.slice(-2).toUpperCase() : '??';

const ReferPage: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [referralHistory, setReferralHistory] = useState<any[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [allReferrals, setAllReferrals] = useState<any[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchReferralData();
  }, [isAuthenticated]);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      setError('');
      const summaryRes = await financeService.getReferralSummary();
      // Backend returns: { my_code, reward_per_friend, totals: { total_earned, pending_rewards, friends_joined, total_referrals }, recent_referrals }
      const data = summaryRes.data?.data || summaryRes.data || summaryRes;
      setSummary(data);
      setReferralHistory(data?.recent_referrals || []);
      setFilteredHistory(data?.recent_referrals || []);
    } catch (err: any) {
      console.error('Failed to fetch referral data:', err);
      // Show page with defaults instead of error screen
      setSummary({ my_code: 'SPEEDCOPY', reward_per_friend: 50, totals: { total_earned: 0, pending_rewards: 0, friends_joined: 0, total_referrals: 0 }, recent_referrals: [] });
      setReferralHistory([]);
      setFilteredHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const referralCode = summary?.my_code || '—';
  const rewardPerFriend = summary?.reward_per_friend || 50;
  const totals = summary?.totals || { total_earned: 0, pending_rewards: 0, friends_joined: 0 };
  const shareUrl = `${window.location.origin}/refer?code=${referralCode}`;

  const handleCopy = (text = referralCode) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const message = `Use my referral code ${referralCode} on SpeedCopy and get 20% off your first order: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleFilter = (status: string) => {
    setActiveFilter(status);
    setShowFilterMenu(false);
    const source = showAll ? allReferrals : referralHistory;
    if (status === 'all') {
      setFilteredHistory(source);
    } else {
      setFilteredHistory(source.filter(r => r.status === status));
    }
  };

  const handleViewAll = async () => {
    if (showAll) {
      // Collapse back to recent
      setShowAll(false);
      const filtered = activeFilter === 'all' ? referralHistory : referralHistory.filter(r => r.status === activeFilter);
      setFilteredHistory(filtered);
      return;
    }
    try {
      setLoadingAll(true);
      // Try to fetch all referrals from API
      const res = await financeService.getReferrals?.();
      const all: any[] = res?.data?.referrals || res?.data?.data || res?.data || [];
      if (all.length > 0) {
        setAllReferrals(all);
        const filtered = activeFilter === 'all' ? all : all.filter((r: any) => r.status === activeFilter);
        setFilteredHistory(filtered);
      } else {
        // Fallback: just show all recent_referrals already loaded
        setAllReferrals(referralHistory);
        setFilteredHistory(referralHistory);
      }
      setShowAll(true);
    } catch {
      // Fallback: show all already loaded
      setAllReferrals(referralHistory);
      setFilteredHistory(referralHistory);
      setShowAll(true);
    } finally {
      setLoadingAll(false);
    }
  };

  const handleExport = () => {
    const rows = [
      ['Friend', 'Date Invited', 'Status', 'Reward Earned'],
      ...filteredHistory.map(row => [
        row.referredId ? `Friend ${row.referredId.slice(-4).toUpperCase()}` : 'Invited',
        formatDate(row.createdAt),
        STATUS_MAP[row.status]?.label || row.status,
        formatReward(row),
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referrals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Login</h1>
          <p className="text-gray-600">You need to be logged in to access referral program</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="animate-pulse space-y-4">
            <div className="bg-white rounded-2xl h-64" />
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl h-28" />
              <div className="bg-white rounded-2xl h-28" />
              <div className="bg-white rounded-2xl h-28" />
            </div>
            <div className="bg-white rounded-2xl h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchReferralData}
            className="px-6 py-2.5 text-white font-bold rounded-full text-sm hover:bg-gray-700 transition"
            style={{ backgroundColor: '#111111' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Hero Section */}
        <div className="mb-10">
          <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] items-center" style={{ gap: '56px' }}>
            <div className="w-full max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5" style={{ backgroundColor: '#e5e7eb' }}>
                <svg className="w-3.5 h-3.5" style={{ color: '#4b5563' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
                </svg>
                <span className="text-xs font-extrabold tracking-wide uppercase" style={{ color: '#111827' }}>Referral Program</span>
              </div>

              <h1 className="font-bold text-slate-900 leading-none" style={{ fontSize: 'clamp(36px, 5vw, 56px)', letterSpacing: '-0.05em' }}>
                Invite Friends,
              </h1>
              <h1 className="font-bold leading-none mt-1 mb-4" style={{ fontSize: 'clamp(36px, 5vw, 56px)', letterSpacing: '-0.05em', background: 'linear-gradient(135deg, #ff6a3d 0%, #ff4d57 45%, #e633a8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Earn Rewards!
              </h1>

              <p className="text-slate-600 mb-8 max-w-lg" style={{ fontSize: '15px', lineHeight: '1.7' }}>
                Get <strong>₹{rewardPerFriend}</strong> for every friend who prints with us. They get <strong>20% off</strong> their first order!
              </p>

              {/* Referral Code Box */}
              <div className="bg-white rounded-[22px] p-5 mb-8" style={{ border: '1px solid #dbe5f1', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)', maxWidth: '440px' }}>
                <p className="text-sm font-semibold mb-4" style={{ color: '#94a3b8' }}>Your Unique Referral Code</p>
                <div className="flex items-center gap-2 rounded-[20px] p-2" style={{ border: '1.5px dashed #d8b4fe', backgroundColor: '#fff' }}>
                  <div className="flex-1 px-4 py-3">
                    <span className="font-semibold text-slate-800" style={{ fontSize: '15px', letterSpacing: '0.08em' }}>{referralCode}</span>
                  </div>
                  <button onClick={() => handleCopy()} className="flex items-center gap-2 px-6 py-3 text-white font-bold rounded-[18px] hover:opacity-90 transition flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #ff6a3d 0%, #ff4d57 55%, #e33cb1 100%)', boxShadow: '0 8px 22px rgba(255, 86, 94, 0.28)', fontSize: '14px' }}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Share buttons */}
              <div>
                <p className="text-base font-medium mb-4" style={{ color: '#94a3b8' }}>Share via:</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <button onClick={handleWhatsAppShare} className="flex items-center gap-2 px-4 py-2.5 text-white font-semibold rounded-2xl hover:opacity-90 transition" style={{ backgroundColor: '#25d366', fontSize: '13px' }}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    WhatsApp
                  </button>
                  <button onClick={() => handleCopy(shareUrl)} className="flex items-center gap-2 px-4 py-2.5 font-semibold rounded-2xl hover:bg-slate-100 transition"
                    style={{ backgroundColor: '#fff', color: '#475569', fontSize: '13px', border: '1px solid #dbe5f1' }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Link
                  </button>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="w-full">
              <div className="rounded-[26px] p-4 sm:p-5" style={{ background: 'linear-gradient(135deg, #feeae5 0%, #f4d6ef 100%)', boxShadow: '0 24px 48px rgba(233, 153, 190, 0.18)', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
                <div className="relative overflow-hidden mx-auto rounded-[18px]" style={{ minHeight: '320px', maxWidth: '410px', transform: 'rotate(2deg)', boxShadow: '0 24px 40px rgba(126, 66, 15, 0.18)' }}>
                  <img src="/image-optimized.jpg" alt="Referral hero" decoding="async" className="block w-full h-full" style={{ minHeight: '320px', objectFit: 'cover' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stat Cards — separate */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            {
              label: 'Total Earned',
              value: `₹${totals.total_earned?.toLocaleString('en-IN') || 0}`,
              sub: `${totals.friends_joined || 0} friends joined`,
              subColor: '#16a34a',
              iconColor: '#16a34a',
              iconBg: '#dcfce7',
              path: 'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2',
            },
            {
              label: 'Pending Rewards',
              value: `₹${totals.pending_rewards?.toLocaleString('en-IN') || 0}`,
              sub: 'Usually credited within 24h',
              subColor: '#9ca3af',
              iconColor: '#f97316',
              iconBg: '#ffedd5',
              path: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
            },
            {
              label: 'Friends Joined',
              value: String(totals.friends_joined || 0),
              sub: `${totals.total_referrals || 0} total invites sent`,
              subColor: '#9ca3af',
              iconColor: '#6b7280',
              iconBg: '#f3f4f6',
              path: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
            },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-2xl p-5" style={{ border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm text-gray-500">{c.label}</p>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.iconBg }}>
                  <svg className="w-5 h-5" style={{ color: c.iconColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={c.path} />
                  </svg>
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{c.value}</p>
              <p className="text-xs sm:text-sm font-medium" style={{ color: c.subColor }}>{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Referral History — separate card */}
        <div className="bg-white rounded-3xl p-7" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          {/* Referral History */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">Referral History</h3>
              <p className="text-xs sm:text-sm mt-0.5" style={{ color: '#9ca3af' }}>Track the status of your invites and earnings.</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <button
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-50 transition w-full"
                  style={{ border: `1px solid ${activeFilter !== 'all' ? '#111' : '#e5e7eb'}`, backgroundColor: activeFilter !== 'all' ? '#f3f4f6' : '#fff' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span>{activeFilter === 'all' ? 'Filter' : STATUS_MAP[activeFilter]?.label || activeFilter}</span>
                </button>
                {showFilterMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg z-10 py-1 min-w-[140px]" style={{ border: '1px solid #e5e7eb' }}>
                    {['all', 'pending', 'completed', 'rewarded', 'expired'].map(s => (
                      <button key={s} onClick={() => handleFilter(s)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition capitalize"
                        style={{ color: activeFilter === s ? '#111' : '#6b7280', fontWeight: activeFilter === s ? 700 : 400 }}>
                        {s === 'all' ? 'All' : STATUS_MAP[s]?.label || s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-white text-xs sm:text-sm font-bold hover:opacity-90 transition flex-1 sm:flex-initial"
                style={{ backgroundColor: '#111111' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </button>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden xl:block">
            <div className="grid px-3 pb-3 mb-1" style={{ gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr', borderBottom: '1px solid #f3f4f6' }}>
              {['FRIEND', 'DATE INVITED', 'STATUS', 'REWARD EARNED'].map((h, i) => (
                <p key={h} className={`text-xs font-bold tracking-widest ${i === 3 ? 'text-right' : ''}`} style={{ color: '#9ca3af' }}>{h}</p>
              ))}
            </div>

            {referralHistory.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-medium" style={{ color: '#9ca3af' }}>No referrals yet. Share your code to get started!</p>
              </div>
            ) : (
              filteredHistory.map((row, idx) => {
                const statusInfo = STATUS_MAP[row.status] || STATUS_MAP.pending;
                const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                const initials = row.referredId ? getInitials(row.referredId) : '??';
                const friendLabel = row.referredId ? `Friend ${row.referredId.slice(-4).toUpperCase()}` : 'Invited';
                const reward = formatReward(row);
                return (
                  <div key={row._id} className="grid items-center px-3 py-4 rounded-xl hover:bg-gray-50 transition"
                    style={{ gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr', borderBottom: idx < filteredHistory.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: avatarColor }}>{initials}</div>
                      <span className="font-medium text-gray-800 text-sm">{friendLabel}</span>
                    </div>
                    <p className="text-sm" style={{ color: '#6b7280' }}>{formatDate(row.createdAt)}</p>
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusInfo.color }} />
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className={`text-sm font-bold text-right ${reward === '—' ? 'text-gray-300' : 'text-gray-900'}`}>{reward}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* Mobile Cards */}
          <div className="xl:hidden space-y-3">
            {filteredHistory.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-medium" style={{ color: '#9ca3af' }}>No referrals yet. Share your code to get started!</p>
              </div>
            ) : (
              filteredHistory.map((row, idx) => {
                const statusInfo = STATUS_MAP[row.status] || STATUS_MAP.pending;
                const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                const initials = row.referredId ? getInitials(row.referredId) : '??';
                const friendLabel = row.referredId ? `Friend ${row.referredId.slice(-4).toUpperCase()}` : 'Invited';
                const reward = formatReward(row);
                return (
                  <div key={row._id} className="border rounded-xl p-4" style={{ borderColor: '#f3f4f6' }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: avatarColor }}>{initials}</div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{friendLabel}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{formatDate(row.createdAt)}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusInfo.color }} />
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #f3f4f6' }}>
                      <p className="text-xs font-medium" style={{ color: '#9ca3af' }}>Reward Earned</p>
                      <p className={`text-base font-bold ${reward === '—' ? 'text-gray-300' : 'text-gray-900'}`}>{reward}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="text-center mt-5">
            <button
              onClick={handleViewAll}
              disabled={loadingAll}
              className="text-sm font-semibold hover:opacity-70 transition disabled:opacity-40"
              style={{ color: '#7c3aed' }}
            >
              {loadingAll ? 'Loading...' : showAll ? 'Show Less ↑' : 'View All Referrals ↓'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReferPage;
