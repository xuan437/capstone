

const ReturnButton = ({ onClick }: { onClick: (e?: any) => void }) => (
  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
    <button
      className="btn-outline-wide touch-animate"
      onClick={onClick}
      style={{
        width: "auto",
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
        arrow_back
      </span>
      Return
    </button>
  </div>
);

export default ReturnButton;
