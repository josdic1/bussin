import {
  ArrowDown,
  ChevronDown,
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

function loadInitialPhase(): InstallPhase {
  if (!isIosDevice() || isStandaloneApp()) {
    return "HIDDEN";
  }

  return "GUIDE";
}

export function IosInstallGate({
  appName,
  storageKey,
  children,
}: IosInstallGateProps) {
  const [phase, setPhase] = useState<InstallPhase>(loadInitialPhase);
  const audience = appName === "Bussin Driver" ? "DRIVER" : "PARENTS";

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
        <header className="iosInstallBrand">
          <div className="iosInstallBrandCopy">
            <strong>BUSSIN</strong>
            <span aria-hidden="true">•</span>
            <b>{audience}</b>
          </div>
          <span className="iosInstallBrandBus" aria-hidden="true">
            <img src="/icon-bus-acid.svg" alt="" />
          </span>
        </header>

        <div className="iosInstallHero">
          <header className="iosInstallGateHeader">
            <p className="iosInstallGateKicker">One tap from home</p>
            <h1>Keep Bussin close.</h1>
            <p>Put the {appName} icon on your Home Screen.</p>
          </header>

          <p className="iosInstallSafariShortcut">
            Already see Share? Start at 2.
          </p>

          <ol className="iosInstallFlow">
            <li className="iosInstallStep">
              <span className="iosInstallStepIcon" aria-hidden="true">
                <Ellipsis />
              </span>
              <span className="iosInstallStepCopy">
                <small>1</small>
                <strong>Tap More</strong>
              </span>
            </li>

            <li className="iosInstallStep">
              <span className="iosInstallStepIcon" aria-hidden="true">
                <SquareArrowUp />
              </span>
              <span className="iosInstallStepCopy">
                <small>2</small>
                <strong>Tap Share</strong>
              </span>
            </li>

            <li className="iosInstallStep">
              <span className="iosInstallStepIcon" aria-hidden="true">
                <ChevronDown />
              </span>
              <span className="iosInstallStepCopy">
                <small>3</small>
                <strong>View More</strong>
              </span>
            </li>

            <li className="iosInstallStep">
              <span className="iosInstallStepIcon" aria-hidden="true">
                <HousePlus />
              </span>
              <span className="iosInstallStepCopy">
                <small>4</small>
                <strong>Add to Home Screen</strong>
              </span>
            </li>
          </ol>

          <p className="iosInstallFinalInstruction">
            Keep <strong>Open as Web App</strong> on. Tap <strong>Add</strong>.
          </p>

          <button
            className="iosInstallGateConfirm"
            type="button"
            onClick={finishGuide}
          >
            I tapped Add
          </button>
        </div>

        <div className="iosInstallTapHere" aria-hidden="true">
          <span>Tap •••</span>
          <ArrowDown />
        </div>
      </div>
    </section>
  );
}
