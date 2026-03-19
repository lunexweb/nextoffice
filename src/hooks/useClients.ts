import { useState, useEffect } from 'react';
import { Client, ClientFormData } from '@/types';
import { clientService } from '@/services/api/clientService';

export const useClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoading(true);
        const data = await clientService.getAll();
        setClients(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load clients');
      } finally {
        setLoading(false);
      }
    };
    loadClients();
  }, []);

  const createClient = async (data: ClientFormData): Promise<Client | null> => {
    try {
      setLoading(true);
      setError(null);
      const newClient = await clientService.create(data);
      setClients(prev => [newClient, ...prev]);
      return newClient;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateClient = async (id: string, data: Partial<ClientFormData>): Promise<Client | null> => {
    try {
      setLoading(true);
      setError(null);
      const updated = await clientService.update(id, data);
      setClients(prev => prev.map(c => c.id === id ? updated : c));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteClient = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await clientService.delete(id);
      setClients(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { clients, loading, error, createClient, updateClient, deleteClient };
};
