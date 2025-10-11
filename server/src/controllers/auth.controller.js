import CryptoJS from "crypto-js";
import jsonwebtoken from "jsonwebtoken";
import nodemailer from "nodemailer";
import {
  getUserForAuth,
  findUserByUsername,
  createUser,
  updateUserPassword,
  findUserByEmail,
} from "../services/user.service.js";
import {
  HTTP_STATUS,
  randomPassword,
  setResetPassEmailContent,
} from "../utils/constant.js";
import { sendError, sendWarning } from "../utils/response.js";

//[POST] login
export const login = async (req, res) => {
  const { username, password, remember } = req.body;
  try {
    // Find user by username or email
    const user = await findUserByEmail(username);

    if (!user) {
      return sendWarning(res, "Invalid username/email or password");
    } else {
      const decryptedPassword = decryptPassword(user.password);

      //check password
      if (decryptedPassword !== password) {
        return sendWarning(res, "Invalid username/email or password");
      }

      //check user inactive
      if (user.status === "inactive") {
        return sendWarning(res, "Your account is inactive");
      }

      //handle remember me
      var token;
      if (remember === true) {
        token = jwtSign(user.id, true);
      } else {
        token = jwtSign(user.id);
      }

      res.status(HTTP_STATUS.SUCCESS).json({
        success: true,
        status: 200,
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
        },
        token: token,
      });
    }
  } catch (error) {
    sendError(res, error);
  }
};

//[POST] register
export const register = async (req, res) => {
  const { email, password } = req.body;
  console.log("💲💲💲 ~ register ~ registration data:", {
    email,
    password,
  });

  try {
    const encryptedPassword = encryptPassword(password);

    // Generate username from email (part before @)
    const username = email.split("@")[0].toLowerCase();

    const newUser = await createUser({
      username,
      password: encryptedPassword.toString(),
      email,
    });

    const token = jwtSign(newUser.id);

    res.status(HTTP_STATUS.SUCCESS).json({
      success: true,
      status: 200,
      message: "Registration successful",
      data: {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
        },
        token,
      },
    });
  } catch (error) {
    sendError(res, error);
  }
};

//[PUT] changePassword
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  const user = req.user;

  try {
    //Check current password is correct
    if (decryptPassword(user.password) !== currentPassword)
      return sendWarning(res, "Your current password is incorrect");

    //update new password to user collection
    const encryptedPassword = encryptPassword(newPassword);
    const result = await updateUserPassword(
      user.id,
      encryptedPassword.toString()
    );

    if (!result) return sendWarning(res, "Update password failed");
    res.status(HTTP_STATUS.SUCCESS).json({
      success: true,
      status: 200,
      message: "Update password successfully",
    });
  } catch (error) {
    sendError(res, error);
  }
};

//[POST] resetPassword
export const resetPassword = async (req, res) => {
  const { email } = req.body;
  try {
    //Check username is Exist
    const user = await findUserByEmail(email);
    if (!user) return sendWarning(res, "Username does not exist");

    //check email
    if (user.email !== email) return sendWarning(res, "Email wrong");

    //Send new password to user email
    const newPassword = randomPassword(16);

    //Set new Password to server
    const encryptedNewPassword = encryptPassword(newPassword);
    const result = await updateUserPassword(
      user.id,
      encryptedNewPassword.toString()
    );

    if (!result) {
      return sendWarning(res, "Reset password failed");
    } else {
      //Send new password to email
      const mailContent = setResetPassEmailContent(user.username, newPassword);
      sendEmail(email, "Ecomx password reset", mailContent);

      //resturn result
      res.status(HTTP_STATUS.SUCCESS).json({
        success: true,
        status: 200,
        message:
          "Reset password successfully. Check your mailbox for new password",
      });
    }
  } catch (error) {
    sendError(res, error);
  }
};

const encryptPassword = (password) => {
  return CryptoJS.AES.encrypt(password, process.env.PASSWORD_SECRET_KEY);
};

const decryptPassword = (password) => {
  return CryptoJS.AES.decrypt(
    password,
    process.env.PASSWORD_SECRET_KEY
  ).toString(CryptoJS.enc.Utf8);
};

const jwtSign = (id, remember = false) => {
  return jsonwebtoken.sign(
    {
      id: id,
    },
    process.env.TOKEN_SECRET_KEY,
    {
      expiresIn: remember ? "168h" : "24h",
    }
  );
};

const sendEmail = (email, subject, content) => {
  var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MASTER_EMAIL,
      pass: process.env.MASTER_EMAIL_PASSWORD,
    },
  });

  var mailOptions = {
    from: process.env.MASTER_EMAIL,
    to: email,
    subject: subject,
    text: content,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      // console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};
