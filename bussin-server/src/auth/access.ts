import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { config } from "../config.js";

function codesMatch(provided: string, expected: string) {
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);

  if (providedBytes.length !== expectedBytes.length) {
    return false;
  }

  return timingSafeEqual(providedBytes, expectedBytes);
}

function requireAccessCode(
  headerName: "x-parent-code" | "x-driver-code",
  configuredCode: string | undefined,
  roleName: "Parent" | "Driver",
): RequestHandler {
  return (request, response, next) => {
    if (!configuredCode) {
      response.status(503).json({
        error: `${roleName} access is not configured.`,
      });
      return;
    }

    const providedCode = request.header(headerName) ?? "";

    if (!codesMatch(providedCode, configuredCode)) {
      response.status(401).json({
        error: `${roleName} access code is invalid.`,
      });
      return;
    }

    next();
  };
}

export const requireParentAccess = requireAccessCode(
  "x-parent-code",
  config.PARENT_ACCESS_CODE,
  "Parent",
);

export const requireDriverAccess = requireAccessCode(
  "x-driver-code",
  config.DRIVER_ACCESS_CODE,
  "Driver",
);
