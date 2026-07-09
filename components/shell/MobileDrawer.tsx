export function MobileDrawerToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      className="sidebar-toggle"
      id="sidebarToggle"
      type="button"
      aria-label={open ? "Close navigation menu" : "Open navigation menu"}
      aria-expanded={open}
      onClick={onToggle}
    >
      <span className="sidebar-toggle-bars" aria-hidden="true">
        <span />
      </span>
    </button>
  );
}

export function MobileDrawerBackdrop({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div
      className={`sidebar-backdrop${open ? " is-visible" : ""}`}
      id="sidebarBackdrop"
      aria-hidden="true"
      onClick={onClose}
    />
  );
}
