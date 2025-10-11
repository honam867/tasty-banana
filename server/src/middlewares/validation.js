import { validationResult } from "express-validator";
import {
  HTTP_STATUS,
  ROLE,
  STATUS,
  DATE,
} from "../utils/constant.js";

const listValidRole = Object.values(ROLE);
const listValidStatus = Object.values(STATUS);
const listValidDate = Object.values(DATE);

// UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      status: 400,
      message: errors.array()[0].msg,
    });
  }
  next();
};

export const isValidId = (value) => UUID_REGEX.test(value);

export const isValidRole = (value) => listValidRole.includes(value);

export const isValidDate = (value) => listValidDate.includes(value);

export const isValidStatus = (value) => listValidStatus.includes(value);

export const isValidReviewScore = (value) => REVIEW_SCORE.includes(value);
