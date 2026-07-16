import {
  AppWindow,
  BusFront,
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
  const [step, setStep] = useState(0);

  if (phase === "HIDDEN") {
    return children;
  }

  function finishGuide() {
    localStorage.setItem(storageKey, "true");
    setPhase("DONE");
  }

  function showGuideAgain() {
    localStorage.removeItem(storageKey);
    setStep(0);
    setPhase("GUIDE");
  }

  function completeStep() {
    if (step === 2) {
      finishGuide();
      return;
    }

    setStep((currentStep) => currentStep + 1);
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
          <p>Complete one stop at a time.</p>
        </header>

        <div
          className="iosInstallRoute"
          aria-label={`Step ${step + 1} of 3`}
        >
          <span className="iosInstallRouteLine" aria-hidden="true" />
          {[0, 1, 2].map((stop) => (
            <span
              className={`iosInstallRouteStop${
                stop < step ? " iosInstallRouteStopDone" : ""
              }${stop === step ? " iosInstallRouteStopCurrent" : ""}`}
              key={stop}
            >
              {stop < step ? <Check aria-hidden="true" /> : stop + 1}
            </span>
          ))}
          <span
            className={`iosInstallRouteBus iosInstallRouteBusStep${step + 1}`}
            aria-hidden="true"
          >
            <BusFront />
          </span>
        </div>

        <p className="iosInstallStepCount">Stop {step + 1} of 3</p>

        <section className="iosInstallCurrentStep" aria-live="polite">
          {step === 0 ? (
            <>
              <div className="iosInstallStepDrawing iosInstallShareDrawing">
                <span>
                  <SquareArrowUp aria-hidden="true" />
                  <small>Share</small>
                </span>
                <b>or</b>
                <span>
                  <span className="iosInstallMoreThenShare">
                    <Ellipsis aria-hidden="true" />
                    <i>›</i>
                    <SquareArrowUp aria-hidden="true" />
                  </span>
                  <small>More → Share</small>
                </span>
              </div>
              <h2>Open Share.</h2>
              <p>Use whichever Safari button you see.</p>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <div className="iosInstallStepDrawing">
                <HousePlus aria-hidden="true" />
              </div>
              <h2>Add to Home Screen.</h2>
              <p>
                Scroll down. If it is missing: Edit Actions → Add to Home
                Screen.
              </p>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="iosInstallStepDrawing">
                <AppWindow aria-hidden="true" />
              </div>
              <h2>Tap Add.</h2>
              <p>Keep “Open as Web App” turned on.</p>
            </>
          ) : null}
        </section>

        <button
          className="iosInstallGateConfirm"
          type="button"
          onClick={completeStep}
        >
          <span className="iosInstallConfirmBox" aria-hidden="true">
            <Check />
          </span>
          {step === 0
            ? "Share is open"
            : step === 1
              ? "I tapped Add to Home Screen"
              : `I added ${appName}`}
        </button>

        {step > 0 ? (
          <button
            className="iosInstallBackButton"
            type="button"
            onClick={() => setStep((currentStep) => currentStep - 1)}
          >
            Back one step
          </button>
        ) : null}
      </div>
    </section>
  );
}
