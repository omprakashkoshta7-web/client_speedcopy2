import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChevronLeft,
  Home,
  Building2,
  MapPin,
  Trash2,
  CheckCircle2,
  Plus,
} from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { Input } from '../../components/ui/Input';
import { useOrderStore } from '../../store/useOrderStore';
import { useThemeStore } from '../../store/useThemeStore';
import { ProfileStackParamList } from '../../navigation/types';
import { AddressSuggestion, geocodeAddressCoordinates, searchAddressSuggestions } from '../../utils/addressLocation';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'SavedAddress'>;

function cardShadow() {
  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
    },
    android: { elevation: 3 },
    default: {},
  });
}

export function SavedAddressScreen() {
  const navigation = useNavigation<Nav>();
  const { colors: t } = useThemeStore();
  const addresses = useOrderStore((s) => s.addresses);
  const removeAddress = useOrderStore((s) => s.removeAddress);
  const setDefaultAddress = useOrderStore((s) => s.setDefaultAddress);
  const fetchAddresses = useOrderStore((s) => s.fetchAddresses);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState('');
  const [selectedSuggestionLocation, setSelectedSuggestionLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

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
        state,
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
  }, [city, line1, line2, pincode, showForm, state]);

  const resetForm = () => {
    setName('');
    setPhone('');
    setLine1('');
    setLine2('');
    setCity('');
    setState('');
    setPincode('');
    setSelectedSuggestionId('');
    setSelectedSuggestionLocation(null);
    setAddressSuggestions([]);
    setSuggestionsLoading(false);
    setShowForm(false);
  };

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
    setState(value);
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
    setState(suggestion.state || state);
    setPincode(suggestion.pincode || pincode);
    setAddressSuggestions([]);
  }, [city, pincode, state]);

  const saveAddressToBackend = useOrderStore((s) => s.saveAddressToBackend);

  const handleSave = async () => {
    const cleanName = name.trim();
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanLine1 = line1.trim();
    const cleanLine2 = line2.trim();
    const cleanCity = city.trim();
    const cleanState = state.trim();
    const cleanPincode = pincode.replace(/\D/g, '');

    if (!cleanName || !cleanPhone || !cleanLine1 || !cleanCity || !cleanState || !cleanPincode) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
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

    await saveAddressToBackend({
      label: 'Home',
      fullName: cleanName,
      phone: cleanPhone,
      line1: cleanLine1,
      line2: cleanLine2,
      city: cleanCity,
      state: cleanState,
      pincode: cleanPincode,
      isDefault: addresses.length === 0,
      location: selectedSuggestionLocation || await geocodeAddressCoordinates({
        line1: cleanLine1,
        line2: cleanLine2,
        city: cleanCity,
        state: cleanState,
        pincode: cleanPincode,
      }),
    });
    const newAddresses = useOrderStore.getState().addresses;
    const lastAddr = newAddresses[newAddresses.length - 1];
    if (lastAddr) {
      setDefaultAddress(lastAddr.id);
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Address', 'Are you sure you want to remove this address?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeAddress(id) },
    ]);
  };

  const getAddressIcon = (index: number) => {
    return index === 0 ? Home : Building2;
  };

  return (
    <SafeScreen>
      <View style={[styles.header, { backgroundColor: t.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Saved Address</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {addresses.length === 0 && !showForm && (
          <View style={[styles.emptyCard, cardShadow(), { backgroundColor: t.card }]}>
            <MapPin size={48} color={t.placeholder} />
            <Text style={[styles.emptyTitle, { color: t.textPrimary }]}>No saved addresses</Text>
            <Text style={[styles.emptySub, { color: t.textSecondary }]}>
              Add an address for faster checkout
            </Text>
          </View>
        )}

        {addresses.map((addr, idx) => {
          const Icon = getAddressIcon(idx);
          return (
            <View key={addr.id} style={[styles.addressCard, cardShadow(), { backgroundColor: t.card }]}>
              <View style={styles.cardRow}>
                <View style={[styles.iconCircle, { backgroundColor: addr.isDefault ? 'rgba(76, 161, 175, 0.15)' : t.chipBg }]}>
                  <Icon size={20} color={addr.isDefault ? '#4CA1AF' : t.iconDefault} />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.addrName, { color: t.textPrimary }]}>{addr.name}</Text>
                    {addr.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.addrLine, { color: t.textSecondary }]}>
                    {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}
                  </Text>
                  <Text style={[styles.addrLine, { color: t.textSecondary }]}>
                    {addr.city}, {addr.state} — {addr.pincode}
                  </Text>
                  <Text style={[styles.addrPhone, { color: t.textMuted }]}>{addr.phone}</Text>
                </View>
              </View>

              <View style={[styles.cardActions, { borderTopColor: t.divider }]}>
                {!addr.isDefault && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => setDefaultAddress(addr.id)}
                    activeOpacity={0.7}
                  >
                    <CheckCircle2 size={16} color="#4CA1AF" />
                    <Text style={[styles.actionText, { color: '#4CA1AF' }]}>Set as default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleDelete(addr.id)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color="#EB5757" />
                  <Text style={[styles.actionText, { color: '#EB5757' }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {showForm && (
          <View style={[styles.formCard, cardShadow(), { backgroundColor: t.card }]}>
            <Text style={[styles.formTitle, { color: t.textPrimary }]}>Add New Address</Text>
            <Input label="Full Name *" placeholder="Enter full name" value={name} onChangeText={setName} />
            <Input label="Phone *" placeholder="10-digit mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Input label="Address Line 1 *" placeholder="House no., Street" value={line1} onChangeText={handleLine1Change} />
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
                        selected ? [styles.suggestionRowSelected, { backgroundColor: 'rgba(76, 161, 175, 0.12)' }] : null,
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
            <Input label="Address Line 2" placeholder="Landmark, Area" value={line2} onChangeText={handleLine2Change} />
            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Input label="City *" placeholder="City" value={city} onChangeText={handleCityChange} />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="State" placeholder="State" value={state} onChangeText={handleStateChange} />
              </View>
            </View>
            <Input label="Pincode *" placeholder="6-digit pincode" value={pincode} onChangeText={handlePincodeChange} keyboardType="number-pad" />

            <View style={styles.formBtnRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: t.border }]}
                onPress={resetForm}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelBtnText, { color: t.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: t.textPrimary }]}
                onPress={handleSave}
                activeOpacity={0.85}
              >
                <Text style={[styles.saveBtnText, { color: t.background }]}>Save Address</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!showForm && (
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: t.border }]}
            onPress={() => setShowForm(true)}
            activeOpacity={0.8}
          >
            <Plus size={20} color={t.textPrimary} />
            <Text style={[styles.addBtnText, { color: t.textPrimary }]}>Add New Address</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 21,
    lineHeight: 36,
    textAlign: 'center',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  emptyCard: {
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 19,
    marginTop: 8,
  },
  emptySub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    textAlign: 'center',
  },
  addressCard: {
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  addrName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  defaultBadge: {
    backgroundColor: 'rgba(76, 161, 175, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#4CA1AF',
  },
  addrLine: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 21,
  },
  addrPhone: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
  },
  formCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    gap: 4,
  },
  suggestionsCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 4,
  },
  suggestionsTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  suggestionsLoader: {
    paddingVertical: 10,
  },
  suggestionRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  suggestionRowSelected: {
    backgroundColor: 'rgba(76, 161, 175, 0.12)',
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
  formTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    marginBottom: 8,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
  },
  saveBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 6,
  },
  addBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
});





