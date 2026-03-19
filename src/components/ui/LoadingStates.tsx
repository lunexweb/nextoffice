import { cn } from "@/lib/utils";

export function LoadingSpinner({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8",
  };

  return (
    <div className={cn(
      "animate-spin rounded-full border-2 border-primary/20 border-t-primary transition-all duration-300",
      sizeClasses[size],
      className
    )} />
  );
}

export function PageLoading({ message = "Loading...", showBackground = true }: { 
  message?: string; 
  showBackground?: boolean;
}) {
  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center transition-all duration-300",
      showBackground && "bg-background/50 backdrop-blur-sm"
    )}>
      <div className="text-center space-y-4 animate-fade-in">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground font-medium animate-slide-up">{message}</p>
      </div>
    </div>
  );
}

export function SectionLoading({ message = "Loading...", height = "h-32" }: { 
  message?: string; 
  height?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center", height)}>
      <div className="text-center space-y-3">
        <LoadingSpinner size="md" />
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      </div>
    </div>
  );
}

export function ButtonLoading({ text }: { text?: string }) {
  return (
    <div className="flex items-center gap-2">
      <LoadingSpinner size="sm" />
      {text && <span>{text}</span>}
    </div>
  );
}

export function OverlayLoading({ message = "Processing..." }: { message?: string }) {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
      <div className="text-center space-y-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function ProgressiveLoader({ 
  isLoading, 
  children, 
  fallback 
}: { 
  isLoading: boolean; 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}) {
  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
          <LoadingSpinner size="md" />
        </div>
      )}
      <div className={cn("transition-opacity duration-300", isLoading && "opacity-50")}>
        {children}
      </div>
      {!isLoading && !children && fallback}
    </div>
  );
}

export const loadingStyles = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }
  
  .animate-slide-up {
    animation: slide-up 0.4s ease-out;
  }
`;
