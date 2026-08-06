import React from "react";

const BubbleLoader: React.FC<{ message?: string }> = ({ message = "Loading..." }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
      <div className="bubble-loader-container">
        <div className="bubble-loader-dot" />
        <div className="bubble-loader-dot" />
        <div className="bubble-loader-dot" />
      </div>
      {message && (
        <p style={{ marginTop: "12px", fontSize: "14px", fontWeight: 600, color: "#0B1736", letterSpacing: "0.02em" }}>
          {message}
        </p>
      )}
    </div>
  );
};

export default BubbleLoader;
