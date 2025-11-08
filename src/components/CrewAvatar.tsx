import { useState } from "react";

interface CrewAvatarProps {
  name: string;
  profileImage?: string | null;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

export function CrewAvatar({
  name,
  profileImage,
  size = "md",
  showTooltip = true,
}: CrewAvatarProps) {
  const [showTooltipState, setShowTooltipState] = useState(false);

  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltipState(true)}
      onMouseLeave={() => setShowTooltipState(false)}
    >
      {profileImage ? (
        <img
          src={profileImage}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover border-2 border-gray-700`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-cinematic-blue-500 to-cinematic-blue-600 text-white font-semibold flex items-center justify-center border-2 border-gray-700`}
        >
          {getInitials(name)}
        </div>
      )}
      {showTooltip && showTooltipState && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50 border border-gray-700">
          {name}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}
