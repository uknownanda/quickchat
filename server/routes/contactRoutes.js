import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { searchPeople, sendContactRequest, listContactRequests, respondToContactRequest } from "../controllers/contactController.js";
import { createRateLimiter } from "../lib/security.js";

const router = express.Router();
const searchLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30, message: "Too many searches. Please slow down." });
const actionLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 20, message: "Too many contact actions. Please try again shortly." });

router.use(protectRoute);
router.get("/search", searchLimiter, searchPeople);
router.get("/requests", listContactRequests);
router.post("/requests/:id", actionLimiter, sendContactRequest);
router.patch("/requests/:id", actionLimiter, respondToContactRequest);
export default router;
