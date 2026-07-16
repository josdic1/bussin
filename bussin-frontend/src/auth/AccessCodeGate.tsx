import { CircleHelp, Menu, X } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { appConfig } from "../config";

type AccessState = "CHECKING" | "LOCKED" | "SUBMITTING" | "AUTHORIZED";

type AccessCodeGateProps = {
  pageClassName?: string;
  eyebrow: ReactNode;
  title: string;
  instructions: string;
  authorizedMessage: string;
  fieldLabel: string;
  submitLabel: string;
  storageKey: string;
  endpoint: string;
  headerName: "x-parent-code" | "x-driver-code";
  children?: ReactNode;
  headerExtra?: ReactNode;
};

export function AccessCodeGate({
  pageClassName,
  eyebrow,
  title,
  instructions,
  authorizedMessage,
  fieldLabel,
  submitLabel,
  storageKey,
  endpoint,
  headerName,
  children,
  headerExtra,
}: AccessCodeGateProps) {
  const [accessCode, setAccessCode] = useState("");
  const [accessState, setAccessState] = useState<AccessState>("CHECKING");
  const [error, setError] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  async function verifyAccessCode(code: string) {
    const response = await fetch(`${appConfig.apiUrl}${endpoint}`, {
      headers: {
        [headerName]: code,
      },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      throw new Error(body?.error ?? "Unable to verify access.");
    }
  }

  useEffect(() => {
    const savedCode = localStorage.getItem(storageKey);

    if (!savedCode) {
      setAccessState("LOCKED");
      return;
    }

    verifyAccessCode(savedCode)
      .then(() => {
        setAccessCode(savedCode);
        setAccessState("AUTHORIZED");
      })
      .catch(() => {
        localStorage.removeItem(storageKey);
        setAccessState("LOCKED");
      });
  }, [storageKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedCode = accessCode.trim();

    if (!normalizedCode) {
      setError("Enter the access code.");
      return;
    }

    setAccessState("SUBMITTING");
    setError("");

    try {
      await verifyAccessCode(normalizedCode);
      localStorage.setItem(storageKey, normalizedCode);
      setAccessCode(normalizedCode);
      setAccessState("AUTHORIZED");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to verify access.",
      );
      setAccessState("LOCKED");
    }
  }

  function handleSignOut() {
    localStorage.removeItem(storageKey);
    setAccessCode("");
    setError("");
    setIsMenuOpen(false);
    setAccessState("LOCKED");
  }

  const pageClasses = ["page", pageClassName].filter(Boolean).join(" ");

  if (accessState === "CHECKING") {
    return (
      <main className={pageClasses}>
        <section className="card">
          <p className="eyebrow">{eyebrow}</p>
          <h1>Checking access.</h1>
        </section>
      </main>
    );
  }

  if (accessState === "AUTHORIZED") {
    return (
      <main className={pageClasses}>
        <section className="card authorizedCard">
          <div className="authorizedHeader">
            <p className="eyebrow">{eyebrow}</p>
            {headerExtra}
          </div>

          <div className="dashboardTitleBar">
            <h1>{title}</h1>

            <button
              className="dashboardMenuButton"
              type="button"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              aria-controls={`${storageKey}-menu`}
              onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>

            {isMenuOpen ? (
              <div className="dashboardMenu" id={`${storageKey}-menu`}>
                <button type="button" onClick={handleSignOut}>
                  Use a different code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsHelpOpen(true);
                  }}
                >
                  Help
                </button>
              </div>
            ) : null}
          </div>

          <p className="bodyCopy">{authorizedMessage}</p>

          {children}

          {isHelpOpen ? (
            <div className="helpOverlay" role="dialog" aria-modal="true">
              <section className="helpPanel">
                <div className="helpPanelHeading">
                  <CircleHelp aria-hidden="true" />
                  <h2>Help</h2>
                </div>
                <p>{instructions}</p>
                <p>
                  If the code is not working, show this screen to a camp staff
                  member and ask for the current code.
                </p>
                <button
                  className="primaryButton"
                  type="button"
                  onClick={() => setIsHelpOpen(false)}
                >
                  Back to tracker
                </button>
              </section>
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className={pageClasses}>
      <section className="card">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="bodyCopy">{instructions}</p>

        <form className="accessForm" onSubmit={handleSubmit}>
          <label className="fieldLabel" htmlFor={`${storageKey}-input`}>
            {fieldLabel}
          </label>

          <input
            id={`${storageKey}-input`}
            className="textInput"
            type="password"
            autoComplete="current-password"
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            disabled={accessState === "SUBMITTING"}
          />

          {error ? (
            <p className="formError" role="alert">
              {error}
            </p>
          ) : null}

          <button
            className="primaryButton"
            type="submit"
            disabled={accessState === "SUBMITTING"}
          >
            {accessState === "SUBMITTING" ? "Checking…" : submitLabel}
          </button>
        </form>
      </section>
    </main>
  );
}
