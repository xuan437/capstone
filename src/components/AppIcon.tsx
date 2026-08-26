import React from "react";

export type IconSize = "sm" | "md" | "lg" | "xl" | number;

interface AppIconProps {
  name: string;
  size?: IconSize;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = "md",
  color,
  className = "",
  style,
}) => {
  const sizeMap: Record<string, number> = {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  };

  const fontSize = typeof size === "number" ? `${size}px` : `${sizeMap[size] || 20}px`;

  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontSize,
        lineHeight: 1,
        color: color || undefined,
        fontVariationSettings: "'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 24",
        ...style,
      }}
    >
      {name}
    </span>
  );
};

export default AppIcon;
