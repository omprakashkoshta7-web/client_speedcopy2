import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Order, Address, WalletTransaction } from '../types';
import * as ordersApi from '../api/orders';
import * as userApi from '../api/user';
import * as financeApi from '../api/finance';
import { getToken } from '../api/client';
import { resolveProductImageSource } from '../utils/product';

interface OrderState {
  orders: Order[];
  addresses: Address[];
  walletBalance: number;
  walletTransactions: WalletTransaction[];
  wishlistIds: string[];
  loading: boolean;

  addOrder: (order: Order) => void;
  addAddress: (address: Address) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  setWishlistIds: (ids: string[]) => void;
  addWalletTransaction: (txn: WalletTransaction) => void;

  fetchOrders: () => Promise<void>;
  fetchAddresses: () => Promise<void>;
  fetchWallet: () => Promise<void>;
  fetchWishlist: () => Promise<void>;
  createBackendOrder: (body: Parameters<typeof ordersApi.createOrder>[0]) => Promise<ordersApi.BackendOrder | null>;
  saveAddressToBackend: (addr: Omit<userApi.UserAddress, '_id' | 'userId' | 'country'>) => Promise<void>;
  removeAddressFromBackend: (id: string) => Promise<void>;
}

const ADDRESSES_CACHE_KEY = 'speedcopy_addresses_cache_v1';

async function readCachedAddresses(): Promise<Address[]> {
  try {
    const raw = await AsyncStorage.getItem(ADDRESSES_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedAddresses(addresses: Address[]) {
  return AsyncStorage.setItem(ADDRESSES_CACHE_KEY, JSON.stringify(addresses));
}

function persistAddresses(addresses: Address[]) {
  writeCachedAddresses(addresses).catch(() => {});
}

function upsertAddress(list: Address[], address: Address): Address[] {
  const idx = list.findIndex((a) => a.id === address.id);
  if (idx === -1) return [...list, address];
  const next = [...list];
  next[idx] = address;
  return next;
}

function upsertOrder(list: Order[], order: Order): Order[] {
  const idx = list.findIndex((o) => o.id === order.id);
  if (idx === -1) return [order, ...list];
  const next = [...list];
  next[idx] = order;
  return [order, ...next.filter((_, i) => i !== idx)];
}

function mapBackendAddress(a: userApi.UserAddress): Address {
  return {
    id: a._id,
    label: a.label,
    name: a.fullName,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    isDefault: a.isDefault,
    location: a.location ? {
      lat: Number(a.location.lat),
      lng: Number(a.location.lng),
    } : undefined,
  };
}

function mapBackendStatus(s: string): Order['status'] {
  switch (s) {
    case 'delivered': return 'delivered';
    case 'cancelled': return 'cancelled';
    case 'refunded': return 'cancelled';
    case 'confirmed': return 'confirmed';
    case 'out_for_delivery': return 'shipped';
    case 'delivery_assigned': return 'shipped';
    case 'ready_for_pickup': return 'shipped';
    case 'pending':
    case 'assigned_vendor':
    case 'vendor_accepted':
    case 'in_production':
    case 'qc_pending':
    default: return 'processing';
  }
}

function mapBackendOrder(o: ordersApi.BackendOrder): Order {
  return {
    id: o._id,
    orderNumber: o.orderNumber,
    status: mapBackendStatus(o.status),
    items: o.items.map((i) => {
      const source: any = i;
      const { imageUri } = resolveProductImageSource(
        source,
        source?.variantSnapshot,
        source?.variant_snapshot,
        source?.productSnapshot,
        source?.product_snapshot,
        source?.snapshot,
      );

      return {
        id: i.productId,
        productId: i.productId,
        backendProductId: i.productId,
        thumbnail: source?.thumbnail || source?.image || '',
        variantSnapshot: source?.variantSnapshot,
        variant_snapshot: source?.variant_snapshot,
        productSnapshot: source?.productSnapshot,
        product_snapshot: source?.product_snapshot,
        snapshot: source?.snapshot,
        designId: i.designId,
        printConfigId: i.printConfigId,
        type: i.flowType === 'printing' ? 'printing' as const : i.flowType === 'gifting' ? 'gifting' as const : 'product' as const,
        flowType: i.flowType,
        quantity: i.quantity,
        price: i.unitPrice,
        name: i.productName,
        image: imageUri || source?.thumbnail || source?.image || '',
      };
    }),
    total: o.total,
    date: new Date(o.createdAt).toLocaleDateString('en-IN'),
    address: o.shippingAddress ? {
      id: 'ship',
      name: o.shippingAddress.fullName || o.shippingAddress.name || '',
      phone: o.shippingAddress.phone || '',
      line1: o.shippingAddress.line1 || o.shippingAddress.addressLine || '',
      city: o.shippingAddress.city || '',
      state: o.shippingAddress.state || '',
      pincode: o.shippingAddress.pincode || '',
      isDefault: false,
    } : { id: '', name: '', phone: '', line1: '', city: '', state: '', pincode: '', isDefault: false },
    trackingSteps: o.timeline.map((t, i) => ({
      title: t.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      subtitle: t.note || new Date(t.timestamp).toLocaleString('en-IN'),
      time: new Date(t.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      completed: i < o.timeline.length - 1,
      active: i === o.timeline.length - 1,
    })),
  };
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  addresses: [],
  walletBalance: 0,
  walletTransactions: [],
  wishlistIds: [],
  loading: false,

  addOrder: (order) => set((s) => ({ orders: upsertOrder(s.orders, order) })),

  addAddress: (address) => {
    const next = upsertAddress(get().addresses, address);
    set({ addresses: next });
    persistAddresses(next);
  },

  removeAddress: (id) => {
    const next = get().addresses.filter((a) => a.id !== id);
    set({ addresses: next });
    persistAddresses(next);
    getToken().then((t) => { if (t) userApi.deleteAddress(id).catch(() => {}); });
  },

  setDefaultAddress: (id) => {
    const currentAddresses = get().addresses;
    const next = currentAddresses.map((a) => ({ ...a, isDefault: a.id === id }));
    set({ addresses: next });
    persistAddresses(next);
    getToken().then((token) => {
      if (!token) return;
      const previousDefault = currentAddresses.find((address) => address.isDefault && address.id !== id);
      const toBackendAddressBody = (address: Address, isDefault: boolean) => ({
        label: address.label || 'Home',
        fullName: address.name,
        phone: address.phone,
        houseNo: address.houseNo,
        area: address.area,
        landmark: address.landmark,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        isDefault,
        location: address.location,
      });
      const selectedAddress = currentAddresses.find((address) => address.id === id);
      if (!selectedAddress) return;
      const requests: Promise<any>[] = [
        userApi.updateAddress(id, toBackendAddressBody(selectedAddress, true)),
      ];
      if (previousDefault) {
        requests.push(userApi.updateAddress(previousDefault.id, toBackendAddressBody(previousDefault, false)));
      }
      Promise.allSettled(requests)
        .then(() => get().fetchAddresses().catch(() => {}))
        .catch(() => get().fetchAddresses().catch(() => {}));
    });
  },

  toggleWishlist: (productId) =>
    set((s) => {
      const exists = s.wishlistIds.includes(productId);
      const nextIds = exists
        ? s.wishlistIds.filter((i) => i !== productId)
        : [...s.wishlistIds, productId];

      getToken().then((token) => {
        if (!token) return;
        const request = exists
          ? userApi.removeWishlistItem(productId)
          : userApi.addWishlistItem(productId).then(() => undefined);

        request.catch(() => {
          set((current) => ({
            wishlistIds: exists
              ? [...current.wishlistIds, productId].filter((value, index, array) => array.indexOf(value) === index)
              : current.wishlistIds.filter((i) => i !== productId),
          }));
        });
      });

      return { wishlistIds: nextIds };
    }),

  isWishlisted: (productId) => get().wishlistIds.includes(productId),

  setWishlistIds: (ids) => set({ wishlistIds: Array.from(new Set(ids.filter(Boolean))) }),

  addWalletTransaction: (txn) =>
    set((s) => ({
      walletTransactions: [txn, ...s.walletTransactions],
      walletBalance: txn.type === 'credit' ? s.walletBalance + txn.amount : s.walletBalance - txn.amount,
    })),

  fetchOrders: async () => {
    const token = await getToken();
    if (!token) return;
    set({ loading: true });
    try {
      const { orders } = await ordersApi.getOrders({ limit: 50 });
      set({ orders: orders.map(mapBackendOrder), loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchAddresses: async () => {
    const cached = await readCachedAddresses();
    if (cached.length && get().addresses.length === 0) {
      set({ addresses: cached });
    }

    const token = await getToken();
    if (!token) return;
    try {
      const addrs = await userApi.getAddresses();
      const mapped = addrs.map(mapBackendAddress);
      if (mapped.length > 0) {
        set({ addresses: mapped });
        persistAddresses(mapped);
      } else if (cached.length === 0) {
        // Keep truly empty state only when no local fallback exists.
        set({ addresses: [] });
        persistAddresses([]);
      }
    } catch { /* keep local */ }
  },

  fetchWallet: async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const overview = await financeApi.getWalletOverview();
      set({
        walletBalance: overview.wallet.balance,
        walletTransactions: overview.recent_entries.map((e) => ({
          id: e._id,
          type: e.type,
          amount: e.amount,
          description: e.description || e.category,
          date: new Date(e.createdAt).toISOString().slice(0, 10),
          status: 'completed' as const,
        })),
      });
    } catch { /* keep local */ }
  },

  fetchWishlist: async () => {
    const token = await getToken();
    if (!token) {
      set({ wishlistIds: [] });
      return;
    }
    try {
      const items = await userApi.getWishlist();
      set({
        wishlistIds: items
          .map((item) => String(item?.productId || (item as any)?.product?._id || (item as any)?.productId?._id || '').trim())
          .filter(Boolean),
      });
    } catch {
      // Keep the current local wishlist if backend sync fails.
    }
  },

  createBackendOrder: async (body) => {
    try {
      const order = await ordersApi.createOrder(body);
      set((s) => ({ orders: [mapBackendOrder(order), ...s.orders] }));
      return order;
    } catch {
      return null;
    }
  },

  saveAddressToBackend: async (addr) => {
    const toLocalAddress = (): Address => ({
      id: `addr-${Date.now()}`,
      label: addr.label,
      name: addr.fullName,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      isDefault: addr.isDefault,
      location: addr.location,
    });

    const token = await getToken();
    if (!token) {
      const localAddr = toLocalAddress();
      const next = upsertAddress(get().addresses, localAddr);
      set({ addresses: next });
      persistAddresses(next);
      return;
    }
    try {
      const saved = await userApi.addAddress(addr);
      const next = upsertAddress(get().addresses, mapBackendAddress(saved));
      set({ addresses: next });
      persistAddresses(next);
    } catch {
      // Keep checkout unblocked when backend save fails in development/network issues.
      const localAddr = toLocalAddress();
      const next = upsertAddress(get().addresses, localAddr);
      set({ addresses: next });
      persistAddresses(next);
    }
  },

  removeAddressFromBackend: async (id) => {
    const next = get().addresses.filter((a) => a.id !== id);
    set({ addresses: next });
    persistAddresses(next);
    const token = await getToken();
    if (token) userApi.deleteAddress(id).catch(() => {});
  },
}));
