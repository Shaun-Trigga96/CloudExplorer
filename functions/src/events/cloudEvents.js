/* eslint-disable linebreak-style */
/* eslint-disable padded-blocks */
/* eslint-disable max-len */
/* eslint-disable linebreak-style */
/**
 * @file cloudEvents.js
 * @description This file contains Firebase Cloud Functions for fetching, storing,
 *              and notifying users about upcoming events from major cloud providers (GCP, AWS, Azure).
 *              It includes web scraping logic, Firestore database interactions, and user notification mechanisms.
 */

// --- V2 Imports ---
/**
 * @name onRequest (from firebase-functions/v2/https)
 * @description Firebase Functions v2 HTTP trigger for creating HTTPS-callable functions.
 * @name onCall, HttpsError (from firebase-functions/v2/https)
 * @description Firebase Functions v2 Callable trigger for functions invoked directly from client apps.
 *              `HttpsError` is used for throwing structured errors from callable functions.
 * @name logger (from firebase-functions)
 * @description Firebase Functions logger instance.
 */
const {onRequest} = require("firebase-functions/v2/https");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {logger} = require("firebase-functions");

// --- Other Imports ---
const admin = require("firebase-admin"); // Firebase Admin SDK for privileged server-side operations.
const axios = require("axios"); // HTTP client for making requests to fetch event pages.
const cheerio = require("cheerio"); // HTML parser, used for web scraping event details.
/**
 * @name getFirestore, FieldValue, Timestamp (from firebase-admin/firestore)
 * @description Firestore specific utilities from the Firebase Admin SDK.
 * - `getFirestore`: Gets the Firestore service.
 * - `FieldValue`: Provides special values for database operations (e.g., serverTimestamp, increment).
 * - `Timestamp`: Represents a Firestore timestamp.
 */
const {getFirestore, FieldValue, Timestamp} = require("firebase-admin/firestore");

// --- Firebase Admin SDK Initialization ---
// Ensures the Admin SDK is initialized once.
if (!admin.apps.length) {
  admin.initializeApp();
}

// --- Firestore Database Instance ---
const db = getFirestore();

/**
 * Fetch latest GCP events from Google Cloud events page
 * @returns {Promise<Array>} Array of GCP event objects
 */
async function fetchGCPEvents() {
  const gcpUrl = "https://cloud.google.com/events";
  logger.info(`[fetchGCPEvents] Fetching GCP events from: ${gcpUrl}`);
  try {
    // Make HTTP GET request to the GCP events page.
    const response = await axios.get(gcpUrl, {timeout: 15000});
    const htmlSnippet = response.data.substring(0, 500);
    logger.info(`[fetchGCPEvents] GCP HTML snippet: ${htmlSnippet}`); // Log a snippet for debugging.
    // Load HTML content into Cheerio for parsing.
    const $ = cheerio.load(response.data);
    const events = [];

    // Define broad CSS selectors to find event cards and their details.
    // These are designed to be somewhat resilient to minor changes in the page's HTML structure.
    const eventCardSelector = "div[class*='event'], article, section, [class*='card'], [class*='item']";
    const titleSelector = "h3, h4, h5, [class*='title'], [class*='heading']"; // Selectors for event titles.
    const descriptionSelector = "p, [class*='description'], [class*='body'], [class*='content']";
    const dateSelector = "[class*='date'], time, [class*='meta'], [class*='when']";
    const linkSelector = "a[href]";

    const cards = $(eventCardSelector);
    logger.info(`GCP Scraper found ${cards.length} potential event cards.`);

    // Iterate over each potential event card found.
    cards.each((i, element) => {
      try {
        const title = $(element).find(titleSelector).first().text().trim();
        const description = $(element).find(descriptionSelector).first().text().trim();
        const dateText = $(element).find(dateSelector).first().text().trim();
        let link = $(element).find(linkSelector).first().attr("href");

        // Basic validation: ensure title and link exist.
        if (title && link) {
          // Normalize relative URLs to absolute URLs.
          if (!link.startsWith("http")) {
            const baseUrl = "https://cloud.google.com";
            link = link.startsWith("/") ? `${baseUrl}${link}` : `${baseUrl}/${link}`;
          }
          // Construct the event object.
          events.push({
            title,
            description: description || "Google Cloud event",
            date: dateText || new Date().toISOString(),
            link: link,
            platform: "GCP",
            createdAt: FieldValue.serverTimestamp(),
          });
        } else {
          if (!title) logger.warn(`[fetchGCPEvents] Skipping card ${i} due to missing title.`);
          if (!link) logger.warn(`[fetchGCPEvents] Skipping card ${i} ("${title}") due to missing link.`);
        }
      } catch (error) {
        logger.warn(`[fetchGCPEvents] Error processing card ${i}:`, error.message);
      }
    });

    logger.info(`[fetchGCPEvents] Scraper found ${events.length} potential events.`);
    // Deduplicate events based on a composite key of title and link.
    const uniqueEvents = Array.from(new Map(events.map((e) => [`${e.title}-${e.link}`, e])).values());
    if (uniqueEvents.length < events.length) {
      logger.info(`[fetchGCPEvents] Scraper filtered down to ${uniqueEvents.length} unique events.`);
    }

    return uniqueEvents;
  } catch (error) {
    // Log detailed error information if fetching or parsing fails.
    logger.error(`[fetchGCPEvents] Error fetching events from ${gcpUrl}:`, error.message, {stack: error.stack});
    return []; // Return an empty array on failure to prevent downstream errors.
  }
}

/**
 * Fetch latest AWS events from AWS events page
 * @returns {Promise<Array>} Array of AWS event objects
 */
async function fetchAWSEvents() {
  const awsUrl = "https://aws.amazon.com/events/";
  logger.info(`[fetchAWSEvents] Fetching AWS events from: ${awsUrl}`);
  try {
    // Make HTTP GET request to the AWS events page.
    const response = await axios.get(awsUrl, {timeout: 15000});
    const htmlSnippet = response.data.substring(0, 500);
    logger.info(`[fetchAWSEvents] AWS HTML snippet: ${htmlSnippet}`); // Log a snippet for debugging.
    // Load HTML content into Cheerio for parsing.
    const $ = cheerio.load(response.data);
    const events = [];

    // Define broad CSS selectors for AWS event cards and details.
    const eventCardSelector = "div[class*='event'], article, section, [class*='card'], [class*='item'], [class*='grid']";
    const titleSelector = "h3, h4, h5, [class*='title'], [class*='heading']";
    const descriptionSelector = "p, [class*='description'], [class*='body'], [class*='content']";
    const dateSelector = "[class*='date'], time, [class*='meta'], [class*='when']";
    const linkSelector = "a[href]";

    const cards = $(eventCardSelector);
    logger.info(`AWS Scraper found ${cards.length} potential event cards.`);

    // Iterate over each potential event card.
    cards.each((i, element) => {
      try {
        const title = $(element).find(titleSelector).first().text().trim();
        const description = $(element).find(descriptionSelector).first().text().trim();
        const dateText = $(element).find(dateSelector).first().text().trim();
        let link = $(element).find(linkSelector).first().attr("href");

        // Basic validation.
        if (title && link) {
          // Normalize relative URLs.
          if (!link.startsWith("http")) {
            const baseUrl = "https://aws.amazon.com";
            link = link.startsWith("/") ? `${baseUrl}${link}` : `${baseUrl}/${link}`;
          }
          // Construct event object.
          events.push({
            title,
            description: description || "AWS event",
            date: dateText || new Date().toISOString(),
            link: link,
            platform: "AWS",
            createdAt: FieldValue.serverTimestamp(),
          });
        } else {
          if (!title) logger.warn(`[fetchAWSEvents] Skipping card ${i} due to missing title.`);
          if (!link) logger.warn(`[fetchAWSEvents] Skipping card ${i} ("${title}") due to missing link.`);
        }
      } catch (error) {
        logger.warn(`[fetchAWSEvents] Error processing card ${i}:`, error.message);
      }
    });

    logger.info(`[fetchAWSEvents] Scraper found ${events.length} potential events.`);
    // Deduplicate events.
    const uniqueEvents = Array.from(new Map(events.map((e) => [`${e.title}-${e.link}`, e])).values());
    if (uniqueEvents.length < events.length) {
      logger.info(`[fetchAWSEvents] Scraper filtered down to ${uniqueEvents.length} unique events.`);
    }

    return uniqueEvents;
  } catch (error) {
    // Log detailed error information.
    logger.error(`[fetchAWSEvents] Error fetching events from ${awsUrl}:`, error.message, {stack: error.stack});
    return [];
  }
}

/**
 * Fetch latest Azure events from Microsoft Azure events page
 * @returns {Promise<Array>} Array of Azure event objects
 */
async function fetchAzureEvents() {
  const azureUrl = "https://azure.microsoft.com/en-us/community/events/";
  logger.info(`[fetchAzureEvents] Fetching Azure events from: ${azureUrl}`);
  try {
    // Make HTTP GET request to the Azure events page.
    const response = await axios.get(azureUrl, {timeout: 15000});
    const htmlSnippet = response.data.substring(0, 500);
    logger.info(`[fetchAzureEvents] Azure HTML snippet: ${htmlSnippet}`); // Log a snippet for debugging.
    // Load HTML content into Cheerio for parsing.
    const $ = cheerio.load(response.data);
    const events = [];

    // Define CSS selectors for Azure event cards and details.
    // These selectors are refined to try and exclude empty or irrelevant card-like elements.
    const eventCardSelector = ".event-card, .card:not(.empty), .event-item:not(:empty)";
    const titleSelector = ".card-title, h3:not(:empty), h4:not(:empty)";
    const descriptionSelector = ".card-body, p:not(:empty), .description";
    const dateSelector = ".event-date, .date, time";
    const linkSelector = "a[href]:not([href=''])";

    const cards = $(eventCardSelector);
    logger.info(`Azure Scraper found ${cards.length} potential event cards.`);

    // Iterate over each potential event card.
    cards.each((i, element) => {
      try {
        const title = $(element).find(titleSelector).first().text().trim();
        const description = $(element).find(descriptionSelector).first().text().trim();
        const dateText = $(element).find(dateSelector).first().text().trim();
        let link = $(element).find(linkSelector).first().attr("href");

        // Basic validation.
        if (title && link) {
          // Normalize relative URLs.
          if (!link.startsWith("http")) {
            const baseUrl = "https://azure.microsoft.com";
            link = link.startsWith("/") ? `${baseUrl}${link}` : `${baseUrl}/${link}`;
          }
          // Construct event object.
          events.push({
            title,
            description: description || "Microsoft Azure event",
            date: dateText || new Date().toISOString(),
            link: link,
            platform: "Azure",
            createdAt: FieldValue.serverTimestamp(),
          });
        } else {
          if (!title) logger.warn(`[fetchAzureEvents] Skipping card ${i} due to missing title.`);
          if (!link) logger.warn(`[fetchAzureEvents] Skipping card ${i} ("${title}") due to missing link.`);
        }
      } catch (error) {
        logger.warn(`[fetchAzureEvents] Error processing card ${i}:`, error.message);
      }
    });

    logger.info(`[fetchAzureEvents] Scraper found ${events.length} potential events.`);
    // Deduplicate events.
    const uniqueEvents = Array.from(new Map(events.map((e) => [`${e.title}-${e.link}`, e])).values());
    if (uniqueEvents.length < events.length) {
      logger.info(`[fetchAzureEvents] Scraper filtered down to ${uniqueEvents.length} unique events.`);
    }

    return uniqueEvents;
  } catch (error) {
    // Log detailed error information.
    logger.error(`[fetchAzureEvents] Error fetching events from ${azureUrl}:`, error.message, {stack: error.stack});
    return [];
  }
}

/**
 * Saves an array of event objects to the 'communityEvents' collection in Firestore.
 * It uses a batch write for efficiency and generates a unique ID for each event.
 * @async
 * @param {Array<object>} events - An array of event objects to be saved. Each object should
 *                                 contain at least `platform`, `link`, and `title`.
 * @returns {Promise<void>} A promise that resolves when the batch write is complete or if no events were saved.
 */
async function saveEventsToFirestore(events) {
  if (!events || events.length === 0) {
    logger.info("[saveEventsToFirestore] No events provided to save.");
    return;
  }
  const batch = db.batch(); // Initialize a Firestore batch.
  let savedCount = 0; // Counter for events added to the batch.
  const processedIds = new Set(); // To prevent adding duplicate event IDs within the same batch.

  logger.info(`[saveEventsToFirestore] Starting save process for ${events.length} fetched events.`);

  // Iterate over each event to prepare it for the batch write.
  events.forEach((event) => {
    // Basic validation for essential event properties.
    if (!event.platform || !event.link || !event.title) {
      logger.warn("[saveEventsToFirestore] Skipping event due to missing platform, link, or title:", event);
      return;
    }
    // Generate a document ID for Firestore.
    // Normalizes the link and combines it with the platform, then sanitizes and truncates.
    const normalizedLink = event.link.replace(/\/$/, "");
    const idSource = `${event.platform}-${normalizedLink}`;
    const eventId = idSource.replace(/[^a-zA-Z0-9_.~-]/g, "_").substring(0, 450);

    if (!eventId) {
      logger.warn("Could not generate valid eventId for event:", event.title, event.link);
      return;
    }

    // Check if this eventId has already been added to the current batch (local deduplication).
    if (processedIds.has(eventId)) {
      logger.warn(`[saveEventsToFirestore] Duplicate event ID detected in batch, skipping: ${eventId} for title: ${event.title}`);
      return;
    }
    processedIds.add(eventId);

    // Get a reference to the document in the 'communityEvents' collection.
    const eventRef = db.collection("communityEvents").doc(eventId);

    // Add a set operation to the batch. `merge: true` will update existing documents or create new ones.
    batch.set(eventRef, {
      ...event,
      id: eventId,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});

    savedCount++;
  });

  // Commit the batch if there are events to save.
  if (savedCount > 0) {
    try {
      await batch.commit();
      logger.info(`[saveEventsToFirestore] Successfully committed batch to save/update ${savedCount} events.`);
    } catch (commitError) {
      logger.error("[saveEventsToFirestore] Firestore batch commit failed:", commitError);
    }
  } else {
    logger.info("[saveEventsToFirestore] No valid events were added to the Firestore batch.");
  }
}

/**
 * Creates notifications in Firestore for users whose preferences match newly added/updated events.
 * @async
 * @param {Array<object>} newEvents - An array of new or updated event objects. Each event object
 *                                    MUST have an `id` and `platform` property.
 * @returns {Promise<void>} A promise that resolves when notification processing is complete.
 */
async function notifyUsersAboutEvents(newEvents) {
  if (!newEvents || newEvents.length === 0) {
    logger.info("[notifyUsersAboutEvents] No new events provided for notification.");
    return;
  }

  logger.info(`[notifyUsersAboutEvents] Checking ${newEvents.length} new/updated events for notifications.`);

  try {
    // Query for users who have enabled event notifications in their preferences.
    const usersSnapshot = await db.collection("users")
        .where("preferences.notifications.events", "==", true)
        .get();

    if (usersSnapshot.empty) {
      logger.info("[notifyUsersAboutEvents] No users found with event notification preferences enabled.");
      return;
    }

    logger.info(`[notifyUsersAboutEvents] Found ${usersSnapshot.size} users with event notifications enabled.`);

    const notifications = []; // Array to hold notification objects to be created.
    const now = Timestamp.now(); // Current timestamp for 'createdAt' field.

    // Iterate over each user who wants event notifications.
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // Determine user's platform preferences (e.g., GCP, AWS, Azure). Defaults to all if not set.
      let userPlatformPreferences = ["GCP", "AWS", "Azure"];
      if (userData && userData.preferences && Array.isArray(userData.preferences.platforms)) {
        userPlatformPreferences = userData.preferences.platforms;
      }

      const relevantEvents = newEvents.filter((event) =>
        event.id && event.platform && userPlatformPreferences.includes(event.platform),
      ); // Filter new events to match the user's platform preferences.

      // If there are relevant events for this user, create a notification object.
      if (relevantEvents.length > 0) {
        logger.info(`[notifyUsersAboutEvents] User ${userId} matches ${relevantEvents.length} events based on preferences: ${userPlatformPreferences.join(", ")}`);

        notifications.push({
          userId: userId, // The user to whom this notification belongs.
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

    // If there are notifications to create, batch write them to Firestore.
    if (notifications.length > 0) {
      const batch = db.batch();
      notifications.forEach((notification) => {
        const notifRef = db.collection("notifications").doc(); // Auto-generate ID for notification.
        batch.set(notifRef, notification);
      });

      try {
        await batch.commit();
        logger.info(`[notifyUsersAboutEvents] Successfully created ${notifications.length} event notifications.`);
      } catch (commitError) {
        logger.error("[notifyUsersAboutEvents] Failed to commit notification batch:", commitError);
      }
    } else {
      logger.info("[notifyUsersAboutEvents] No relevant events found matching any user preferences for notifications.");
    }
  } catch (error) {
    logger.error("[notifyUsersAboutEvents] Error querying users or processing notifications:", error);
  }
}

// --- V2 HTTP Trigger Function ---
/**
 * @name fetchCloudEvents
 * @description An HTTP-triggered Firebase Function (v2) that orchestrates the fetching of events
 *              from GCP, AWS, and Azure, saves them to Firestore, and notifies users.
 *              Typically triggered by a scheduler (e.g., Cloud Scheduler).
 * @param {object} req - The HTTP request object.
 * @param {object} res - The HTTP response object.
 */
exports.fetchCloudEvents = onRequest(
    {
      timeoutSeconds: 540, // Extended timeout for potentially long scraping operations.
      memory: "1GiB", // Increased memory for handling HTML parsing.
    },
    async (req, res) => {
      const executionId = req.get("X-Cloud-Trace-Context") || "unknown";
      logger.info(`[fetchCloudEvents_HTTP] Starting job. Execution: ${executionId}`);

      try {
        // Fetch events from all platforms concurrently.
        const [gcpEvents, awsEvents, azureEvents] = await Promise.all([
          fetchGCPEvents(),
          fetchAWSEvents(),
          fetchAzureEvents(),
        ]);

        const allEvents = [...gcpEvents, ...awsEvents, ...azureEvents];

        if (allEvents.length === 0) {
          logger.info("[fetchCloudEvents_HTTP] Job found no events across all platforms.");
          res.status(200).json({success: true, message: "No events found.", count: {total: 0, gcp: 0, aws: 0, azure: 0}});
          return;
        }

        logger.info(`[fetchCloudEvents_HTTP] Job found ${allEvents.length} total events (GCP: ${gcpEvents.length}, AWS: ${awsEvents.length}, Azure: ${azureEvents.length})`);

        // Save all fetched events to Firestore.
        await saveEventsToFirestore(allEvents);

        // Prepare events with their generated IDs for the notification step.
        const eventsWithIds = allEvents.map((event) => {
          if (!event.platform || !event.link) return null;
          const normalizedLink = event.link.replace(/\/$/, "");
          const idSource = `${event.platform}-${normalizedLink}`;
          const eventId = idSource.replace(/[^a-zA-Z0-9_.~-]/g, "_").substring(0, 450);
          return {...event, id: eventId};
        }).filter((e) => e && e.id); // Filter out any events that couldn't generate an ID.

        // Notify users about the newly fetched events.
        await notifyUsersAboutEvents(eventsWithIds);

        logger.info(`[fetchCloudEvents_HTTP] Job completed successfully. Execution: ${executionId}`);
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
        logger.error(`[fetchCloudEvents_HTTP] FATAL Error in job: ${error.message}`, {error: error, stack: error.stack, executionId: executionId});
        res.status(500).json({success: false, message: "Internal server error", error: error.message});
      }
    });

// --- V2 Callable Function ---
/**
 * @name manualFetchCloudEvents
 * @description A Firebase Callable Function (v2) that allows an authenticated admin user
 *              to manually trigger the cloud event fetching, saving, and notification process.
 * @param {object} request - The callable request object, containing `auth` and `data`.
 * @returns {Promise<object>} A promise that resolves with the result of the fetch operation.
 * @throws {HttpsError} Throws HttpsError for authentication/permission issues or internal errors.
 */
exports.manualFetchCloudEvents = onCall(
    {
      timeoutSeconds: 540, // Extended timeout.
      memory: "1GiB", // Increased memory.
    },
    async (request) => {
      logger.info("[manualFetchCloudEvents_Callable] Triggered", {auth: request.auth ? request.auth.uid : "No auth"});

      // --- Authentication and Authorization Check ---
      if (!request.auth) {
        logger.error("[manualFetchCloudEvents_Callable] Failed: Unauthenticated.");
        throw new HttpsError(
            "unauthenticated",
            "Authentication required to trigger manual fetch.",
        );
      }

      const uid = request.auth.uid;

      try {
        const userSnapshot = await db.collection("users").doc(uid).get();
        if (!userSnapshot.exists) {
          logger.error(`[manualFetchCloudEvents_Callable] Failed: User ${uid} not found.`);
          throw new HttpsError("not-found", `User ${uid} not found.`);
        }
        const userData = userSnapshot.data();
        // Ensure the calling user has an 'admin' role.
        if (userData.role !== "admin") {
          logger.error(`[manualFetchCloudEvents_Callable] Failed: User ${uid} lacks admin role.`);
          throw new HttpsError(
              "permission-denied",
              "Admin privileges required to trigger manual fetch.",
          );
        }
        logger.info(`[manualFetchCloudEvents_Callable] Authorized for admin user: ${uid}`);
      } catch (error) {
        logger.error(`[manualFetchCloudEvents_Callable] Error verifying admin role for user ${uid}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Could not verify user role.");
      }

      // --- Core Logic (similar to HTTP trigger) ---
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
          logger.info(`[manualFetchCloudEvents_Callable] Manual fetch by ${uid} found no events.`);
          return {success: true, message: "Manual fetch completed. No events found.", count: {total: 0, gcp: 0, aws: 0, azure: 0}};
        }

        logger.info(`[manualFetchCloudEvents_Callable] Manual fetch by ${uid} found ${totalCount} events (GCP: ${gcpCount}, AWS: ${awsCount}, Azure: ${azureCount})`);

        // Save events to Firestore.
        await saveEventsToFirestore(allEvents);

        // Prepare events with IDs for notification.
        const eventsWithIds = allEvents.map((event) => {
          if (!event.platform || !event.link) return null;
          const normalizedLink = event.link.replace(/\/$/, "");
          const idSource = `${event.platform}-${normalizedLink}`;
          const eventId = idSource.replace(/[^a-zA-Z0-9_.~-]/g, "_").substring(0, 450);
          return {...event, id: eventId};
        }).filter((e) => e && e.id); // Filter out events without a valid ID.

        // Notify users.
        await notifyUsersAboutEvents(eventsWithIds);

        logger.info(`[manualFetchCloudEvents_Callable] Manual fetch by ${uid} completed successfully.`);
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
        logger.error(`[manualFetchCloudEvents_Callable] Error during manual fetch triggered by ${uid}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError(
            "internal",
            "An internal error occurred during the manual fetch process.",
            error.message,
        );
      }
    });
