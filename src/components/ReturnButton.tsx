import React from "react";

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
    >
      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
        arrow_back
      </span>
      {label}
    </button>
  </div>
);

export default ReturnButton;
