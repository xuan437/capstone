import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MapPin, ShieldX, ShieldCheck, AlertTriangle, Loader2, RefreshCw, Info } from "lucide-react";
import { checkGeofence, GeofenceResult, GeofenceStatus } from "../../utils/geofencing";
import "./GeofenceBlocker.css";

interface GeofenceBlockerProps {
  /** Called when geofence check passes — caller may proceed */
  onAllowed: () => void;
  /** Called when user dismisses a hard block */
  onBlocked?: () => void;
}

type CheckPhase = "checking" | "done";

// Map status -> UI intent
function getIntent(status: GeofenceStatus): "blocked" | "allowed" | "warning" | "info" {
  switch (status) {
    case "allowed":          return "allowed";
    case "ip_allowed":       return "warning";
    case "unknown":          return "info";
    case "permission_denied":return "info";
    default:                 return "blocked";
  }
}

function getTitle(status: GeofenceStatus): string {
  switch (status) {
    case "allowed":           return "Location Verified";
    case "blocked":           return "Outside Voting Zone";
    case "ip_blocked":        return "Outside Voting Zone";
    case "permission_denied": return "Location Access Required";
    case "unavailable":       return "Location Unavailable";
    case "ip_allowed":        return "Location Soft-Verified";
    case "unknown":           return "Location Unverifiable";
    default:                  return "Location Check";
  }
}

function getSourceLabel(result: GeofenceResult): string {
  if (result.usedGps) return "Verified via GPS";
  if (result.status === "ip_allowed" || result.status === "ip_blocked")
    return `Verified via IP${result.detectedLocation ? " · " + result.detectedLocation : ""}`;
  return "Location service";
}

const GeofenceBlocker: React.FC<GeofenceBlockerProps> = ({ onAllowed, onBlocked }) => {
  const [phase, setPhase] = useState<CheckPhase>("checking");
  const [result, setResult] = useState<GeofenceResult | null>(null);
  const [retrying, setRetrying] = useState(false);

  const runCheck = async () => {
    setPhase("checking");
    setResult(null);
    const res = await checkGeofence();
    setResult(res);
    setPhase("done");

    // Auto-pass for "allowed" status
    if (res.status === "allowed") {
      setTimeout(() => onAllowed(), 900);
    }
  };

  useEffect(() => {
    runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    await runCheck();
    setRetrying(false);
  };

  const handleProceedAnyway = () => {
    // Only for "unknown" / "ip_allowed" statuses (soft-pass)
    onAllowed();
  };

  const intent = result ? getIntent(result.status) : "info";
  const isBlocked = result && (result.status === "blocked" || result.status === "ip_blocked");
  const isPermDenied = result?.status === "permission_denied";
  const isSoftPass = result && (result.status === "ip_allowed" || result.status === "unknown");
  const isAllowed = result?.status === "allowed";

  const cardClass = [
    "geo-card",
    phase === "checking" ? "status-checking" : `status-${result?.status ?? "checking"}`,
  ].join(" ");

  const iconWrapClass = ["geo-icon-wrap", `ic-${intent}`].join(" ");
  const titleClass = ["geo-title", `tc-${intent}`].join(" ");

  const modal = (
    <div className="geo-backdrop" role="dialog" aria-modal="true" aria-label="Location Verification">
      <div className={cardClass}>

        {/* Header */}
        <div className="geo-header">
          <div className={iconWrapClass}>
            {phase === "checking" ? (
              <Loader2 size={24} color="#93c5fd" />
            ) : isBlocked ? (
              <ShieldX size={24} color="#f87171" />
            ) : isAllowed ? (
              <ShieldCheck size={24} color="#34d399" />
            ) : isSoftPass ? (
              <AlertTriangle size={24} color="#fbbf24" />
            ) : (
              <MapPin size={24} color="#93c5fd" />
            )}
          </div>
          <div className="geo-title-group">
            <h2 className={titleClass}>
              {phase === "checking" ? "Verifying Location" : getTitle(result!.status)}
            </h2>
            <p className="geo-subtitle">Negros Oriental Voting Zone</p>
          </div>
        </div>

        {/* Body */}
        <div className="geo-body">
          {phase === "checking" ? (
            <div className="geo-checking">
              <div className="geo-pulse-ring">
                <MapPin size={26} className="geo-pulse-icon" />
              </div>
              <p className="geo-checking-label">
                Checking your location
                <span className="geo-dots">
                  <span /><span /><span />
                </span>
              </p>
              <p className="geo-checking-sub">Requesting GPS signal&hellip;</p>
            </div>
          ) : (
            <>
              {/* Status detail tag */}
              <div className={`geo-detail-tag dt-${intent}`}>
                <MapPin size={12} />
                {result?.detectedLocation
                  ? result.detectedLocation
                  : result?.usedGps
                  ? `GPS: ${result.latitude?.toFixed(4)}, ${result.longitude?.toFixed(4)}`
                  : "Network location"}
              </div>

              {/* Message */}
              <p className="geo-message">{result?.message}</p>

              {/* Coordinates (if GPS) */}
              {result?.usedGps && result.latitude != null && (
                <div className="geo-coords">
                  <div className="geo-coord-pill">
                    <strong>{result.latitude.toFixed(6)}</strong>
                    Latitude
                  </div>
                  <div className="geo-coord-pill">
                    <strong>{result.longitude?.toFixed(6)}</strong>
                    Longitude
                  </div>
                </div>
              )}

              {/* Instructions for permission denied */}
              {isPermDenied && (
                <div className="geo-instructions">
                  <div className="geo-instructions-title">How to enable location</div>
                  <ol>
                    <li>Click the lock/info icon in your browser address bar.</li>
                    <li>Set <strong>Location</strong> permission to <em>Allow</em>.</li>
                    <li>Reload the page and try again.</li>
                  </ol>
                </div>
              )}

              {/* Instructions for blocked */}
              {isBlocked && !isPermDenied && (
                <div className="geo-instructions">
                  <div className="geo-instructions-title">Voting restriction</div>
                  <ol>
                    <li>This election is exclusive to students within Negros Oriental, Philippines.</li>
                    <li>If you believe this is an error, ensure your device GPS is turned on.</li>
                    <li>Contact your school administrator if the issue persists.</li>
                  </ol>
                </div>
              )}

              {/* Soft-pass note */}
              {isSoftPass && (
                <div className="geo-instructions">
                  <div className="geo-instructions-title" style={{ color: "rgba(253,230,138,0.7)" }}>
                    <Info size={10} style={{ display: "inline", marginRight: 4 }} />
                    GPS not available
                  </div>
                  <ol>
                    <li>GPS could not confirm your exact location.</li>
                    <li>Network data suggests you may be within Negros Oriental.</li>
                    <li>You may proceed, but your vote may be subject to post-audit review.</li>
                  </ol>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {phase === "done" && (
          <div className="geo-footer">
            {isAllowed && (
              <button className="geo-btn geo-btn-success" onClick={onAllowed}>
                <ShieldCheck size={15} />
                Proceed to Ballot
              </button>
            )}

            {isBlocked && !isPermDenied && (
              <>
                <button className="geo-btn geo-btn-primary" onClick={onBlocked}>
                  <ShieldX size={15} />
                  Go Back
                </button>
                <button
                  className="geo-btn geo-btn-ghost"
                  onClick={handleRetry}
                  disabled={retrying}
                >
                  <RefreshCw size={13} style={retrying ? { animation: "geoSpin 1s linear infinite" } : {}} />
                  {retrying ? "Retrying…" : "Retry"}
                </button>
              </>
            )}

            {isPermDenied && (
              <>
                <button
                  className="geo-btn geo-btn-ghost"
                  onClick={handleRetry}
                  disabled={retrying}
                >
                  <RefreshCw size={13} />
                  {retrying ? "Retrying…" : "Retry After Enabling"}
                </button>
                <button className="geo-btn geo-btn-primary" onClick={onBlocked}>
                  <ShieldX size={15} />
                  Cancel
                </button>
              </>
            )}

            {isSoftPass && (
              <>
                <button className="geo-btn geo-btn-warning" onClick={handleProceedAnyway}>
                  <ShieldCheck size={15} />
                  Proceed Anyway
                </button>
                <button
                  className="geo-btn geo-btn-ghost"
                  onClick={handleRetry}
                  disabled={retrying}
                >
                  <RefreshCw size={13} />
                  {retrying ? "Retrying…" : "Retry GPS"}
                </button>
              </>
            )}
          </div>
        )}

        {/* Source attribution */}
        {phase === "done" && result && (
          <div className="geo-source-badge">
            <MapPin size={10} />
            {getSourceLabel(result)}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export { GeofenceBlocker };
