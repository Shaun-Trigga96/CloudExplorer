/* eslint-disable linebreak-style */
/* eslint-disable padded-blocks */
/* eslint-disable max-len */
/* eslint-disable linebreak-style */
// functions/src/events/cloudEvents.js

// --- V2 Imports ---
const {onSchedule} = require("firebase-functions/v2/scheduler"); // For scheduled functions
const {onCall, HttpsError} = require("firebase-functions/v2/https"); // For callable functions
const {logger} = require("firebase-functions"); // Use logger for V2

// --- Other Imports ---
const admin = require("firebase-admin");
const axios = require("axios");
const cheerio = require("cheerio");
const {getFirestore, FieldValue, Timestamp} = require("firebase-admin/firestore"); // Use specific Firestore imports

// Initialize Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore(); // Use getFirestore()

/**
 * WARNING: WEB SCRAPING IS FRAGILE. Selectors must be verified against the live page.
 * Fetch latest GCP events from Google Cloud OnAir events page
 * @returns {Promise<Array>} Array of GCP event objects
 */
async function fetchGCPEvents() {
  const gcpUrl = "https://cloudonair.withgoogle.com/events"; // Updated URL for static event listings
  logger.info(`Scraping GCP events from: ${gcpUrl}`);
  try {
    const response = await axios.get(gcpUrl);
    const $ = cheerio.load(response.data);
    const events = [];

    // >>> IMPORTANT: Verify these selectors by inspecting https://cloudonair.withgoogle.com/events <<<
    const eventCardSelector = "ul.events-list > li.event-item"; // Targets event list items
    const titleSelector = "a.event-title"; // Title within link
    const descriptionSelector = "p.event-description"; // Description paragraph
    const dateSelector = "span.event-date"; // Date element
    const linkSelector = "a.event-title"; // Link to event details

    $(eventCardSelector).each((i, element) => {
      const title = $(element).find(titleSelector).text().trim();
      const description = $(element).find(descriptionSelector).text().trim();
      const dateText = $(element).find(dateSelector).text().trim();
      let link = $(element).find(linkSelector).attr("href");

      if (title && link) {
        // Ensure link is absolute
        if (!link.startsWith("http")) {
          const baseUrl = "https://cloudonair.withgoogle.com";
          link = link.startsWith("/") ? `${baseUrl}${link}` : `${baseUrl}/${link}`;
        }

        events.push({
          title,
          description: description || "Google Cloud event", // Default description
          date: dateText || new Date().toISOString(), // Fallback date
          link: link,
          platform: "GCP",
          createdAt: FieldValue.serverTimestamp(),
        });
      } else {
        if (!title) logger.warn(`GCP Scraper: Skipping card ${i} due to missing title.`);
        if (!link) logger.warn(`GCP Scraper: Skipping card ${i} ("${title}") due to missing link.`);
      }
    });

    logger.info(`GCP Scraper found ${events.length} potential events.`);
    // Filter unique events by title and link
    const uniqueEvents = Array.from(new Map(events.map((e) => [`${e.title}-${e.link}`, e])).values());
    if (uniqueEvents.length < events.length) {
      logger.info(`GCP Scraper filtered down to ${uniqueEvents.length} unique events.`);
    }

    return uniqueEvents;
  } catch (error) {
    logger.error(`Error fetching GCP events from ${gcpUrl}:`, error.message, {stack: error.stack});
    return [];
  }
}

/**
 * WARNING: WEB SCRAPING IS FRAGILE. Selectors must be verified against the live page.
 * Fetch latest AWS events from AWS events page
 * @returns {Promise<Array>} Array of AWS event objects
 */
async function fetchAWSEvents() {
  const awsUrl = "https://aws.amazon.com/events/"; // URL remains valid
  logger.info(`Scraping AWS events from: ${awsUrl}`);
  try {
    const response = await axios.get(awsUrl);
    const $ = cheerio.load(response.data);
    const events = [];

    // >>> IMPORTANT: Verify these selectors by inspecting https://aws.amazon.com/events/ <<<
    const eventCardSelector = "div.m-event-card"; // Targets event card container
    const titleSelector = "h3.m-event-title"; // Event title
    const descriptionSelector = "p.m-event-description"; // Event description
    const dateSelector = "span.m-event-date"; // Event date
    const linkSelector = "a.m-event-link"; // Link to event details

    $(eventCardSelector).each((i, element) => {
      const title = $(element).find(titleSelector).text().trim();
      const description = $(element).find(descriptionSelector).text().trim();
      const dateText = $(element).find(dateSelector).text().trim();
      let link = $(element).find(linkSelector).attr("href");

      if (title && link) {
        // Ensure link is absolute
        if (!link.startsWith("http")) {
          const baseUrl = "https://aws.amazon.com";
          link = link.startsWith("/") ? `${baseUrl}${link}` : `${baseUrl}/${link}`;
        }
        events.push({
          title,
          description: description || "AWS event",
          date: dateText || new Date().toISOString(),
          link: link,
          platform: "AWS",
          createdAt: FieldValue.serverTimestamp(),
        });
      } else {
        if (!title) logger.warn(`AWS Scraper: Skipping card ${i} due to missing title.`);
        if (!link) logger.warn(`AWS Scraper: Skipping card ${i} ("${title}") due to missing link.`);
      }
    });

    logger.info(`AWS Scraper found ${events.length} potential events.`);
    // Filter unique events by title and link
    const uniqueEvents = Array.from(new Map(events.map((e) => [`${e.title}-${e.link}`, e])).values());
    if (uniqueEvents.length < events.length) {
      logger.info(`AWS Scraper filtered down to ${uniqueEvents.length} unique events.`);
    }

    return uniqueEvents;
  } catch (error) {
    logger.error(`Error fetching AWS events from ${awsUrl}:`, error.message, {stack: error.stack});
    return [];
  }
}

/**
 * WARNING: WEB SCRAPING IS FRAGILE. Selectors should be verified periodically.
 * Fetch latest Azure events from Microsoft Azure events page
 * @returns {Promise<Array>} Array of Azure event objects
 */
async function fetchAzureEvents() {
  const azureUrl = "https://azure.microsoft.com/en-us/community/events/"; // Verify URL
  logger.info(`Workspaceing Azure events from: ${azureUrl}`);
  try {
    const response = await axios.get(azureUrl);
    const $ = cheerio.load(response.data);
    const events = [];

    // >>> IMPORTANT: Verify these selectors periodically, even if they work now <<<
    const eventCardSelector = ".event-card, .card, .column, .event-item"; // Examples
    const titleSelector = ".card-title, h3, h4"; // Examples
    const descriptionSelector = ".card-body, p, .description"; // Examples
    const dateSelector = ".event-date, .date"; // Examples
    const linkSelector = "a"; // Examples

    $(eventCardSelector).each((i, element) => {
      const title = $(element).find(titleSelector).first().text().trim();
      const description = $(element).find(descriptionSelector).first().text().trim();
      const dateText = $(element).find(dateSelector).first().text().trim();
      let link = $(element).find(linkSelector).first().attr("href");

      if (title && link) {
        // Ensure link is absolute
        if (!link.startsWith("http")) {
          const baseUrl = "https://azure.microsoft.com"; // Azure Base URL
          link = link.startsWith("/") ? `${baseUrl}${link}` : `${baseUrl}/${link}`;
        }

        events.push({
          title,
          description: description || "Microsoft Azure event",
          date: dateText || new Date().toISOString(),
          link: link,
          platform: "Azure",
          createdAt: FieldValue.serverTimestamp(),
        });
      } else {
        if (!title) logger.warn(`Azure Scraper: Skipping card ${i} due to missing title.`);
        if (!link) logger.warn(`Azure Scraper: Skipping card ${i} ("${title}") due to missing link.`);
      }
    });

    logger.info(`Azure Scraper found ${events.length} potential events.`);
    // Filter out potential duplicates
    const uniqueEvents = Array.from(new Map(events.map((e) => [`${e.title}-${e.link}`, e])).values());
    if (uniqueEvents.length < events.length) {
      logger.info(`Azure Scraper filtered down to ${uniqueEvents.length} unique events.`);
    }

    return uniqueEvents;
  } catch (error) {
    logger.error(`Error fetching Azure events from ${azureUrl}:`, error.message, {stack: error.stack});
    return [];
  }
}

/**
 * Save events to Firestore
 * @param {Array} events Array of event objects to save
 * @returns {Promise<void>}
 */
async function saveEventsToFirestore(events) {
  if (!events || events.length === 0) {
    logger.info("No events provided to saveEventsToFirestore.");
    return;
  }
  const batch = db.batch();
  let savedCount = 0;
  const processedIds = new Set();

  logger.info(`Starting save process for ${events.length} fetched events.`);

  events.forEach((event) => {
    if (!event.platform || !event.link || !event.title) {
      logger.warn("Skipping event due to missing platform, link, or title:", event);
      return;
    }

    const normalizedLink = event.link.replace(/\/$/, "");
    const idSource = `${event.platform}-${normalizedLink}`;
    const eventId = idSource.replace(/[^a-zA-Z0-9_.~-]/g, "_").substring(0, 450);

    if (!eventId) {
      logger.warn("Could not generate valid eventId for event:", event.title, event.link);
      return;
    }

    if (processedIds.has(eventId)) {
      logger.warn(`Duplicate event ID detected in batch, skipping: ${eventId} for title: ${event.title}`);
      return;
    }
    processedIds.add(eventId);

    const eventRef = db.collection("communityEvents").doc(eventId);

    batch.set(eventRef, {
      ...event,
      id: eventId,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});

    savedCount++;
  });

  if (savedCount > 0) {
    try {
      await batch.commit();
      logger.info(`Successfully committed batch to save/update ${savedCount} events to Firestore.`);
    } catch (commitError) {
      logger.error("Firestore batch commit failed:", commitError);
    }
  } else {
    logger.info("No valid events were added to the Firestore batch.");
  }
}

/**
 * Notify users about new events based on their preferences
 * @param {Array} newEvents Array of new event objects (MUST have an 'id' field)
 * @returns {Promise<void>}
 */
async function notifyUsersAboutEvents(newEvents) {
  if (!newEvents || newEvents.length === 0) {
    logger.info("No new events provided for notification.");
    return;
  }

  logger.info(`Checking ${newEvents.length} new/updated events for notifications.`);

  try {
    const usersSnapshot = await db.collection("users")
        .where("preferences.notifications.events", "==", true)
        .get();

    if (usersSnapshot.empty) {
      logger.info("No users found with event notification preferences enabled.");
      return;
    }

    logger.info(`Found ${usersSnapshot.size} users with event notifications enabled.`);

    const notifications = [];
    const now = Timestamp.now();

    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const userId = userDoc.id;

      let userPlatformPreferences = ["GCP", "AWS", "Azure"];
      if (userData && userData.preferences && Array.isArray(userData.preferences.platforms)) {
        userPlatformPreferences = userData.preferences.platforms;
      }

      const relevantEvents = newEvents.filter((event) =>
        event.id && event.platform && userPlatformPreferences.includes(event.platform),
      );

      if (relevantEvents.length > 0) {
        logger.info(`User ${userId} matches ${relevantEvents.length} events based on preferences: ${userPlatformPreferences.join(", ")}`);

        notifications.push({
          userId: userId,
          title: "New Cloud Events Available",
          body: `${relevantEvents.length} new event${relevantEvents.length > 1 ? "s" : ""} matching your preferences (${relevantEvents.map((e) => e.platform).filter((v, i, a) => a.indexOf(v) === i).join(", ")}).`,
          data: {
            type: "events",
            count: relevantEvents.length.toString(),
            eventIds: JSON.stringify(relevantEvents.map((e) => e.id)),
          },
          read: false,
          createdAt: now,
        });
      }
    });

    if (notifications.length > 0) {
      const batch = db.batch();
      notifications.forEach((notification) => {
        const notifRef = db.collection("notifications").doc();
        batch.set(notifRef, notification);
      });

      try {
        await batch.commit();
        logger.info(`Successfully created ${notifications.length} event notifications in Firestore.`);
      } catch (commitError) {
        logger.error("Failed to commit notification batch:", commitError);
      }
    } else {
      logger.info("No relevant events found matching any user preferences for notifications.");
    }
  } catch (error) {
    logger.error("Error querying users or processing notifications:", error);
  }
}

// --- V2 Scheduled Function ---
exports.fetchCloudEvents = onSchedule(
    {
      schedule: "0 */12 * * *",
      timeZone: "UTC",
      timeoutSeconds: 540,
      memory: "1GiB",
    },
    async (event) => {
      const executionId = event.jobName;
      logger.info(`Starting scheduled cloud events fetch job (v2). Execution: ${executionId}`);

      try {
        const [gcpEvents, awsEvents, azureEvents] = await Promise.all([
          fetchGCPEvents(),
          fetchAWSEvents(),
          fetchAzureEvents(),
        ]);

        const allEvents = [...gcpEvents, ...awsEvents, ...azureEvents];

        if (allEvents.length === 0) {
          logger.info("Scheduled job found no events across all platforms.");
          return null;
        }

        logger.info(`Scheduled job found ${allEvents.length} total events (GCP: ${gcpEvents.length}, AWS: ${awsEvents.length}, Azure: ${azureEvents.length})`);

        await saveEventsToFirestore(allEvents);

        const eventsWithIds = allEvents.map((event) => {
          if (!event.platform || !event.link) return null;
          const normalizedLink = event.link.replace(/\/$/, "");
          const idSource = `${event.platform}-${normalizedLink}`;
          const eventId = idSource.replace(/[^a-zA-Z0-9_.~-]/g, "_").substring(0, 450);
          return {...event, id: eventId};
        }).filter((e) => e && e.id);

        await notifyUsersAboutEvents(eventsWithIds);

        logger.info(`Scheduled cloud events fetch job completed successfully (v2). Execution: ${executionId}`);
        return null;
      } catch (error) {
        logger.error(`FATAL Error in scheduled cloud events fetch job (v2): ${error.message}`, {error: error, stack: error.stack, executionId: executionId});
        return null;
      }
    });

// --- V2 Callable Function ---
exports.manualFetchCloudEvents = onCall(
    {
      timeoutSeconds: 540,
      memory: "1GiB",
    },
    async (request) => {
      logger.info("Manual fetchCloudEvents triggered", {auth: request.auth});

      if (!request.auth) {
        logger.error("Manual fetch attempt failed: Unauthenticated.");
        throw new HttpsError(
            "unauthenticated",
            "Authentication required to trigger manual fetch.",
        );
      }

      const uid = request.auth.uid;

      try {
        const userSnapshot = await db.collection("users").doc(uid).get();
        if (!userSnapshot.exists) {
          logger.error(`Manual fetch attempt failed: User ${uid} not found.`);
          throw new HttpsError("not-found", `User ${uid} not found.`);
        }
        const userData = userSnapshot.data();
        if (userData.role !== "admin") {
          logger.error(`Manual fetch attempt failed: User ${uid} lacks admin role.`);
          throw new HttpsError(
              "permission-denied",
              "Admin privileges required to trigger manual fetch.",
          );
        }
        logger.info(`Manual fetch authorized for admin user: ${uid}`);
      } catch (error) {
        logger.error(`Error verifying admin role for user ${uid}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Could not verify user role.");
      }

      try {
        logger.info(`Admin user ${uid} starting manual fetch...`);
        const [gcpEvents, awsEvents, azureEvents] = await Promise.all([
          fetchGCPEvents(),
          fetchAWSEvents(),
          fetchAzureEvents(),
        ]);

        const allEvents = [...gcpEvents, ...awsEvents, ...azureEvents];

        const totalCount = allEvents.length;
        const gcpCount = gcpEvents.length;
        const awsCount = awsEvents.length;
        const azureCount = azureEvents.length;

        if (totalCount === 0) {
          logger.info(`Manual fetch by ${uid} found no events.`);
          return {success: true, message: "Manual fetch completed. No events found.", count: {total: 0, gcp: 0, aws: 0, azure: 0}};
        }

        logger.info(`Manual fetch by ${uid} found ${totalCount} events (GCP: ${gcpCount}, AWS: ${awsCount}, Azure: ${azureCount})`);

        await saveEventsToFirestore(allEvents);

        const eventsWithIds = allEvents.map((event) => {
          if (!event.platform || !event.link) return null;
          const normalizedLink = event.link.replace(/\/$/, "");
          const idSource = `${event.platform}-${normalizedLink}`;
          const eventId = idSource.replace(/[^a-zA-Z0-9_.~-]/g, "_").substring(0, 450);
          return {...event, id: eventId};
        }).filter((e) => e && e.id);

        await notifyUsersAboutEvents(eventsWithIds);

        logger.info(`Manual fetch by ${uid} completed successfully.`);
        return {
          success: true,
          message: `Successfully fetched and processed ${totalCount} events`,
          count: {
            total: totalCount,
            gcp: gcpCount,
            aws: awsCount,
            azure: azureCount,
          },
        };
      } catch (error) {
        logger.error(`Error during manual fetch triggered by ${uid}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError(
            "internal",
            "An internal error occurred during the manual fetch process.",
            error.message,
        );
      }
    });
