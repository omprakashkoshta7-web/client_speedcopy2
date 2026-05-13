import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Bell,
  Building2,
  CalendarCheck,
  ChevronDown,
  ClipboardList,
  CreditCard,
  HeadphonesIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Printer,
  Search,
  Shield,
  Star,
  Store,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { clearAuthToken } from "../../services/api";
import { clearVendorSession, getVendorSession } from "../../services/session";
import { logoutFirebase, syncVendorAuthSession } from "../../services/firebase-auth";
import type { VendorSession } from "../../types/vendor";
import { notificationService, type PortalNotification } from "../../services/notification.service";

const navGroups = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", permissions: ["view_all"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/orders", icon: ClipboardList, label: "Job Queue", permissions: ["view_all", "view_assigned"] },
      { to: "/production", icon: Printer, label: "Production", permissions: ["view_all", "edit_production"] },
    ],
  },
  {
    label: "Network",
    items: [
      { to: "/stores", icon: Store, label: "Stores", permissions: ["view_all", "store_management"] },
      { to: "/staff", icon: Users, label: "Staff", permissions: ["user_management", "staff_management"] },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/earnings", icon: Wallet, label: "Earnings", permissions: ["financial_access"] },
      { to: "/closure", icon: CalendarCheck, label: "Closure", permissions: ["financial_access"] },
      { to: "/payouts", icon: CreditCard, label: "Payouts", permissions: ["financial_access"] },
    ],
  },
  {
    label: "Control",
    items: [
      { to: "/score", icon: Star, label: "Vendor Score", permissions: ["view_all"] },
      { to: "/org", icon: Building2, label: "Org Profile", permissions: ["org_settings", "view_all"] },
      { to: "/support", icon: HeadphonesIcon, label: "Support", permissions: ["view_all"] },
    ],
  },
];

const routeMeta = [
  { match: "/dashboard", title: "Dashboard", caption: "Vendor performance overview and key metrics." },
  { match: "/orders", title: "Job Queue", caption: "Live vendor queue backed by backend order data." },
  { match: "/production", title: "Production", caption: "Move accepted jobs through production states." },
  { match: "/stores", title: "Stores", caption: "Store availability and capacity synced with backend." },
  { match: "/staff", title: "Staff", caption: "Manage vendor team and activation status." },
  { match: "/earnings", title: "Earnings", caption: "Revenue, wallet balance and store performance." },
  { match: "/closure", title: "Closure", caption: "Daily, weekly and monthly earning closures." },
  { match: "/payouts", title: "Payouts", caption: "Payout history, schedule and wallet balance." },
  { match: "/score", title: "Vendor Score", caption: "Performance score, metrics and order closure." },
  { match: "/org", title: "Org Profile", caption: "Vendor organization profile and bank details." },
  { match: "/support", title: "Support", caption: "Raise and manage support tickets." },
];

export default function VendorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<VendorSession | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [notifCategory, setNotifCategory] = useState<string>("all");
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const currentSession = getVendorSession();
    if (!currentSession) {
      navigate("/login", { replace: true });
      return;
    }

    // Use a microtask to avoid calling setState synchronously inside the effect body
    const timer = setTimeout(() => setSession(currentSession), 0);

    const unsubscribe = syncVendorAuthSession(() => {
      setSession(null);
      navigate("/login", { replace: true });
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      try {
        // Fetch list and summary in parallel
        const [listResult, summaryResult] = await Promise.allSettled([
          notificationService.getList({ limit: 20 }),
          notificationService.getSummary(),
        ]);
        if (!active) return;

        // Handle list response
        if (listResult.status === "fulfilled") {
          const listData = (listResult.value as any)?.data ?? listResult.value;
          setNotifications(listData.notifications || []);
        }

        // Handle summary response
        if (summaryResult.status === "fulfilled") {
          const summaryData = (summaryResult.value as any)?.data ?? summaryResult.value;
          setUnreadCount(summaryData.unread_count || 0);
          setCategoryCounts(summaryData.category_counts || {});
        } else if (listResult.status === "fulfilled") {
          // Fallback: compute unread count from list
          const listData = (listResult.value as any)?.data ?? listResult.value;
          const notifs: PortalNotification[] = listData.notifications || [];
          setUnreadCount(notifs.filter(n => !n.isRead).length);
        }
      } catch {
        // Notification endpoint not available — silent fail
        if (!active) return;
        setUnreadCount(0);
        setNotifications([]);
        setCategoryCounts({});
      }
    };

    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  async function handleLogout() {
    await logoutFirebase().catch(() => {
      clearAuthToken();
      clearVendorSession();
    });
    navigate("/login", { replace: true });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/orders?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  const formatTimestamp = (value?: string) =>
    value
      ? new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
      : "";

  const handleMarkAllRead = async () => {
    if (markingAllRead || unreadCount === 0) return;
    setMarkingAllRead(true);
    // Optimistic update — mark locally regardless of backend
    setNotifications(cur => cur.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationService.markAllRead();
    } catch { /* endpoint may not exist yet */ }
    finally { setMarkingAllRead(false); }
  };

  const handleMarkOneRead = async (id: string) => {
    // Optimistic update
    setNotifications(cur => cur.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount(cur => Math.max(0, cur - 1));
    try {
      await notificationService.markRead(id);
    } catch { /* endpoint may not exist yet */ }
  };

  const getCategoryIcon = (category: string) => {
    const map: Record<string, string> = {
      order: "📦", orders: "📦", payment: "💰", rewards: "🎁",
      system: "⚙️", alert: "🔔", support: "🎧", account: "👤", promotions: "🎉",
    };
    return map[category?.toLowerCase()] || "🔔";
  };

  const filteredNotifications = notifCategory === "all"
    ? notifications
    : notifications.filter(n => n.category === notifCategory);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6fa]">
        <div className="text-center">
          <Shield size={40} className="mx-auto mb-3 text-gray-400" />
          <p className="text-sm text-gray-500">Loading vendor session...</p>
        </div>
      </div>
    );
  }

  const isOwnerSession =
    session.role?.toLowerCase() === "owner" ||
    session.permissions?.includes("view_all") ||
    session.permissions?.includes("edit_all");

  const filteredNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (isOwnerSession || !session.permissions || session.permissions.length === 0) {
          return true;
        }
        return item.permissions.some((permission) => session.permissions.includes(permission));
      }),
    }))
    .filter((group) => group.items.length > 0);

  const page = routeMeta.find((item) => location.pathname.startsWith(item.match)) ?? routeMeta[0];

  return (
    <div className="admin-app-shell h-screen p-2 sm:p-3 md:p-4">
      <div className="admin-frame flex h-[calc(100vh-1rem)] rounded-[24px] sm:h-[calc(100vh-1.5rem)] sm:rounded-[34px] md:h-[calc(100vh-2rem)]">
        {/* Desktop Sidebar */}
        <aside className="admin-sidebar hidden w-[236px] flex-shrink-0 lg:flex lg:flex-col overflow-hidden">
          <div className="px-5 pb-6 pt-8">
            <div className="flex items-center gap-2">
              <h1 className="text-[2.2rem] font-black lowercase leading-none tracking-tight text-white">
                SpeedCopy
              </h1>
            </div>
            <p className="mt-2 pl-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-[#a99f93]">
              Vendor portal
            </p>
          </div>

          <div className="mx-5 h-px bg-violet-200/30" />

          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <div className="space-y-5">
              {filteredNavGroups.map((group) => (
                <div key={group.label}>
                  <p className="px-4 pb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white/35">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map(({ to, icon: Icon, label }) => (
                      <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                            isActive ? "admin-nav-active" : "admin-nav-idle hover:bg-white/5 hover:text-white"
                          }`
                        }
                      >
                        <Icon size={15} />
                        <span>{label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          <div className="px-4 pb-5">
            <button 
              onClick={handleLogout} 
              className="flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
              }}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {showMobileSidebar && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside className={`admin-sidebar-mobile fixed left-0 top-0 z-50 h-full w-[236px] flex-shrink-0 flex-col overflow-y-auto bg-gradient-to-b from-[#1e2535] to-[#171f2e] transition-transform duration-300 lg:hidden ${
          showMobileSidebar ? "translate-x-0" : "-translate-x-full"
        }`}>
          <div className="px-5 pb-6 pt-8">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-[2.2rem] font-black lowercase leading-none tracking-tight text-white">
                SpeedCopy
              </h1>
              <button 
                onClick={() => setShowMobileSidebar(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
            <p className="mt-2 pl-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-[#a99f93]">
              Vendor portal
            </p>
          </div>

          <div className="mx-5 h-px bg-violet-200/30" />

          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <div className="space-y-5">
              {filteredNavGroups.map((group) => (
                <div key={group.label}>
                  <p className="px-4 pb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white/35">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map(({ to, icon: Icon, label }) => (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() => setShowMobileSidebar(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                            isActive ? "admin-nav-active" : "admin-nav-idle hover:bg-white/5 hover:text-white"
                          }`
                        }
                      >
                        <Icon size={15} />
                        <span>{label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          <div className="px-4 pb-5">
            <button 
              onClick={() => {
                setShowMobileSidebar(false);
                handleLogout();
              }}
              className="flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
              }}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </aside>

        <div className="admin-content-shell flex min-w-0 flex-1 flex-col">
          <header className="admin-topbar flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition"
                title="Toggle menu"
              >
                <Menu size={20} className="text-slate-900" />
              </button>
              <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                {page.title}
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <form onSubmit={handleSearch} className="relative hidden sm:block">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  className="w-48 sm:w-64 rounded-full border border-gray-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-gray-400" 
                  placeholder="Search orders..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>

              <div className="relative">
                <button 
                  className="relative flex h-9 w-9 items-center justify-center rounded-xl shadow-lg hover:shadow-xl transition-all overflow-hidden" 
                  style={{ 
                    background: 'radial-gradient(circle at top, rgba(255, 255, 255, 0.04), transparent 24%), linear-gradient(180deg, #1e2535 0%, #171f2e 100%)'
                  }}
                  title="Notifications"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell size={16} className="text-white" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 min-w-[18px] rounded-full bg-red-500 px-1 text-[10px] font-bold leading-[18px] text-white border border-white text-center">
                      {Math.min(unreadCount, 99)}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                          <button
                            onClick={() => void handleMarkAllRead()}
                            disabled={markingAllRead}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg transition hover:bg-slate-100 disabled:opacity-50"
                            style={{ color: "#2d3f55" }}>
                            {markingAllRead ? "Marking..." : "Mark all read"}
                          </button>
                        )}
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                          <X size={15} className="text-slate-500" />
                        </button>
                      </div>
                    </div>

                    {/* Category Filter Tabs */}
                    {Object.keys(categoryCounts).length > 0 && (
                      <div className="px-3 py-2 border-b border-slate-100 flex gap-1 overflow-x-auto">
                        <button
                          onClick={() => setNotifCategory("all")}
                          className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg transition"
                          style={notifCategory === "all"
                            ? { backgroundColor: "#2d3f55", color: "#fff" }
                            : { backgroundColor: "#f1f5f9", color: "#64748b" }}>
                          All {unreadCount > 0 && `(${unreadCount})`}
                        </button>
                        {Object.entries(categoryCounts).map(([cat, count]) => (
                          <button
                            key={cat}
                            onClick={() => setNotifCategory(cat)}
                            className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg capitalize transition"
                            style={notifCategory === cat
                              ? { backgroundColor: "#2d3f55", color: "#fff" }
                              : { backgroundColor: "#f1f5f9", color: "#64748b" }}>
                            {cat} ({count})
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Notification List */}
                    {filteredNotifications.length ? (
                      <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-50">
                        {filteredNotifications.map((n) => (
                          <div
                            key={n._id}
                            onClick={() => { if (!n.isRead) void handleMarkOneRead(n._id); }}
                            className={`flex items-start gap-3 px-4 py-3.5 transition cursor-pointer ${
                              n.isRead ? "bg-white hover:bg-slate-50" : "bg-blue-50/60 hover:bg-blue-50"
                            }`}>
                            {/* Category icon */}
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${
                              n.isRead ? "bg-slate-100" : "bg-white shadow-sm"
                            }`}>
                              {getCategoryIcon(n.category)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm leading-snug ${n.isRead ? "font-medium text-slate-700" : "font-bold text-slate-900"}`}>
                                  {n.title}
                                </p>
                                {!n.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-slate-500 leading-relaxed line-clamp-2">
                                {n.message}
                              </p>
                              <div className="mt-1.5 flex items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                                  {n.category}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {formatTimestamp(n.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center px-6">
                        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4">
                          <Bell size={22} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-700">All caught up!</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {notifCategory !== "all" ? `No ${notifCategory} notifications` : "Assigned jobs and status updates will appear here."}
                        </p>
                      </div>
                    )}

                    {/* Footer */}
                    {filteredNotifications.length > 0 && (
                      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 text-center">
                        <p className="text-xs text-slate-400">
                          {unreadCount > 0 ? `${unreadCount} unread` : "All notifications read"} • Click to mark as read
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)} 
                  className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-white transition overflow-hidden"
                  style={{ background: 'radial-gradient(circle at top, rgba(255, 255, 255, 0.04), transparent 24%), linear-gradient(180deg, #1e2535 0%, #171f2e 100%)' }}
                >
                  <span>{session.role}</span>
                  <ChevronDown size={14} />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-200 z-50">
                    <div className="p-4 border-b border-slate-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-sm text-slate-900">{session.role}</p>
                          <p className="text-xs text-slate-500 mt-1">{session.email}</p>
                        </div>
                        <button 
                          onClick={() => setShowUserMenu(false)}
                          className="p-1 hover:bg-slate-100 rounded-lg transition"
                        >
                          <X size={16} className="text-slate-500" />
                        </button>
                      </div>
                    </div>
                    <div className="p-2">
                      <button 
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/org');
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition"
                      >
                        <Building2 size={14} />
                        Organization Profile
                      </button>
                      <button 
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/score');
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition"
                      >
                        <Star size={14} />
                        Vendor Score
                      </button>
                      <button 
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/support');
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition"
                      >
                        <HeadphonesIcon size={14} />
                        Support
                      </button>
                    </div>
                    <div className="p-2 border-t border-slate-100">
                      <button 
                        onClick={() => {
                          setShowUserMenu(false);
                          handleLogout();
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <LogOut size={14} />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="admin-main flex-1 overflow-y-auto px-3 pb-4 pt-2 sm:px-4 sm:pb-5 sm:pt-3 md:px-6 md:pb-7 md:pt-4 lg:px-8">
            <div className="w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
