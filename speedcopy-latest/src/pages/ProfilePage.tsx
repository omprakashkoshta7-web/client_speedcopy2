import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import userService from '../services/user.service';
import { useAuth } from '../context/AuthContext';

const ProfilePage: React.FC = () => {
  const { isAuthenticated, refreshUser, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    gender: '',
    dob: '',
  });
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Set avatar preview from user data
  useEffect(() => {
    if (user?.avatar) {
      setAvatarPreview(user.avatar);
    }
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await userService.getProfile();
      const profile = response.data;
      
      setForm({
        name: profile.name || '',
        email: '', // Email field is not in UserProfile schema
        phone: profile.phone || '',
        gender: profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : '', // Capitalize first letter
        dob: profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '', // Convert to YYYY-MM-DD format
      });
      
      // Set avatar preview if exists
      if (profile.avatar) {
        setAvatarPreview(profile.avatar);
      }
    } catch (err: any) {
      console.error('Failed to fetch profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.phone.trim()) { setError('Phone number is required'); return; }
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(form.phone.replace(/\D/g, ''))) {
      setError('Please enter a valid 10-digit phone number'); return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // ── Step 1: Upload avatar separately if changed ──────────────────────
      if (avatarFile) {
        try {
          await userService.uploadAvatar(avatarFile);
        } catch (avatarErr: any) {
          // If dedicated avatar endpoint doesn't exist, compress & include in profile
          // Compress image to max 200px / 0.6 quality to stay under gateway limit
          const compressedAvatar = await new Promise<string>((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(avatarFile);
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX = 200;
              const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
              canvas.width = img.width * ratio;
              canvas.height = img.height * ratio;
              canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
              URL.revokeObjectURL(url);
              resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = reject;
            img.src = url;
          });

          // Include compressed avatar in profile update
          const updateData: any = {
            name: form.name.trim(),
            phone: form.phone.trim(),
            avatar: compressedAvatar,
          };
          if (form.gender) updateData.gender = form.gender.toLowerCase();
          if (form.dob) updateData.dateOfBirth = form.dob;

          await userService.updateProfile(updateData);
          await refreshUser().catch(() => {});
          setSuccess('Profile updated successfully!');
          setTimeout(() => setSuccess(''), 3000);
          setAvatarFile(null);
          return;
        }
      }

      // ── Step 2: Update text fields only (no avatar base64) ───────────────
      const updateData: any = {
        name: form.name.trim(),
        phone: form.phone.trim(),
      };
      if (form.gender) updateData.gender = form.gender.toLowerCase();
      if (form.dob) updateData.dateOfBirth = form.dob;

      await userService.updateProfile(updateData);
      await refreshUser().catch(() => {});

      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      setAvatarFile(null);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setAvatarFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    // Clear any existing errors
    if (error) setError('');
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const inputClass = "w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition bg-white";
  const inputStyle = { border: '1.5px solid #e5e7eb', color: '#374151' };
  const labelClass = "block text-sm font-semibold text-gray-600 mb-1.5";

  return (
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Page title */}
        <div className="mb-6 px-1">
          <h1 className="font-bold text-gray-900 mb-1" style={{ fontSize: '26px' }}>Edit Profile</h1>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>Manage your personal details and account settings.</p>
        </div>

        {!isAuthenticated ? (
          <div className="bg-white rounded-3xl p-12 text-center" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <p className="text-gray-600 mb-4">Please login to view your profile</p>
            <button onClick={() => window.location.href = '/'} className="px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-700">
              Go to Home
            </button>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-3xl p-8 animate-pulse" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 rounded-full bg-gray-200 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-48" />
            </div>
            <div className="space-y-5">
              <div className="h-12 bg-gray-200 rounded-xl" />
              <div className="h-12 bg-gray-200 rounded-xl" />
              <div className="h-12 bg-gray-200 rounded-xl" />
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl" style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca' }}>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="mb-4 px-4 py-3 rounded-xl" style={{ backgroundColor: '#dcfce7', border: '1px solid #bbf7d0' }}>
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

        {/* Profile card */}
        <div className="bg-white rounded-3xl p-8 mb-4" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>

          {/* Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-3">
              <div 
                className="w-20 h-20 rounded-full overflow-hidden cursor-pointer hover:opacity-80 transition"
                style={{ border: '3px solid #f3f4f6' }}
                onClick={handleAvatarClick}
              >
                <img
                  src={avatarPreview || user?.avatar || "https://i.pravatar.cc/80?img=47"}
                  alt="Profile"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Camera button */}
              <button
                onClick={handleAvatarClick}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-800 transition"
                style={{ backgroundColor: '#111111', border: '2px solid white' }}
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            <p className="font-bold text-gray-900" style={{ fontSize: '16px' }}>{form.name || 'User'}</p>
            <p style={{ fontSize: '13px', color: '#9ca3af' }}>
              {avatarFile ? 'Click Save to upload new photo' : 'Click camera icon to update photo'}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-5">
            {/* Full Name */}
            <div>
              <label className={labelClass}>Full Name *</label>
              <input 
                name="name" 
                value={form.name} 
                onChange={handleChange} 
                className={inputClass} 
                style={inputStyle}
                placeholder="Enter your full name"
                required
              />
            </div>

            {/* Email - Hidden field, not in UserProfile schema */}
            {form.email && (
              <div>
                <label className={labelClass}>Email Address</label>
                <div className="relative">
                  <input
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className={inputClass}
                    style={{ ...inputStyle, paddingRight: '44px', backgroundColor: '#fafafa', color: '#9ca3af' }}
                    readOnly
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4" style={{ color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Phone + Gender + DOB */}
            <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr 1.2fr' }}>
              <div>
                <label className={labelClass}>Phone Number *</label>
                <div className="relative">
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className={inputClass}
                    style={{ ...inputStyle, paddingRight: '90px' }}
                    placeholder="Enter phone number"
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>Verified</span>
                  </div>
                </div>
              </div>
              <div>
                <label className={labelClass}>Gender</label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className={inputClass}
                  style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Date of birth</label>
                <input
                  type="date"
                  name="dob"
                  value={form.dob}
                  onChange={handleChange}
                  placeholder="dd/mm/yyyy"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: '1px solid #f3f4f6' }}>
            <button 
              onClick={() => fetchProfile()}
              className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 text-white font-bold rounded-full hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#111111', fontSize: '14px' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {saving ? 'Saving...' : avatarFile ? 'Save Changes & Upload Photo' : 'Save Changes'}
            </button>
          </div>
        </div>
        </>
        )}

        {/* Sign-in Method card */}
        <div className="bg-white rounded-3xl px-6 py-5 flex items-center justify-between" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f3f4f6' }}>
              <svg className="w-5 h-5" style={{ color: '#6b7280' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-900" style={{ fontSize: '15px' }}>Sign-in Method</p>
              <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                Manage your password and security preferences. Last updated 3 months ago.
              </p>
            </div>
          </div>
          <button className="text-sm font-semibold hover:opacity-70 transition" style={{ color: '#374151' }}>
            Change Password
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;




