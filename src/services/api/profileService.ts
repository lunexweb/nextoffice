import { supabase } from '@/lib/supabase';
import type { BusinessProfile } from '@/types';

const mapProfile = (row: any): BusinessProfile => ({
  businessName: row.business_name || '',
  ownerName: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
  email: row.email || '',
  phone: row.phone || '',
  address: row.address || '',
  city: row.city || '',
  postalCode: row.postal_code || '',
  bankingDetails: {
    bank: '',
    account: '',
    branch: '',
    type: '',
  },
  vatSettings: {
    enabled: row.vat_enabled || false,
    percentage: row.vat_percentage || 15,
    registrationNumber: row.vat_number || '',
  },
});

export const profileService = {
  async get(): Promise<BusinessProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (error || !data) return null;

    const profile = mapProfile(data);

    const { data: banking } = await supabase
      .from('banking_details')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .maybeSingle();

    if (banking) {
      profile.bankingDetails = {
        bank: banking.bank_name || '',
        account: banking.account_number || '',
        branch: banking.branch_code || '',
        type: banking.account_type || '',
      };
    }

    return profile;
  },

  async update(updates: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const nameParts = (updates.ownerName || '').split(' ');
    const dbUpdates: Record<string, any> = {};

    if (updates.businessName !== undefined) dbUpdates.business_name = updates.businessName;
    if (updates.ownerName !== undefined) {
      dbUpdates.first_name = nameParts[0] || '';
      dbUpdates.last_name = nameParts.slice(1).join(' ') || '';
    }
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.city !== undefined) dbUpdates.city = updates.city;
    if (updates.postalCode !== undefined) dbUpdates.postal_code = updates.postalCode;
    if (updates.vatSettings) {
      dbUpdates.vat_enabled = updates.vatSettings.enabled;
      dbUpdates.vat_percentage = updates.vatSettings.percentage;
      dbUpdates.vat_number = updates.vatSettings.registrationNumber;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', user.id)
      .select()
      .maybeSingle();
    if (error) throw error;

    if (updates.bankingDetails) {
      await supabase
        .from('banking_details')
        .upsert({
          user_id: user.id,
          bank_name: updates.bankingDetails.bank,
          account_number: updates.bankingDetails.account,
          branch_code: updates.bankingDetails.branch,
          account_type: updates.bankingDetails.type,
          account_holder: updates.businessName || data.business_name || '',
          is_primary: true,
        }, { onConflict: 'user_id' });
    }

    return (await profileService.get())!;
  },

  async getInvoicePrefix(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'INV';
    const { data } = await supabase
      .from('profiles')
      .select('invoice_prefix')
      .eq('id', user.id)
      .maybeSingle();
    return data?.invoice_prefix || 'INV';
  },
};
