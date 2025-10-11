import { HTTP_STATUS } from "./constant.js";

export const sendError = (res, error) => {
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    status: 500,
    message: error.message,
  });
};

export const sendWarning = (res, msg) => {
  res.status(HTTP_STATUS.BAD_REQUEST).json({
    success: false,
    status: 400,
    message: msg,
  });
};

export const sendUnauthenticated = (res) => {
  res.status(HTTP_STATUS.UNAUTHENTICATED).json({
    success: false,
    status: 401,
    msg: "Unauthenticated",
  });
};

export const sendNotFound = (res, msg) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    status: 404,
    message: msg,
  });
};

export const sendConflict = (res, msg) => {
  res.status(HTTP_STATUS.CONFLICT).json({
    success: false,
    status: 409,
    message: msg,
  });
};

