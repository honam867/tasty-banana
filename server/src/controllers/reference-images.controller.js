import lodash from "lodash";
const { get, isNil } = lodash;

import { findReferenceImagesByUserId } from "../services/uploads.service.js";
import { HTTP_STATUS } from "../utils/constant.js";
import { sendError, sendWarning } from "../utils/response.js";

/**
 * GET /api/users/reference-images - Get reference images for authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserReferenceImages = async (req, res) => {
  try {
    const userId = get(req, "user.id");
    const limit = parseInt(get(req, "query.limit", "50"), 10);

    if (isNil(userId)) {
      return res.status(HTTP_STATUS.UNAUTHENTICATED).json({
        success: false,
        status: 401,
        message: "User not authenticated",
      });
    }

    // Validate limit
    if (limit < 1 || limit > 100) {
      return sendWarning(res, "Limit must be between 1 and 100");
    }

    const referenceImages = await findReferenceImagesByUserId(userId, limit);

    return res.status(HTTP_STATUS.SUCCESS).json({
      success: true,
      status: 200,
      message: "Reference images retrieved successfully",
      data: {
        items: referenceImages,
        count: referenceImages.length,
      },
    });
  } catch (error) {
    sendError(res, error);
  }
};

export default {
  getUserReferenceImages,
};
