import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Building2, ChevronLeft, Home, Trash2, Truck } from 'lucide-react-native';
import { Colors, Radii, Spacing } from '../../constants/theme';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CartStackParamList } from '../../navigation/types';
import { useCartStore } from '../../store/useCartStore';
import { useOrderStore } from '../../store/useOrderStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Address } from '../../types';
import { AddressSuggestion, geocodeAddressCoordinates, searchAddressSuggestions } from '../../utils/addressLocation';

type Nav = NativeStackNavigationProp<CartStackParamList, 'Address'>;
type Route = RouteProp<CartStackParamList, 'Address'>;

function cardShadow() {
  return Platform.select({
    ios: {
      shadowColor: Colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {},
  });
}

export function AddressScreen() {
  const { colors: t, mode: themeMode } = useThemeStore();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const couponCode = route.params?.couponCode;
  const couponDiscount = route.params?.couponDiscount ?? 0;
  const cartItems = useCartStore((s) => s.items);
  const addresses = useOrderStore((s) => s.addresses);
  const setDefaultAddress = useOrderStore((s) => s.setDefaultAddress);
  const fetchAddresses = useOrderStore((s) => s.fetchAddresses);
  const removeAddress = useOrderStore((s) => s.removeAddress);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const initialId = useMemo(() => {
    const def = addresses.find((a) => a.isDefault);
    return def?.id ?? addresses[0]?.id ?? '';
  }, [addresses]);

  const [selectedId, setSelectedId] = useState(initialId);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState('');
  const [selectedSuggestionLocation, setSelectedSuggestionLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  useEffect(() => {
    setSelectedId(initialId);
  }, [initialId]);

  useEffect(() => {
    if (!showForm) {
      setAddressSuggestions([]);
      setSuggestionsLoading(false);
      return undefined;
    }

    const shouldSearch =
      line1.trim().length >= 3;

    if (!shouldSearch) {
      setAddressSuggestions([]);
      setSuggestionsLoading(false);
      return undefined;
    }

    let active = true;
    setSuggestionsLoading(true);
    const timer = setTimeout(() => {
      searchAddressSuggestions({
        line1,
        line2,
        city,
        state: stateName,
        pincode,
      })
        .then((results) => {
          if (!active) return;
          setAddressSuggestions(results);
        })
        .catch(() => {
          if (!active) return;
          setAddressSuggestions([]);
        })
        .finally(() => {
          if (active) {
            setSuggestionsLoading(false);
          }
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [city, line1, line2, pincode, showForm, stateName]);

  const resetForm = useCallback(() => {
    setName('');
    setPhone('');
    setLine1('');
    setLine2('');
    setCity('');
    setStateName('');
    setPincode('');
    setSelectedSuggestionId('');
    setSelectedSuggestionLocation(null);
    setAddressSuggestions([]);
    setSuggestionsLoading(false);
  }, []);

  const clearSelectedSuggestion = useCallback(() => {
    setSelectedSuggestionId('');
    setSelectedSuggestionLocation(null);
  }, []);

  const handleLine1Change = useCallback((value: string) => {
    clearSelectedSuggestion();
    setLine1(value);
  }, [clearSelectedSuggestion]);

  const handleLine2Change = useCallback((value: string) => {
    clearSelectedSuggestion();
    setLine2(value);
  }, [clearSelectedSuggestion]);

  const handleCityChange = useCallback((value: string) => {
    clearSelectedSuggestion();
    setCity(value);
  }, [clearSelectedSuggestion]);

  const handleStateChange = useCallback((value: string) => {
    clearSelectedSuggestion();
    setStateName(value);
  }, [clearSelectedSuggestion]);

  const handlePincodeChange = useCallback((value: string) => {
    clearSelectedSuggestion();
    setPincode(value);
  }, [clearSelectedSuggestion]);

  const applySuggestion = useCallback((suggestion: AddressSuggestion) => {
    setSelectedSuggestionId(suggestion.id);
    setSelectedSuggestionLocation(suggestion.location);
    setLine1(suggestion.line1 || suggestion.title);
    setLine2(suggestion.line2 || '');
    setCity(suggestion.city || city);
    setStateName(suggestion.state || stateName);
    setPincode(suggestion.pincode || pincode);
    setAddressSuggestions([]);
  }, [city, pincode, stateName]);

  const saveAddressToBackend = useOrderStore((s) => s.saveAddressToBackend);

  const handleAddAddress = useCallback(async () => {
    const cleanName = name.trim();
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanLine1 = line1.trim();
    const cleanLine2 = line2.trim();
    const cleanCity = city.trim();
    const cleanState = stateName.trim();
    const cleanPincode = pincode.replace(/\D/g, '');

    if (!cleanName || !cleanPhone || !cleanLine1 || !cleanCity || !cleanState || !cleanPincode) {
      Alert.alert('Missing fields', 'Please fill all required address fields.');
      return;
    }
    if (cleanPhone.length < 10) {
      Alert.alert('Invalid phone', 'Please enter a valid 10-digit phone number.');
      return;
    }
    if (cleanPincode.length < 6) {
      Alert.alert('Invalid pincode', 'Please enter a valid 6-digit pincode.');
      return;
    }

    const addrData = {
      label: 'Home' as const,
      fullName: cleanName,
      phone: cleanPhone,
      line1: cleanLine1,
      line2: cleanLine2 || undefined,
      city: cleanCity,
      state: cleanState,
      pincode: cleanPincode,
      isDefault: addresses.length === 0,
      location: selectedSuggestionLocation || await geocodeAddressCoordinates({
        line1: cleanLine1,
        line2: cleanLine2 || undefined,
        city: cleanCity,
        state: cleanState,
        pincode: cleanPincode,
      }),
    };
    await saveAddressToBackend(addrData);
    const newAddresses = useOrderStore.getState().addresses;
    const lastAddr = newAddresses[newAddresses.length - 1];
    if (lastAddr) {
      setSelectedId(lastAddr.id);
      setDefaultAddress(lastAddr.id);
    }
    resetForm();
    setShowForm(false);
  }, [saveAddressToBackend, addresses.length, city, line1, line2, name, phone, pincode, resetForm, setDefaultAddress, stateName]);

  const onContinue = useCallback(() => {
    if (cartItems.length === 0) {
      Alert.alert('Cart empty', 'Add items to your cart before payment.');
      return;
    }
    const id = selectedId || addresses[0]?.id;
    if (!id) {
      Alert.alert('Add an address', 'Save a delivery address to continue.');
      return;
    }
    navigation.navigate('PaymentSummary', {
      addressId: id,
      couponCode,
      couponDiscount,
    });
  }, [addresses, cartItems.length, couponCode, couponDiscount, navigation, selectedId]);

  const handleRemoveAddress = useCallback((id: string) => {
    Alert.alert('Remove Address', 'Do you want to remove this address from saved addresses?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          if (selectedId === id) {
            const fallback = addresses.find((address) => address.id !== id);
            setSelectedId(fallback?.id || '');
          }
          removeAddress(id);
        },
      },
    ]);
  }, [addresses, removeAddress, selectedId]);

  const rows = useMemo(
    () =>
      addresses.map((addr) => ({
        addr,
        kind: (addr.label?.toLowerCase() === 'office' ? 'office' : 'home') as 'home' | 'office',
      })),
    [addresses],
  );

  return (
    <SafeScreen>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={26} color={t.iconDefault} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: t.textPrimary }]} numberOfLines={1}>
          Address & delivery
        </Text>
        <View style={styles.topBarSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.noticeBox, { backgroundColor: themeMode === 'dark' ? t.card : Colors.blueLightBg, borderColor: themeMode === 'dark' ? t.border : 'rgba(114, 146, 255, 0.25)' }]}>
            <View style={[styles.noticeIconWrap, { backgroundColor: t.card }]}>
              <Truck size={22} color={Colors.blueAccent} />
            </View>
            <View style={styles.noticeTextWrap}>
              <Text style={[styles.noticeTitle, { color: t.textPrimary }]}>Estimated delivery</Text>
              <Text style={[styles.noticeSubtitle, { color: t.textSecondary }]}>Within 24 Hours</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Saved Addresses</Text>
            <Text style={[styles.sectionCount, { color: t.textSecondary }]}>
              {addresses.length} saved
            </Text>
          </View>

          {rows.map(({ addr, kind }) => {
            const selected = selectedId === addr.id;
            return (
              <TouchableOpacity
                key={addr.id}
                style={[
                  styles.card,
                  cardShadow(),
                  { backgroundColor: t.card },
                  selected && [
                    styles.cardSelected,
                    { borderColor: Colors.blueAccent, backgroundColor: themeMode === 'dark' ? t.chipBg : Colors.blueLightBg },
                  ],
                ]}
                onPress={() => setSelectedId(addr.id)}
                activeOpacity={0.92}
              >
                <View style={styles.radioOuter}>
                  {selected ? <View style={styles.radioInner} /> : null}
                </View>

                <View style={styles.iconBadge}>
                  {kind === 'home' ? (
                    <Home size={16} color={Colors.surface} />
                  ) : (
                    <Building2 size={16} color={Colors.surface} />
                  )}
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardKindLabel, { color: t.textPrimary }]}>
                      {kind === 'home' ? 'Home' : 'Office'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.removeMiniBtn, { borderColor: t.border, backgroundColor: t.background }]}
                      onPress={() => handleRemoveAddress(addr.id)}
                      activeOpacity={0.8}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={13} color="#EB5757" />
                      <Text style={styles.removeMiniText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.cardLine, { color: t.textPrimary }]} numberOfLines={2}>
                    {addr.line1}
                    {addr.line2 ? `, ${addr.line2}` : ''}
                  </Text>
                  <Text style={[styles.cardLineMuted, { color: t.textSecondary }]} numberOfLines={1}>
                    {addr.city}, {addr.state}
                  </Text>
                  <Text style={[styles.pinLine, { color: t.textMuted }]}>Pin: {addr.pincode}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            onPress={() => setShowForm((v) => !v)}
            style={styles.addLinkWrap}
            hitSlop={{ top: 8, bottom: 8 }}
          >
            <Text style={styles.addLink}>Add New Address</Text>
          </TouchableOpacity>

          {showForm && (
            <View style={styles.form}>
              <Input label="Name" value={name} onChangeText={setName} placeholder="Full name" />
              <Input
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit mobile"
                keyboardType="phone-pad"
              />
              <Input label="Address Line 1" value={line1} onChangeText={handleLine1Change} placeholder="House, street" />
              {(suggestionsLoading || addressSuggestions.length > 0) && (
                <View style={[styles.suggestionsCard, { backgroundColor: t.card, borderColor: t.border }]}>
                  <Text style={[styles.suggestionsTitle, { color: t.textSecondary }]}>Address suggestions</Text>
                  {suggestionsLoading ? (
                    <ActivityIndicator size="small" color={t.textPrimary} style={styles.suggestionsLoader} />
                  ) : addressSuggestions.map((suggestion) => {
                    const selected = selectedSuggestionId === suggestion.id;
                    return (
                      <TouchableOpacity
                        key={suggestion.id}
                        style={[
                          styles.suggestionRow,
                          { borderTopColor: t.divider },
                          selected ? [styles.suggestionRowSelected, { backgroundColor: themeMode === 'dark' ? t.chipBg : Colors.blueLightBg }] : null,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => applySuggestion(suggestion)}
                      >
                        <Text style={[styles.suggestionTitle, { color: t.textPrimary }]} numberOfLines={2}>
                          {suggestion.title}
                        </Text>
                        {suggestion.subtitle ? (
                          <Text style={[styles.suggestionSubtitle, { color: t.textSecondary }]} numberOfLines={2}>
                            {suggestion.subtitle}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <Input label="Line 2" value={line2} onChangeText={handleLine2Change} placeholder="Landmark (optional)" />
              <Input label="City" value={city} onChangeText={handleCityChange} />
              <Input label="State" value={stateName} onChangeText={handleStateChange} />
              <Input label="Pincode" value={pincode} onChangeText={handlePincodeChange} keyboardType="number-pad" />
              <Button title="Save Address" onPress={handleAddAddress} variant="primary" size="md" />
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: t.divider, backgroundColor: t.background }]}>
          <Button title="Deliver Here" onPress={onContinue} variant="primary" size="lg" />
        </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  topBarSpacer: {
    width: 26,
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textDark,
  },
  scroll: {
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 90,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.blueLightBg,
    borderRadius: Radii.section,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(114, 146, 255, 0.25)',
  },
  noticeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  noticeTextWrap: {
    flex: 1,
    gap: 2,
  },
  noticeTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textDark,
  },
  noticeSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textDark,
  },
  sectionCount: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Radii.section,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: Spacing.sm,
  },
  cardSelected: {
    borderColor: Colors.blueAccent,
    backgroundColor: Colors.blueLightBg,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.blueAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.blueAccent,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.blueAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  cardKindLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 19,
    color: Colors.textDark,
  },
  removeMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeMiniText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    lineHeight: 14,
    color: '#EB5757',
  },
  cardLine: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textDark,
  },
  cardLineMuted: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  pinLine: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textMuted,
    marginTop: 2,
  },
  addLinkWrap: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  addLink: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 19,
    color: Colors.blueAccent,
  },
  form: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  suggestionsCard: {
    borderWidth: 1,
    borderRadius: Radii.input,
    overflow: 'hidden',
    marginTop: 2,
  },
  suggestionsTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  suggestionsLoader: {
    paddingVertical: Spacing.sm,
  },
  suggestionRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  suggestionRowSelected: {
    backgroundColor: Colors.blueLightBg,
  },
  suggestionTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  suggestionSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderGray,
    backgroundColor: Colors.background,
  },
});



