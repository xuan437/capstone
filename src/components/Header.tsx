
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
    <div className="logo-area" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <span className="material-symbols-outlined logo-icon">how_to_vote</span>
      <span className="logo-text">Student Voting System</span>
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
