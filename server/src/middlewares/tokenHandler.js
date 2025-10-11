import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import { findUserById } from "../services/user.service.js";
import { HTTP_STATUS } from "../utils/constant.js";
import { sendUnauthenticated } from "../utils/response.js";

export const tokenDecode = async (req) => {
  const authorizationHeader = req.headers["authorization"];
  if (authorizationHeader) {
    const token = authorizationHeader.split(" ")[1];
    try {
      const tokenDecoded = jwt.verify(token, process.env.TOKEN_SECRET_KEY);
      return tokenDecoded;
    } catch (error) {
      return false;
    }
  }
};

export const verifyToken = async (req, res, next) => {
  const tokenDecoded = await tokenDecode(req);
  if (tokenDecoded) {
    const user = await findUserById(tokenDecoded.id);
    if (!user) return sendUnauthenticated(res);
    req.user = user;
    next();
  } else {
    return sendUnauthenticated(res);
  }
};
