
import { User } from "../types";
import Menu from "./Menu";
import { ThemeToggle } from "./ThemeToggle";
import { Vote } from "lucide-react";

const Header = ({
  currentUser,
  handleLogout,
}: {
  currentUser: User | null;
  handleLogout: () => void;
}) => (
  <header className="top-header">
    <div className="logo-area" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{
        width: "26px",
        height: "26px",
        borderRadius: "6px",
        backgroundColor: "var(--accent-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff"
      }}>
        <Vote size={15} />
      </div>
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
