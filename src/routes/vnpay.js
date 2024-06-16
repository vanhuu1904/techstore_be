import express from "express";
import { createPayment } from "../controllers/vnpayController.js";
import { isAuthenticatedUser } from "../middlewares/auth.js";

const router = express.Router();

router.route("/create_payment_url").post(isAuthenticatedUser, createPayment);

export default router;
