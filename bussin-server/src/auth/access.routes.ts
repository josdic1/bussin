import { Router } from "express";
import {
  requireDriverAccess,
  requireParentAccess,
} from "./access.js";

export const accessRouter = Router();

accessRouter.get(
  "/parent",
  requireParentAccess,
  (_request, response) => {
    response.json({
      authorized: true,
      role: "PARENT",
    });
  },
);

accessRouter.get(
  "/driver",
  requireDriverAccess,
  (_request, response) => {
    response.json({
      authorized: true,
      role: "DRIVER",
    });
  },
);
