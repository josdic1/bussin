import {
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
  allowBrowserUse?: boolean;
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

function loadInitialPhase(
  storageKey: string,
  allowBrowserUse: boolean,
): InstallPhase {
  if (!isIosDevice() || isStandaloneApp()) {
    return "HIDDEN";
  }

  if (allowBrowserUse && localStorage.getItem(storageKey) === "browser") {
    return "HIDDEN";
  }

  return "GUIDE";
}

export function IosInstallGate({
  appName,
  storageKey,
  allowBrowserUse = false,
  children,
}: IosInstallGateProps) {
  const [phase, setPhase] = useState<InstallPhase>(() =>
    loadInitialPhase(storageKey, allowBrowserUse),
  );
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

  function continueInBrowser() {
    localStorage.setItem(storageKey, "browser");
    setPhase("HIDDEN");
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

          <div className="iosInstallChoicePrompt" aria-hidden="true">
            <SquareArrowUp />
            <strong>Which one do you see?</strong>
            <Ellipsis />
          </div>

          <div className="iosInstallChoicePaths">
            <section className="iosInstallChoicePath">
              <SquareArrowUp aria-hidden="true" />
              <small>If you see Share</small>
              <strong>Tap Share</strong>
            </section>

            <section className="iosInstallChoicePath">
              <Ellipsis aria-hidden="true" />
              <small>If you see More</small>
              <strong>Tap More</strong>
              <span>Then tap Share</span>
            </section>
          </div>

          <div className="iosInstallPathMerge" aria-hidden="true">
            <span>Both continue here</span>
            <ChevronDown />
          </div>

          <ol className="iosInstallCommonSteps">
            <li className="iosInstallStep">
              <span className="iosInstallStepIcon" aria-hidden="true">
                <ChevronDown />
              </span>
              <span className="iosInstallStepCopy">
                <strong>View More</strong>
              </span>
            </li>

            <li className="iosInstallStep">
              <span className="iosInstallStepIcon" aria-hidden="true">
                <HousePlus />
              </span>
              <span className="iosInstallStepCopy">
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

          {allowBrowserUse ? (
            <button
              className="iosInstallBrowserContinue"
              type="button"
              onClick={continueInBrowser}
            >
              Use Driver in Safari
            </button>
          ) : null}
        </div>

        <div className="iosInstallTapHere" aria-hidden="true">
          <span>Which one do you see?</span>
        </div>
      </div>
    </section>
  );
}
