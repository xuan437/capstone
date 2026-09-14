
import { User } from "../types";
import Menu from "./Menu";
import { ThemeToggle } from "./ThemeToggle";

const Header = ({
  currentUser,
  handleLogout,
}: {
  currentUser: User | null;
  handleLogout: () => void;
}) => (
  <header className="top-header">
    <div className="logo-area" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <img
        src="/logo.png"
        alt="School Logo"
        style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-light)" }}
      />
      <span className="logo-text" style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.01em" }}>Student Voting System</span>
      <ThemeToggle compact />
    </div>
    {currentUser && (
      <div
        className="header-right"
        style={{ display: "flex", alignItems: "center", gap: "12px" }}
      >
        <Menu currentUser={currentUser} handleLogout={handleLogout} />
      </div>
    )}
  </header>
);

export default Header;
