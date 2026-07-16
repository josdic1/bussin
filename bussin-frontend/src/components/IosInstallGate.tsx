import {
  AppWindow,
  Ellipsis,
  HousePlus,
  RotateCcw,
  SquareArrowUp,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import "./IosInstallGate.css";

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

type IosInstallGateProps = {
  appName: string;
  storageKey: string;
  children: ReactNode;
};

type InstallPhase = "GUIDE" | "DONE" | "HIDDEN";

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

function loadInitialPhase(storageKey: string): InstallPhase {
  if (!isIosDevice() || isStandaloneApp()) {
    return "HIDDEN";
  }

  return localStorage.getItem(storageKey) ? "HIDDEN" : "GUIDE";
}

export function IosInstallGate({
  appName,
  storageKey,
  children,
}: IosInstallGateProps) {
  const [phase, setPhase] = useState<InstallPhase>(() =>
    loadInitialPhase(storageKey),
  );

  if (phase === "HIDDEN") {
    return children;
  }

  function finishGuide() {
    localStorage.setItem(storageKey, "true");
    setPhase("DONE");
  }

  function showGuideAgain() {
    localStorage.removeItem(storageKey);
    setPhase("GUIDE");
  }

  if (phase === "DONE") {
    return (
      <section className="iosInstallGate iosInstallGateDone">
        <div className="iosInstallGateDoneCard">
          <p className="iosInstallGateKicker">Last step</p>
          <h1>Close Safari.</h1>

          <img
            className="iosInstallGateAppIcon"
            src="/apple-touch-icon.png"
            alt=""
          />

          <p className="iosInstallGateDoneAction">
            Open <strong>{appName}</strong> from your Home Screen.
          </p>

          <button
            className="iosInstallGateAgain"
            type="button"
            onClick={showGuideAgain}
          >
            <RotateCcw aria-hidden="true" />
            Show the steps again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="iosInstallGate"
      aria-label={`Add ${appName} to your Home Screen`}
    >
      <div className="iosInstallGateInner">
        <header className="iosInstallGateHeader">
          <p className="iosInstallGateKicker">One-time setup</p>
          <h1>Add the app to your Home Screen.</h1>
          <p>Do these three steps before using {appName}.</p>
        </header>

        <ol className="iosInstallGateSteps">
          <li className="iosInstallGateStep">
            <span className="iosInstallGateNumber">1</span>
            <div className="iosInstallGateStepBody">
              <div className="iosInstallGateShareChoices" aria-hidden="true">
                <span>
                  <SquareArrowUp />
                </span>
                <b>or</b>
                <span>
                  <Ellipsis />
                  <i>›</i>
                  <SquareArrowUp />
                </span>
              </div>
              <strong>Open Share</strong>
              <small>Tap Share—or More, then Share.</small>
            </div>
          </li>

          <li className="iosInstallGateStep">
            <span className="iosInstallGateNumber">2</span>
            <div className="iosInstallGateStepBody">
              <HousePlus aria-hidden="true" />
              <strong>Add to Home Screen</strong>
              <small>Scroll down. If missing: Edit Actions.</small>
            </div>
          </li>

          <li className="iosInstallGateStep">
            <span className="iosInstallGateNumber">3</span>
            <div className="iosInstallGateStepBody">
              <AppWindow aria-hidden="true" />
              <strong>Tap Add</strong>
              <small>Leave “Open as Web App” turned on.</small>
            </div>
          </li>
        </ol>

        <button
          className="iosInstallGateConfirm"
          type="button"
          onClick={finishGuide}
        >
          I added it
        </button>
      </div>
    </section>
  );
}
