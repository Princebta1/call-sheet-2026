import { useState } from "react";
import { Clapperboard } from "lucide-react";

interface ShowPreviewProps {
  thumbnailURL?: string | null;
  showTitle: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ShowPreview({
  thumbnailURL,
  showTitle,
  size = "md",
  className = "",
}: ShowPreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Size classes for different variants
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  const iconSizes = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-10 w-10",
  };

  // If no thumbnail or image failed to load, show fallback
  const shouldShowFallback = !thumbnailURL || imageError;

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`${sizeClasses[size]} rounded-xl overflow-hidden bg-gradient-to-br from-cinematic-gold-500/20 to-cinematic-gold-600/20 border border-cinematic-gold-500/30 flex items-center justify-center`}
      >
        {shouldShowFallback ? (
          <Clapperboard className={`${iconSizes[size]} text-cinematic-gold-400`} />
        ) : (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cinematic-gold-500"></div>
              </div>
            )}
            <img
              src={thumbnailURL}
              alt={showTitle}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onError={() => {
                setImageError(true);
                setImageLoaded(true);
              }}
              onLoad={() => setImageLoaded(true)}
            />
          </>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg shadow-xl whitespace-nowrap">
          <div className="text-xs font-medium text-white">{showTitle}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}
