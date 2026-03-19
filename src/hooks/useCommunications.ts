import { useState, useEffect } from 'react';
import { CommunicationLog, CommunicationAnalytics } from '@/types';
import { communicationService } from '@/services/api/communicationService';

export const useCommunications = () => {
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [analytics, setAnalytics] = useState<CommunicationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [logsData, analyticsData] = await Promise.all([
          communicationService.getAll(),
          communicationService.getAnalytics(),
        ]);
        setLogs(logsData);
        setAnalytics(analyticsData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load communications');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return { logs, analytics, loading, error };
};
