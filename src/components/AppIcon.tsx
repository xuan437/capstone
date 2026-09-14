import React from "react";
import {
  Clock,
  Vote,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  User,
  LogOut,
  Mail,
  Phone,
  Gavel,
  Shield,
  FileText,
  HelpCircle,
} from "lucide-react";

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

  const numericSize = typeof size === "number" ? size : sizeMap[size] || 20;

  const getIcon = () => {
    const props = { size: numericSize, color: color || undefined, className, style };
    switch (name) {
      case "schedule":
      case "clock":
        return <Clock {...props} />;
      case "how_to_vote":
      case "vote":
        return <Vote {...props} />;
      case "verified_user":
      case "shield-check":
        return <ShieldCheck {...props} />;
      case "check_circle":
        return <CheckCircle2 {...props} />;
      case "cancel":
      case "close":
        return <XCircle {...props} />;
      case "search":
        return <Search {...props} />;
      case "account_circle":
      case "person":
        return <User {...props} />;
      case "logout":
        return <LogOut {...props} />;
      case "mail":
        return <Mail {...props} />;
      case "call":
        return <Phone {...props} />;
      case "gavel":
        return <Gavel {...props} />;
      case "shield":
        return <Shield {...props} />;
      case "description":
        return <FileText {...props} />;
      default:
        return <HelpCircle {...props} />;
    }
  };

  return getIcon();
};

export default AppIcon;
