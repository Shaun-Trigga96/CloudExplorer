/* eslint-disable linebreak-style */
/* eslint-disable padded-blocks */
/* eslint-disable max-len */
/* eslint-disable linebreak-style */
// functions/src/events/cloudEvents.js

// --- V2 Imports ---
const {onRequest} = require("firebase-functions/v2/https");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {logger} = require("firebase-functions");

// --- Other Imports ---
const admin = require("firebase-admin");
const axios = require("axios");
const cheerio = require("cheerio");
const {getFirestore, FieldValue, Timestamp} = require("firebase-admin/firestore");

// Initialize Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore();

/**
 * Fetch latest GCP events from Google Cloud events page
 * @returns {Promise<Array>} Array of GCP event objects
 */
async function fetchGCPEvents() {
  const gcpUrl = "https://cloud.google.com/events";
  logger.info(`Fetching GCP events from: ${gcpUrl}`);
  try {
    const response = await axios.get(gcpUrl, {timeout: 15000});
    const htmlSnippet = response.data.substring(0, 500);
    logger.info(`GCP HTML snippet: ${htmlSnippet}`);
    const $ = cheerio.load(response.data);
    const events = [];

    // Broadened GCP selectors to handle DOM changes
    const eventCardSelector = "div[class*='event'], article, section, [class*='card'], [class*='item']";
    const titleSelector = "h3, h4, h5, [class*='title'], [class*='heading']";
    const descriptionSelector = "p, [class*='description'], [class*='body'], [class*='content']";
    const dateSelector = "[class*='date'], time, [class*='meta'], [class*='when']";
    const linkSelector = "a[href]";

    const cards = $(eventCardSelector);
    logger.info(`GCP Scraper found ${cards.length} potential event cards.`);

    cards.each((i, element) => {
      try {
        const title = $(element).find(titleSelector).first().text().trim();
        const description = $(element).find(descriptionSelector).first().text().trim();
        const dateText = $(element).find(dateSelector).first().text().trim();
        let link = $(element).find(linkSelector).first().attr("href");

        if (title && link) {
          if (!link.startsWith("http")) {
            const baseUrl = "https://cloud.google.com";
            link = link.startsWith("/") ? `${baseUrl}${link}` : `${baseUrl}/${link}`;
          }

          events.push({
            title,
            description: description || "Google Cloud event",
            date: dateText || new Date().toISOString(),
            link: link,
            platform: "GCP",
            createdAt: FieldValue.serverTimestamp(),
          });
        } else {
          if (!title) logger.warn(`GCP Scraper: Skipping card ${i} due to missing title.`);
          if (!link) logger.warn(`GCP Scraper: Skipping card ${i} ("${title}") due to missing link.`);
        }
      } catch (error) {
        logger.warn(`Error processing GCP card ${i}:`, error.message);
      }
    });

    logger.info(`GCP Scraper found ${events.length} potential events.`);
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
 * Fetch latest AWS events from AWS events page
 * @returns {Promise<Array>} Array of AWS event objects
 */
async function fetchAWSEvents() {
  const awsUrl = "https://aws.amazon.com/events/";
  logger.info(`Fetching AWS events from: ${awsUrl}`);
  try {
    const response = await axios.get(awsUrl, {timeout: 15000});
    const htmlSnippet = response.data.substring(0, 500);
    logger.info(`AWS HTML snippet: ${htmlSnippet}`);
    const $ = cheerio.load(response.data);
    const events = [];

    // Broadened AWS selectors to handle DOM changes
    const eventCardSelector = "div[class*='event'], article, section, [class*='card'], [class*='item'], [class*='grid']";
    const titleSelector = "h3, h4, h5, [class*='title'], [class*='heading']";
    const descriptionSelector = "p, [class*='description'], [class*='body'], [class*='content']";
    const dateSelector = "[class*='date'], time, [class*='meta'], [class*='when']";
    const linkSelector = "a[href]";

    const cards = $(eventCardSelector);
    logger.info(`AWS Scraper found ${cards.length} potential event cards.`);

    cards.each((i, element) => {
      try {
        const title = $(element).find(titleSelector).first().text().trim();
        const description = $(element).find(descriptionSelector).first().text().trim();
        const dateText = $(element).find(dateSelector).first().text().trim();
        let link = $(element).find(linkSelector).first().attr("href");

        if (title && link) {
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
      } catch (error) {
        logger.warn(`Error processing AWS card ${i}:`, error.message);
      }
    });

    logger.info(`AWS Scraper found ${events.length} potential events.`);
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
 * Fetch latest Azure events from Microsoft Azure events page
 * @returns {Promise<Array>} Array of Azure event objects
 */
async function fetchAzureEvents() {
  const azureUrl = "https://azure.microsoft.com/en-us/community/events/";
  logger.info(`Fetching Azure events from: ${azureUrl}`);
  try {
    const response = await axios.get(azureUrl, {timeout: 15000});
    const htmlSnippet = response.data.substring(0, 500);
    logger.info(`Azure HTML snippet: ${htmlSnippet}`);
    const $ = cheerio.load(response.data);
    const events = [];

    // Refined Azure selectors to exclude invalid cards
    const eventCardSelector = ".event-card, .card:not(.empty), .event-item:not(:empty)";
    const titleSelector = ".card-title, h3:not(:empty), h4:not(:empty)";
    const descriptionSelector = ".card-body, p:not(:empty), .description";
    const dateSelector = ".event-date, .date, time";
    const linkSelector = "a[href]:not([href=''])";

    const cards = $(eventCardSelector);
    logger.info(`Azure Scraper found ${cards.length} potential event cards.`);

    cards.each((i, element) => {
      try {
        const title = $(element).find(titleSelector).first().text().trim();
        const description = $(element).find(descriptionSelector).first().text().trim();
        const dateText = $(element).find(dateSelector).first().text().trim();
        let link = $(element).find(linkSelector).first().attr("href");

        if (title && link) {
          if (!link.startsWith("http")) {
            const baseUrl = "https://azure.microsoft.com";
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
      } catch (error) {
        logger.warn(`Error processing Azure card ${i}:`, error.message);
      }
    });

    logger.info(`Azure Scraper found ${events.length} potential events.`);
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

// --- V2 HTTP Trigger Function ---
exports.fetchCloudEvents = onRequest(
    {
      timeoutSeconds: 540,
      memory: "1GiB",
    },
    async (req, res) => {
      const executionId = req.get("X-Cloud-Trace-Context") || "unknown";
      logger.info(`Starting HTTP-triggered cloud events fetch job (v2). Execution: ${executionId}`);

      try {
        const [gcpEvents, awsEvents, azureEvents] = await Promise.all([
          fetchGCPEvents(),
          fetchAWSEvents(),
          fetchAzureEvents(),
        ]);

        const allEvents = [...gcpEvents, ...awsEvents, ...azureEvents];

        if (allEvents.length === 0) {
          logger.info("HTTP-triggered job found no events across all platforms.");
          res.status(200).json({success: true, message: "No events found.", count: {total: 0, gcp: 0, aws: 0, azure: 0}});
          return;
        }

        logger.info(`HTTP-triggered job found ${allEvents.length} total events (GCP: ${gcpEvents.length}, AWS: ${awsEvents.length}, Azure: ${azureEvents.length})`);

        await saveEventsToFirestore(allEvents);

        const eventsWithIds = allEvents.map((event) => {
          if (!event.platform || !event.link) return null;
          const normalizedLink = event.link.replace(/\/$/, "");
          const idSource = `${event.platform}-${normalizedLink}`;
          const eventId = idSource.replace(/[^a-zA-Z0-9_.~-]/g, "_").substring(0, 450);
          return {...event, id: eventId};
        }).filter((e) => e && e.id);

        await notifyUsersAboutEvents(eventsWithIds);

        logger.info(`HTTP-triggered cloud events fetch job completed successfully (v2). Execution: ${executionId}`);
        res.status(200).json({
          success: true,
          message: `Successfully fetched and processed ${allEvents.length} events`,
          count: {
            total: allEvents.length,
            gcp: gcpEvents.length,
            aws: awsEvents.length,
            azure: azureEvents.length,
          },
        });
      } catch (error) {
        logger.error(`FATAL Error in HTTP-triggered cloud events fetch job (v2): ${error.message}`, {error: error, stack: error.stack, executionId: executionId});
        res.status(500).json({success: false, message: "Internal server error", error: error.message});
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
