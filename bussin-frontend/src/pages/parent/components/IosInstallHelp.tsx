import {
  BellRing,
  Ellipsis,
  SquareArrowUp,
  X,
} from "lucide-react";
import { useState } from "react";

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

function isIosDevice() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandaloneApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as NavigatorWithStandalone).standalone === true
  );
}

export function IosInstallHelp() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isIosDevice() || isStandaloneApp()) {
    return null;
  }

  return (
    <>
      <button
        className="iosInstallHelpButton"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <BellRing aria-hidden="true" />
        <span>Get alerts</span>
      </button>

      {isOpen ? (
        <section
          className="iosInstallHelpOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Add Bussin to the Home Screen to receive alerts"
        >
          <button
            className="iosInstallHelpClose"
            type="button"
            aria-label="Close installation help"
            onClick={() => setIsOpen(false)}
          >
            <X />
          </button>

          <div
            className="iosSafariPaths"
            aria-label="In Safari, tap the Share button, or tap More and then Share"
          >
            <span className="iosSafariPath">
              <SquareArrowUp aria-hidden="true" />
              <strong>Share</strong>
            </span>
            <span className="iosSafariOr">or</span>
            <span className="iosSafariPath iosSafariPathMore">
              <Ellipsis aria-hidden="true" />
              <span className="iosSafariPathArrow">›</span>
              <SquareArrowUp aria-hidden="true" />
              <strong>More → Share</strong>
            </span>
          </div>

          <div className="iosInstallGuide">
            <img
              className="iosInstallGuideWide"
              src="/bussin-ios-install-guide.png"
              alt="Tap Share, choose Add to Home Screen, then open Bussin"
            />

            <div className="iosInstallGuideMobile" aria-hidden="true">
              {["one", "two", "three"].map((panel) => (
                <span
                  className={`iosInstallGuidePanel iosInstallGuidePanel-${panel}`}
                  key={panel}
                >
                  <img src="/bussin-ios-install-guide.png" alt="" />
                </span>
              ))}
            </div>
          </div>

          <p className="iosInstallFallback">
            <strong>Not listed?</strong>
            <span>Scroll down → Edit Actions → Add to Home Screen</span>
          </p>
        </section>
      ) : null}
    </>
  );
}
