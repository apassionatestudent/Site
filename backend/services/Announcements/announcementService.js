

import sanitizeHtml from 'sanitize-html';
import { getActiveAnnouncements } from '../../models/Announcements/announcementModel.js';

// => Same sanitizer config as cmsPageService.js / faqService.js - allows
// => basic rich text tags plus img with data: URIs, since the WYSIWYG
// => editor can embed base64 images directly in the message content
const sanitizeOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'u']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'style'],
  },
  // => data: URI support is NOT in sanitize-html's default allowedSchemes,
  // => scoped specifically to img so this doesn't loosen link/src safety
  // => elsewhere in the sanitized output
  allowedSchemes: ['http', 'https', 'data'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'],
  },
};

export const getAnnouncements = async () => {
  const announcements = await getActiveAnnouncements();

  // => Sanitize each message before it ever leaves the backend, mirrors
  // => cmsPageService.js / faqService.js - never trust WYSIWYG output
  // => reaching the client unsanitized, even though it's admin-authored
  return announcements.map((announcement) => ({
    ...announcement,
    message: sanitizeHtml(announcement.message, sanitizeOptions),
  }));
};