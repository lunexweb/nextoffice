import { LucideIcon } from 'lucide-react';
import { NOCard } from '@/components/nextoffice/shared';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <NOCard className={`p-12 text-center ${className}`}>
      <div className="flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon size={32} className="text-muted-foreground" />
        </div>
        <h3 className="font-serif text-xl font-bold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
    </NOCard>
  );
};
