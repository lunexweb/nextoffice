import type { Invoice, Commitment } from '@/types';

export interface ScoredClient {
  score: number;
  isNew: boolean;
  signal: 'new' | 'excellent' | 'good' | 'attention' | 'risk' | 'poor';
  label: string;
  longLabel: string;
  colorClasses: string;
  dotColor: string;
}

/**
 * Behaviour-based scoring model.
 *
 * Base score:
 *   70  — client has at least one active recurring invoice (is_recurring + status='sent')
 *   60  — standard client
 *
 * Events:
 * +10  Paid on time (no commitment needed, paid_date <= due_date)
 * +8   Owner manually approved a commitment (verified by business owner)
 * +6   Commitment system-completed + invoice paid
 * +3   Paid after making a commitment (honoured their word even if late)
 * +1   Requested an extension (proactive communication)
 * -4   Paid late with no commitment and no communication
 * -10  Made a commitment and broke it (invoice still overdue)
 *
 * Neutral: overdue with no commitment (they may still pay)
 *
 * Project completion:
 * -4   project_completed for 3+ days without payment (client was given time)
 * -10  project_completed for 3+ days WITH a project_completion commitment (broke their word)
 */
export function computeClientScore(
  invoices: Invoice[],
  commitments: Commitment[],
  clientIsRecurring = false
): { score: number; isNew: boolean } {
  if (invoices.length === 0) return { score: 60, isNew: true };

  // Base: 70 for recurring clients (explicitly set by owner), 60 for once-off
  let score = clientIsRecurring ? 70 : 60;
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (const inv of invoices) {
    const invCommitments = commitments.filter(c => c.invoiceId === inv.id);
    const hasCommitment = invCommitments.length > 0;
    const dueDate = new Date(inv.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    // Extension requests: +1 each (proactive communication)
    const extensionCount = invCommitments.filter(c => c.type === 'extension').length;
    score += extensionCount;

    if (inv.status === 'paid') {
      if (hasCommitment) {
        const ownerApproved = invCommitments.find(c => c.status === 'approved');
        const systemCompleted = invCommitments.find(c => c.status === 'completed');
        if (ownerApproved) {
          score += 8; // Owner manually verified — strongest positive signal
        } else if (systemCompleted) {
          score += 6; // System-recorded kept commitment
        } else {
          score += 3; // Paid but commitment not formally completed
        }
      } else {
        const paidDate = inv.paidDate ? new Date(inv.paidDate) : null;
        if (paidDate && paidDate <= dueDate) {
          score += 10; // Paid on time, no commitment needed
        } else {
          score -= 4; // Paid late with no communication
        }
      }
    } else if (inv.status === 'project_completed') {
      // Project is done but not yet paid
      const daysSinceCompletion = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const projectCommitment = invCommitments.find(c => c.type === 'project_completion');
      const graceDays = projectCommitment?.details?.followup_days ?? 3;

      if (daysSinceCompletion >= graceDays) {
        if (projectCommitment) {
          score -= 10; // Committed to pay on completion, past grace period without payment
        } else {
          score -= 4; // Project done past grace period, no payment yet
        }
      }
      // Within grace period: no impact
    } else if (inv.status === 'overdue') {
      if (hasCommitment) {
        const brokenCommitment = invCommitments.find(
          c => c.status === 'pending' || c.status === 'declined' || c.status === 'cancelled'
        );
        if (brokenCommitment) {
          score -= 10; // Made a commitment, broke it
        }
        // Unresolved commitment on overdue: wait and see
      }
      // Overdue with no commitment: neutral — they may still pay
    }
    // 'sent' invoices: no impact yet
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    isNew: false,
  };
}

export function getReliabilityTier(score: number, isNew: boolean): ScoredClient {
  if (isNew) return {
    score,
    isNew: true,
    signal: 'new',
    label: 'New',
    longLabel: 'New Client',
    colorClasses: 'text-blue-600 bg-blue-50 border-blue-200',
    dotColor: 'bg-gray-400',
  };
  if (score >= 85) return {
    score, isNew: false, signal: 'excellent',
    label: 'Excellent', longLabel: 'Excellent Client',
    colorClasses: 'text-emerald-700 bg-emerald-100 border-emerald-200',
    dotColor: 'bg-emerald-500',
  };
  if (score >= 70) return {
    score, isNew: false, signal: 'good',
    label: 'Good', longLabel: 'Good Client',
    colorClasses: 'text-green-700 bg-green-100 border-green-200',
    dotColor: 'bg-green-500',
  };
  if (score >= 50) return {
    score, isNew: false, signal: 'attention',
    label: 'Average', longLabel: 'Average Client',
    colorClasses: 'text-amber-700 bg-amber-100 border-amber-200',
    dotColor: 'bg-amber-500',
  };
  if (score >= 30) return {
    score, isNew: false, signal: 'risk',
    label: 'Below Average', longLabel: 'Below Average Client',
    colorClasses: 'text-orange-700 bg-orange-100 border-orange-200',
    dotColor: 'bg-orange-500',
  };
  return {
    score, isNew: false, signal: 'poor',
    label: 'Unreliable', longLabel: 'Unreliable Client',
    colorClasses: 'text-red-700 bg-red-100 border-red-300',
    dotColor: 'bg-red-600',
  };
}

export function computeAndRateClient(
  invoices: Invoice[],
  commitments: Commitment[],
  clientIsRecurring = false
): ScoredClient {
  const { score, isNew } = computeClientScore(invoices, commitments, clientIsRecurring);
  return getReliabilityTier(score, isNew);
}
