import React from "react";
import { ArrowLeft } from "lucide-react";

interface ReturnButtonProps {
  onClick: (e?: any) => void;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

const ReturnButton: React.FC<ReturnButtonProps> = ({
  onClick,
  label = "Return",
  className = "",
  style = {},
}) => (
  <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "20px", ...style }}>
    <button
      className={`btn-top-nav ${className}`}
      onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
    >
      <ArrowLeft size={16} />
      <span>{label}</span>
    </button>
  </div>
);

export default ReturnButton;
