// routes/Chatbots/chatbotRoutes.js
// => No protectStudent/protectAdmin middleware here - the public_site
//    scope must be reachable by anonymous visitors, and the
//    student_dashboard scope's own page-level auth in App.jsx already
//    gates whether the widget ever mounts. The rate limiter below is
//    what actually protects this route from abuse.

import express from 'express';
import { publicChatbotRateLimit } from '../../middleware/publicChatbotRateLimit.js';
import { getActiveChatbot, sendChatbotMessage } from '../../controllers/Chatbots/chatbotController.js';

const router = express.Router();

router.use(publicChatbotRateLimit);

// => Two routes instead of one optional param - Express 5's path-to-regexp
//    no longer supports the ":param?" syntax, both hit the same controller
router.get('/active/:scope', getActiveChatbot);
router.get('/active/:scope/:courseId', getActiveChatbot);
router.post('/:publicId/message', sendChatbotMessage);

export default router;