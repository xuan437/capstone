import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from "react";
import { RotateCw, Volume2, CheckCircle2, ShieldCheck } from "lucide-react";
import "./Captcha.css";

const CHAR_POOL = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Excludes confusable 0, O, 1, I, l
const CODE_LENGTH = 5;

export interface CaptchaRef {
  refresh: () => void;
  isValid: () => boolean;
  getCode: () => string;
}

interface CaptchaProps {
  value: string;
  onChange: (value: string) => void;
  onValidate?: (isValid: boolean) => void;
  disabled?: boolean;
  error?: boolean;
}

export const Captcha = forwardRef<CaptchaRef, CaptchaProps>(
  ({ value, onChange, onValidate, disabled = false, error = false }, ref) => {
    const [code, setCode] = useState("");
    const [isRotating, setIsRotating] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Generate random alphanumeric security code
    const generateCode = useCallback(() => {
      let result = "";
      for (let i = 0; i < CODE_LENGTH; i++) {
        const randomIndex = Math.floor(Math.random() * CHAR_POOL.length);
        result += CHAR_POOL[randomIndex];
      }
      return result;
    }, []);

    // Draw distorted canvas captcha
    const drawCaptcha = useCallback((textCode: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const isLightTheme = document.documentElement.getAttribute("data-theme") === "light";

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      if (isLightTheme) {
        bgGrad.addColorStop(0, "#f8fafc");
        bgGrad.addColorStop(1, "#e2e8f0");
      } else {
        bgGrad.addColorStop(0, "#061a14");
        bgGrad.addColorStop(1, "#030c09");
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Random noise lines
      const lineColors = isLightTheme
        ? ["rgba(16, 185, 129, 0.4)", "rgba(59, 130, 246, 0.4)", "rgba(236, 72, 153, 0.4)", "rgba(100, 116, 139, 0.3)"]
        : ["rgba(16, 185, 129, 0.45)", "rgba(56, 189, 248, 0.45)", "rgba(244, 114, 182, 0.45)", "rgba(148, 163, 184, 0.35)"];

      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = lineColors[i % lineColors.length];
        ctx.lineWidth = 1 + Math.random() * 1.5;
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.bezierCurveTo(
          Math.random() * width,
          Math.random() * height,
          Math.random() * width,
          Math.random() * height,
          Math.random() * width,
          Math.random() * height
        );
        ctx.stroke();
      }

      // Random noise dots
      for (let i = 0; i < 35; i++) {
        ctx.fillStyle = lineColors[Math.floor(Math.random() * lineColors.length)];
        ctx.beginPath();
        ctx.arc(Math.random() * width, Math.random() * height, 1 + Math.random(), 0, Math.PI * 2);
        ctx.fill();
      }

      // Character colors
      const textColors = isLightTheme
        ? ["#047857", "#1d4ed8", "#be185d", "#b45309", "#4338ca"]
        : ["#34d399", "#38bdf8", "#f472b6", "#fbbf24", "#a78bfa"];

      // Render each character with individual angle, scale, and color
      const charSpacing = width / (textCode.length + 1);
      ctx.textBaseline = "middle";

      for (let i = 0; i < textCode.length; i++) {
        const char = textCode[i];
        ctx.save();
        const x = charSpacing * (i + 0.9);
        const y = height / 2 + (Math.random() * 6 - 3);
        const angle = (Math.random() * 24 - 12) * (Math.PI / 180);

        ctx.translate(x, y);
        ctx.rotate(angle);

        const fontSize = 21 + Math.floor(Math.random() * 4);
        ctx.font = `700 ${fontSize}px "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace`;
        ctx.fillStyle = textColors[i % textColors.length];
        ctx.shadowColor = isLightTheme ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 3;
        ctx.fillText(char, -8, 0);

        ctx.restore();
      }
    }, []);

    // Refresh function
    const refresh = useCallback(() => {
      const newCode = generateCode();
      setCode(newCode);
      setIsRotating(true);
      setTimeout(() => setIsRotating(false), 500);
      setTimeout(() => drawCaptcha(newCode), 10);
    }, [generateCode, drawCaptcha]);

    // Initial generation and theme observer
    useEffect(() => {
      const initialCode = generateCode();
      setCode(initialCode);
      setTimeout(() => drawCaptcha(initialCode), 10);

      // Re-render canvas if theme changes
      const observer = new MutationObserver(() => {
        if (code) {
          drawCaptcha(code);
        }
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });

      return () => observer.disconnect();
    }, [generateCode, drawCaptcha]);

    // Validate match
    const isValid = useCallback(() => {
      return value.trim().toUpperCase() === code.trim().toUpperCase();
    }, [value, code]);

    useEffect(() => {
      if (onValidate) {
        onValidate(isValid());
      }
    }, [value, code, isValid, onValidate]);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      refresh,
      isValid,
      getCode: () => code,
    }));

    // Text to speech audio playback for accessibility
    const handleSpeak = (e: React.MouseEvent) => {
      e.preventDefault();
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();

      // Read each letter distinctly with a pause
      const spaced = code.split("").join(" . ");
      const utterance = new SpeechSynthesisUtterance(spaced);
      utterance.rate = 0.75;
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    };

    const isMatch = value.trim().length === CODE_LENGTH && isValid();

    return (
      <div className="linear-captcha-container">
        <label className="linear-field-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <ShieldCheck size={13} style={{ color: "var(--linear-accent, #10b981)" }} />
            Security Code (CAPTCHA)
          </span>
          {isMatch && (
            <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "3px" }}>
              <CheckCircle2 size={12} /> Verified
            </span>
          )}
        </label>

        {/* Captcha Visual Challenge & Action Buttons */}
        <div className="linear-captcha-challenge">
          <canvas
            ref={canvasRef}
            width={140}
            height={38}
            className="linear-captcha-canvas"
            onClick={refresh}
            title="Click image to refresh security code"
          />

          <div className="linear-captcha-actions">
            <button
              type="button"
              className={`linear-captcha-btn ${isRotating ? "rotating" : ""}`}
              onClick={refresh}
              disabled={disabled}
              title="Generate new security code"
              aria-label="Refresh security code"
            >
              <RotateCw size={14} />
            </button>
            {"speechSynthesis" in window && (
              <button
                type="button"
                className="linear-captcha-btn"
                onClick={handleSpeak}
                disabled={disabled}
                title="Play audio of security code"
                aria-label="Play security code audio"
              >
                <Volume2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Captcha Text Input */}
        <div className="linear-input-wrapper">
          <span className="linear-input-icon">
            <ShieldCheck size={14} />
          </span>
          <input
            type="text"
            className="linear-input"
            placeholder="Type 5-character code"
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            maxLength={CODE_LENGTH}
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              fontWeight: 600,
              fontFamily: "var(--linear-font-mono, monospace)",
              borderColor: error ? "#ef4444" : isMatch ? "#10b981" : undefined,
            }}
          />
          {isMatch && (
            <span className="linear-captcha-status valid">
              <CheckCircle2 size={15} />
            </span>
          )}
        </div>
      </div>
    );
  }
);

Captcha.displayName = "Captcha";
