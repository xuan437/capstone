import React from "react";
import { useTheme } from "../context/ThemeContext";
import "./ThemeToggle.css";

interface ThemeToggleProps {
  compact?: boolean;
  showLabel?: boolean;
}

const SunIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="theme-switch-svg"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="theme-switch-svg"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

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
        <div className="theme-switch-knob">
          {isDark ? <MoonIcon /> : <SunIcon />}
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

