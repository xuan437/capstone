import React from "react";
import { useTheme } from "../context/ThemeContext";
import "./ThemeToggle.css";

interface ThemeToggleProps {
  compact?: boolean;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  compact = false,
  showLabel = false,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="theme-switch-container">
      <button
        type="button"
        className={`theme-switch-track ${isDark ? "dark" : ""}`}
        onClick={toggleTheme}
        title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
        aria-label="Toggle Theme Mode"
      >
        {/* Background Star Accents for Dark Mode */}
        <div className="theme-switch-bg-stars">
          <span className="star-dot" style={{ marginTop: "-6px" }} />
          <span className="star-dot" style={{ marginTop: "6px" }} />
          <span className="star-dot" style={{ marginTop: "-2px" }} />
        </div>

        {/* Sliding 3D Circular Knob with Sun/Moon Icon */}
        <div className="theme-switch-knob">
          <span className="material-symbols-outlined theme-switch-icon">
            {isDark ? "dark_mode" : "light_mode"}
          </span>
        </div>
      </button>

      {showLabel && !compact && (
        <span className="theme-switch-label-text">
          {isDark ? "Dark Mode" : "Light Mode"}
        </span>
      )}
    </div>
  );
};
