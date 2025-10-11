import express from "express";
import {
  changePassword,
  login,
  register,
  resetPassword,
} from "../controllers/auth.controller.js";
import {
  isConfirmPasswordMatch,
  isMatchPasswordRegex,
  isValidPasswordLength,
  isEmailExist,
  isValidEmail,
} from "../middlewares/authValidation.js";
import { verifyToken } from "../middlewares/tokenHandler.js";
import { validate } from "../middlewares/validation.js";
import { ROUTES } from "../utils/routes.js";

const router = express.Router();

//login route
router.post(ROUTES.LOGIN, isValidPasswordLength, validate, login);

//register route
router.post(
  ROUTES.REGISTER,
  isValidEmail,
  isEmailExist,
  isValidPasswordLength,
  isMatchPasswordRegex,
  isConfirmPasswordMatch,
  validate,
  register
);

//Forgot password
router.post(ROUTES.FORGOT_PASSWORD, resetPassword);

//Change password
router.put(
  ROUTES.CHANGE_PASSWORD,
  verifyToken,
  isValidPasswordLength,
  isMatchPasswordRegex,
  isConfirmPasswordMatch,
  validate,
  changePassword
);

export default router;
