import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BackButton from '../components/BackButton';
import ticketService, { type Ticket, type TicketStatus } from '../services/ticket.service';

type TabType = 'FAQs' | 'My Tickets';

const categories = [
  {
    icon: (
      <svg className="w-6 h-6" style={{ color: '#374151' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8l2-2zM13 8h4l3 3v5h-7V8z" />
      </svg>
    ),
    title: 'Order Tracking',
    desc: 'Check your order status, track shipments, and manage delivery preferences in real-time.',
    route: '/faq/order-tracking',
  },
  {
    icon: (
      <svg className="w-6 h-6" style={{ color: '#374151' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    title: 'Payments & Refunds',
    desc: 'Manage your billing information, view invoices, or request a refund for eligible orders.',
    route: '/faq/payments',
  },
  {
    icon: (
      <svg className="w-6 h-6" style={{ color: '#374151' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Technical Support',
    desc: 'Experiencing issues with our editor? Get help with design tools, file uploads, and formatting.',
    route: '/faq/technical-support',
  },
];

const tabs: TabType[] = ['FAQs', 'My Tickets'];

// Status badge styling
const statusStyle: Record<TicketStatus, { bg: string; color: string; label: string }> = {
  open:        { bg: '#fef3c7', color: '#92400e', label: 'Open' },
  in_progress: { bg: '#dbeafe', color: '#1e40af', label: 'In Progress' },
  resolved:    { bg: '#d1fae5', color: '#065f46', label: 'Resolved' },
  closed:      { bg: '#f3f4f6', color: '#6b7280', label: 'Closed' },
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const shortId = (id: string) => `#SC-${id.slice(-6).toUpperCase()}`;

// ─── Ticket Row (desktop) ────────────────────────────────────────────────────
const TicketRow: React.FC<{ ticket: Ticket; idx: number; total: number; onView: (id: string) => void }> = ({ ticket, idx, total, onView }) => {
  const s = statusStyle[ticket.status] ?? statusStyle.open;
  return (
    <div
      className="grid items-center px-3 py-4 rounded-xl hover:bg-gray-50 transition"
      style={{ gridTemplateColumns: '1fr 2.5fr 1.2fr 1.2fr 0.6fr', borderBottom: idx < total - 1 ? '1px solid #f9fafb' : 'none' }}
    >
      <p className="font-bold text-gray-800" style={{ fontSize: '13px' }}>{shortId(ticket._id)}</p>
      <p className="text-sm text-gray-700 truncate pr-2">{ticket.subject}</p>
      <div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: s.bg, color: s.color }}>
          {s.label}
        </span>
      </div>
      <p className="text-sm" style={{ color: '#9ca3af' }}>{formatDate(ticket.updatedAt)}</p>
      <div className="text-right">
        <button
          onClick={() => onView(ticket._id)}
          className="text-sm font-bold hover:opacity-60 transition"
          style={{ color: '#374151' }}
        >
          View
        </button>
      </div>
    </div>
  );
};

// ─── Ticket Card (mobile) ────────────────────────────────────────────────────
const TicketCard: React.FC<{ ticket: Ticket; onView: (id: string) => void }> = ({ ticket, onView }) => {
  const s = statusStyle[ticket.status] ?? statusStyle.open;
  return (
    <div className="border rounded-xl p-4" style={{ borderColor: '#f3f4f6' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-gray-800 text-sm mb-1">{shortId(ticket._id)}</p>
          <p className="text-sm text-gray-700">{ticket.subject}</p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2" style={{ backgroundColor: s.bg, color: s.color }}>
          {s.label}
        </span>
      </div>
      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #f3f4f6' }}>
        <p className="text-xs" style={{ color: '#9ca3af' }}>{formatDate(ticket.updatedAt)}</p>
        <button
          onClick={() => onView(ticket._id)}
          className="text-sm font-bold hover:opacity-60 transition"
          style={{ color: '#374151', minHeight: '44px', padding: '8px 16px' }}
        >
          View
        </button>
      </div>
    </div>
  );
};

// ─── Table Header ────────────────────────────────────────────────────────────
const TableHeader: React.FC = () => (
  <div className="grid px-3 pb-3 mb-1" style={{ gridTemplateColumns: '1fr 2.5fr 1.2fr 1.2fr 0.6fr', borderBottom: '1px solid #f3f4f6' }}>
    {['TICKET ID', 'SUBJECT', 'STATUS', 'LAST UPDATE', 'ACTION'].map((h, i) => (
      <p key={h} className={`text-xs font-bold tracking-widest ${i === 4 ? 'text-right' : ''}`} style={{ color: '#9ca3af' }}>{h}</p>
    ))}
  </div>
);

// ─── Main Page ───────────────────────────────────────────────────────────────
const HelpPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('FAQs');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Load recent tickets for FAQs tab via summary
  useEffect(() => {
    fetchRecentTickets();
  }, []);

  // Load full list when My Tickets tab is opened
  useEffect(() => {
    if (activeTab === 'My Tickets') {
      fetchTickets();
    }
  }, [activeTab]);

  const fetchRecentTickets = async () => {
    try {
      const res = await ticketService.getTicketSummary();
      const recent = res?.data?.recent_tickets;
      setRecentTickets(Array.isArray(recent) ? recent : []);
    } catch {
      setRecentTickets([]);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await ticketService.getMyTickets({ limit: 50 });
      // Backend returns { success, data: { tickets: [...], meta: {...} } }
      const list = res?.data?.tickets;
      setTickets(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (id: string) => {
    navigate(`/support/ticket/${id}`);
  };

  return (
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <BackButton label="Back" className="mb-6" />

        {/* Hero Banner */}
        <div
          className="rounded-2xl sm:rounded-3xl px-4 sm:px-8 py-8 sm:py-16 text-center mb-6"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)' }}
        >
          <div className="inline-flex items-center px-3 sm:px-4 py-1.5 rounded-full mb-4 sm:mb-5"
            style={{ border: '1px solid rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <p className="text-white text-xs font-bold tracking-widest uppercase">SPEEDCOPY HELP CENTER</p>
          </div>
          <h1 className="font-bold text-white mb-3 sm:mb-4 text-2xl sm:text-4xl lg:text-5xl">How can we help you?</h1>
          <p className="text-white/80 text-sm sm:text-base max-w-lg mx-auto leading-relaxed px-2">
            Search our knowledge base or browse categories below to find answers to your questions.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-4 sm:gap-8 mb-6 bg-white rounded-2xl px-4 sm:px-6 py-1" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="py-3 sm:py-4 text-xs sm:text-sm font-semibold transition relative"
              style={{ color: activeTab === tab ? '#111111' : '#9ca3af' }}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: '#111111' }} />
              )}
            </button>
          ))}
        </div>

        {/* ── FAQs Tab ── */}
        {activeTab === 'FAQs' && (
          <>
            {/* Category Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
              {categories.map(cat => (
                <div
                  key={cat.title}
                  onClick={() => navigate(cat.route)}
                  className="bg-white rounded-2xl p-6 cursor-pointer hover:shadow-lg transition"
                  style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#f3f4f6' }}>
                    {cat.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2" style={{ fontSize: '15px' }}>{cat.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>{cat.desc}</p>
                </div>
              ))}
            </div>

            {/* Immediate Help Banner */}
            <div className="rounded-2xl px-4 sm:px-7 py-6 sm:py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
              <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#111111' }}>
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 3H3c-1.1 0-2 .9-2 2v14l4-4h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-white text-base sm:text-lg">Need Immediate Help?</p>
                  <p className="text-white text-xs sm:text-sm mt-1" style={{ opacity: 0.9 }}>Our support champions are available 24/7. Connect via live chat for a quick resolution.</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/support/ticket')}
                className="w-full sm:w-auto flex-shrink-0 px-6 sm:px-7 py-3 sm:py-3.5 font-bold rounded-xl hover:bg-gray-700 transition text-sm"
                style={{ backgroundColor: '#111111', color: '#fff', minHeight: '44px' }}
              >
                Raise a Ticket
              </button>
            </div>

            {/* Recent Tickets */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-5 gap-2">
                <h2 className="font-bold text-gray-900 text-sm sm:text-base">Recent Support Tickets</h2>
                <button
                  onClick={() => setActiveTab('My Tickets')}
                  className="text-xs sm:text-sm font-semibold hover:opacity-70 transition whitespace-nowrap"
                  style={{ color: '#6366f1' }}
                >
                  View All
                </button>
              </div>
              {recentTickets.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No recent tickets</p>
              ) : (
                <>
                  <div className="hidden xl:block">
                    <TableHeader />
                    {recentTickets.map((t, idx) => (
                      <TicketRow key={t._id} ticket={t} idx={idx} total={recentTickets.length} onView={handleView} />
                    ))}
                  </div>
                  <div className="xl:hidden space-y-3">
                    {recentTickets.map(t => (
                      <TicketCard key={t._id} ticket={t} onView={handleView} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ── My Tickets Tab ── */}
        {activeTab === 'My Tickets' && (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-5 gap-2">
              <h2 className="font-bold text-gray-900 text-sm sm:text-base">My Support Tickets</h2>
              <button
                onClick={() => navigate('/support/ticket')}
                className="px-3 sm:px-4 py-2 text-white font-bold rounded-full text-xs hover:bg-gray-700 transition whitespace-nowrap"
                style={{ backgroundColor: '#111111', minHeight: '44px' }}
              >
                + New Ticket
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-10">
                <svg className="w-12 h-12 mx-auto mb-3" style={{ color: '#d1d5db' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 font-medium mb-1">No support tickets yet</p>
                <p className="text-xs text-gray-400 mb-4">Raise a ticket if you need help with an order or issue.</p>
                <button
                  onClick={() => navigate('/support/ticket')}
                  className="px-6 py-2.5 text-white font-bold rounded-full text-sm hover:bg-gray-700 transition"
                  style={{ backgroundColor: '#111111' }}
                >
                  Raise a Ticket
                </button>
              </div>
            ) : (
              <>
                <div className="hidden xl:block">
                  <TableHeader />
                  {tickets.map((t, idx) => (
                    <TicketRow key={t._id} ticket={t} idx={idx} total={tickets.length} onView={handleView} />
                  ))}
                </div>
                <div className="xl:hidden space-y-3">
                  {tickets.map(t => (
                    <TicketCard key={t._id} ticket={t} onView={handleView} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default HelpPage;
