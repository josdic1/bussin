import { FormEvent, useEffect, useState } from "react";
import { appConfig } from "../../config";

const PARENT_CODE_STORAGE_KEY = "bussin.parentAccessCode";

type AccessState = "CHECKING" | "LOCKED" | "SUBMITTING" | "AUTHORIZED";

export function ParentPage() {
  const [accessCode, setAccessCode] = useState("");
  const [accessState, setAccessState] = useState<AccessState>("CHECKING");
  const [error, setError] = useState("");

  async function verifyAccessCode(code: string) {
    const response = await fetch(`${appConfig.apiUrl}/api/access/parent`, {
      headers: {
        "x-parent-code": code,
      },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      throw new Error(body?.error ?? "Unable to verify parent access.");
    }
  }

  useEffect(() => {
    const savedCode = localStorage.getItem(PARENT_CODE_STORAGE_KEY);

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
        localStorage.removeItem(PARENT_CODE_STORAGE_KEY);
        setAccessState("LOCKED");
      });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedCode = accessCode.trim();

    if (!normalizedCode) {
      setError("Enter the parent access code.");
      return;
    }

    setAccessState("SUBMITTING");
    setError("");

    try {
      await verifyAccessCode(normalizedCode);
      localStorage.setItem(PARENT_CODE_STORAGE_KEY, normalizedCode);
      setAccessCode(normalizedCode);
      setAccessState("AUTHORIZED");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to verify parent access.",
      );
      setAccessState("LOCKED");
    }
  }

  function handleSignOut() {
    localStorage.removeItem(PARENT_CODE_STORAGE_KEY);
    setAccessCode("");
    setError("");
    setAccessState("LOCKED");
  }

  if (accessState === "CHECKING") {
    return (
      <main className="page">
        <section className="card">
          <p className="eyebrow">BUSSIN · PARENTS</p>
          <h1>Checking access.</h1>
        </section>
      </main>
    );
  }

  if (accessState === "AUTHORIZED") {
    return (
      <main className="page">
        <section className="card">
          <p className="eyebrow">BUSSIN · PARENTS</p>
          <h1>Know when to leave.</h1>
          <p className="bodyCopy">
            Parent access is confirmed. The live bus map and alerts will appear
            here next.
          </p>

          <button
            className="secondaryButton"
            type="button"
            onClick={handleSignOut}
          >
            Use a different code
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">BUSSIN · PARENTS</p>
        <h1>Know when to leave.</h1>
        <p className="bodyCopy">
          Enter the parent access code provided by the camp. You only need to
          enter it once on this device.
        </p>

        <form className="accessForm" onSubmit={handleSubmit}>
          <label className="fieldLabel" htmlFor="parent-access-code">
            Parent access code
          </label>

          <input
            id="parent-access-code"
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
            {accessState === "SUBMITTING"
              ? "Checking…"
              : "Open bus tracker"}
          </button>
        </form>
      </section>
    </main>
  );
}
