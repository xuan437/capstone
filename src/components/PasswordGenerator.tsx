import React, { useState } from "react";

interface PasswordGeneratorProps {
  onGenerate?: (password: string) => void;
  initialLength?: number;
}

export const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({ 
  onGenerate,
  initialLength = 5 
}) => {
  const [password, setPassword] = useState<string>("");

  const generatePassword = (): void => {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    
    // Guarantee at least one of each required type
    const guaranteed = [
      uppercase[Math.floor(Math.random() * uppercase.length)],
      lowercase[Math.floor(Math.random() * lowercase.length)],
      numbers[Math.floor(Math.random() * numbers.length)]
    ];

    // Pool of all characters for the remaining slots
    const allChars = uppercase + lowercase + numbers;
    const remainingLength = initialLength - guaranteed.length;

    for (let i = 0; i < remainingLength; i++) {
      guaranteed.push(allChars[Math.floor(Math.random() * allChars.length)]);
    }

    // Shuffle the array to randomize the position of guaranteed characters
    const shuffledPassword = guaranteed
      .sort(() => Math.random() - 0.5)
      .join("");

    setPassword(shuffledPassword);
    if (onGenerate) {
      onGenerate(shuffledPassword);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--bg-main, #FFFFFF)",
        border: "1px solid var(--border-light, #E2E8F0)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
        maxWidth: "320px",
        margin: "12px auto",
        textAlign: "center",
      }}
    >
      <h3 style={{ margin: "0 0 8px 0", color: "var(--text-main, #0F172A)", fontSize: "16px" }}>
        Auto-Generate Password
      </h3>
      <p style={{ margin: "0 0 16px 0", color: "var(--text-muted, #64748B)", fontSize: "13px" }}>
        Generate a random {initialLength}-character password
      </p>

      {/* Password Display Box */}
      <div
        style={{
          width: "100%",
          padding: "10px",
          background: "var(--bg-card, #F8FAFC)",
          border: "1px solid var(--border-light, #E2E8F0)",
          borderRadius: "6px",
          fontSize: "18px",
          fontWeight: 700,
          fontFamily: "monospace",
          letterSpacing: "0.15em",
          color: password ? "var(--text-main, #0F172A)" : "#94A3B8",
          marginBottom: "16px",
          minHeight: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        {password || "•••••"}
      </div>

      {/* Generate Button */}
      <button
        type="button"
        onClick={generatePassword}
        className="btn-primary"
        style={{
          width: "100%",
          padding: "10px 16px",
          fontSize: "13px",
          fontWeight: 600,
        }}
      >
        Generate
      </button>
    </div>
  );
};

export default PasswordGenerator;
