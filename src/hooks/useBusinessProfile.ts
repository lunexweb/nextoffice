import { useState, useEffect } from 'react';
import { BusinessProfile } from '@/types';
import { profileService } from '@/services/api/profileService';

const defaultProfile: BusinessProfile = {
  businessName: '',
  ownerName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  postalCode: '',
  bankingDetails: { bank: '', account: '', branch: '', type: '' },
  vatSettings: { enabled: false, percentage: 15, registrationNumber: '' },
};

export const useBusinessProfile = () => {
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await profileService.get();
      if (data) setBusinessProfile(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    window.addEventListener('profileUpdated', load);
    return () => window.removeEventListener('profileUpdated', load);
  }, []);

  const updateBusinessProfile = async (updates: Partial<BusinessProfile>) => {
    try {
      setError(null);
      const updated = await profileService.update(updates);
      setBusinessProfile(updated);
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      throw err;
    }
  };

  return { businessProfile, loading, error, updateBusinessProfile };
};
