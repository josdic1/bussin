import {
  AppWindow,
  ArrowDown,
  Check,
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
          <h1>Add {appName}.</h1>
          <p>Do these three steps in Safari.</p>
        </header>

        <ol className="iosInstallSteps">
          <li className="iosInstallStep">
            <span className="iosInstallStepNumber">1</span>
            <span className="iosInstallStepIcon" aria-hidden="true">
              <SquareArrowUp />
            </span>
            <span className="iosInstallStepCopy">
              <strong>Tap Share</strong>
              <small>
                If you see <Ellipsis aria-hidden="true" /> first, tap it,
                then tap Share.
              </small>
            </span>
          </li>

          <li className="iosInstallStep">
            <span className="iosInstallStepNumber">2</span>
            <span className="iosInstallStepIcon" aria-hidden="true">
              <HousePlus />
            </span>
            <span className="iosInstallStepCopy">
              <strong>Add to Home Screen</strong>
              <small>Scroll down to find it.</small>
            </span>
          </li>

          <li className="iosInstallStep">
            <span className="iosInstallStepNumber">3</span>
            <span className="iosInstallStepIcon" aria-hidden="true">
              <AppWindow />
            </span>
            <span className="iosInstallStepCopy">
              <strong>Tap Add</strong>
              <small>Keep “Open as Web App” turned on.</small>
            </span>
          </li>
        </ol>

        <button
          className="iosInstallGateConfirm"
          type="button"
          onClick={finishGuide}
        >
          <span className="iosInstallConfirmBox" aria-hidden="true">
            <Check />
          </span>
          <span>I added {appName}</span>
        </button>

        <div className="iosInstallTapHere" aria-hidden="true">
          <span>Tap here</span>
          <ArrowDown />
        </div>
      </div>
    </section>
  );
}
