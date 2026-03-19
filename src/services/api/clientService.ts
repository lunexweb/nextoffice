import { supabase } from '@/lib/supabase';
import type { Client, ClientFormData } from '@/types';
import { slugify } from '@/utils/styles';

const mapClient = (row: any): Client => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone || '',
  address: row.address || '',
  city: row.city || '',
  postalCode: row.postal_code || '',
  clientType: row.client_type || 'individual',
  relationshipType: row.relationship_type || 'once_off',
  score: row.score || 0,
  level: row.level || 'New',
  status: row.status || 'active',
  color: row.color || 'muted',
  slug: row.slug,
});

export const clientService = {
  async getAll(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapClient);
  },

  async getBySlug(slug: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error) return null;
    return data ? mapClient(data) : null;
  },

  async create(formData: ClientFormData): Promise<Client> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('clients')
      .insert([{
        user_id: user.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        postal_code: formData.postalCode,
        client_type: formData.clientType || 'individual',
        relationship_type: formData.relationshipType || 'once_off',
        slug: slugify(formData.name),
        score: 0,
        level: 'New',
        status: 'active',
        color: 'muted',
      }])
      .select()
      .single();
    if (error) throw error;
    return mapClient(data);
  },

  async update(id: string, formData: Partial<ClientFormData>): Promise<Client> {
    const updateData: Record<string, any> = {};
    if (formData.name !== undefined) { updateData.name = formData.name; updateData.slug = slugify(formData.name); }
    if (formData.email !== undefined) updateData.email = formData.email;
    if (formData.phone !== undefined) updateData.phone = formData.phone;
    if (formData.address !== undefined) updateData.address = formData.address;
    if (formData.city !== undefined) updateData.city = formData.city;
    if (formData.postalCode !== undefined) updateData.postal_code = formData.postalCode;
    if (formData.clientType !== undefined) updateData.client_type = formData.clientType;
    if (formData.relationshipType !== undefined) updateData.relationship_type = formData.relationshipType;

    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapClient(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
  },
};
