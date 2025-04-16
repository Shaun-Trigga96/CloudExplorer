/* eslint-disable linebreak-style */
// eslint-disable-next-line linebreak-style
/* eslint-disable padded-blocks */
/* eslint-disable linebreak-style */
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
// Use initializeApp from firebase-admin/app for better practice if needed elsewhere
// but the simple check is often sufficient if only used here.
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore(); // Use getFirestore()

/**
 * Fetch latest GCP events from Google Cloud events page
 * @returns {Promise<Array>} Array of GCP event objects
 */
async function fetchGCPEvents() {
  try {
    const response = await axios.get("https://cloud.google.com/events");
    const $ = cheerio.load(response.data);
    const events = [];

    // Extract events from the page
    $(".event-card").each((i, element) => {
      const title = $(element).find(".event-title").text().trim();
      const description = $(element).find(".event-description").text().trim();
      const dateText = $(element).find(".event-date").text().trim();
      const link = $(element).find("a").attr("href");

      // Only add events with valid titles
      if (title) {
        events.push({
          title,
          description: description || "Google Cloud event",
          date: dateText || new Date().toISOString(), // Consider parsing dateText more robustly if possible
          link: link && link.startsWith("http") ? link : `https://cloud.google.com${link || "/events"}`,
          platform: "GCP",
          createdAt: FieldValue.serverTimestamp(), // Use FieldValue
        });
      }
    });

    return events;
  } catch (error) {
    logger.error("Error fetching GCP events:", error); // Use logger
    return [];
  }
}

/**
 * Fetch latest AWS events from AWS events page
 * @returns {Promise<Array>} Array of AWS event objects
 */
async function fetchAWSEvents() {
  try {
    const response = await axios.get("https://aws.amazon.com/events/");
    const $ = cheerio.load(response.data);
    const events = [];

    // Extract events from the page
    // Note: AWS event page structure might change, selectors need verification
    $(".aws-card, .event-card, .lb-card, .card").each((i, element) => { // Added more potential selectors
      const title = $(element).find(".title, .headline, h3, h4").first().text().trim(); // Try common title elements
      const description = $(element).find(".description, .abstract, p").first().text().trim();
      const dateText = $(element).find(".date, .event-date, .timestamp").first().text().trim();
      let link = $(element).find("a").first().attr("href");

      // Basic validation
      if (title && link) {
        // Ensure link is absolute
        if (link && !link.startsWith("http")) {
          link = `https://aws.amazon.com${link.startsWith("/") ? "" : "/"}${link}`;
        }

        events.push({
          title,
          description: description || "AWS event",
          date: dateText || new Date().toISOString(),
          link: link,
          platform: "AWS",
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    });

    // Filter out potential duplicates based on title/link if scraping is messy
    const uniqueEvents = Array.from(new Map(events.map((e) => [`${e.title}-${e.link}`, e])).values());


    return uniqueEvents;
  } catch (error) {
    logger.error("Error fetching AWS events:", error); // Use logger
    return [];
  }
}


/**
 * Fetch latest Azure events from Microsoft Azure events page
 * @returns {Promise<Array>} Array of Azure event objects
 */
async function fetchAzureEvents() {
  try {
    // Updated URL as the previous one might be less specific
    const response = await axios.get("https://azure.microsoft.com/en-us/community/events/");
    const $ = cheerio.load(response.data);
    const events = [];

    // Adjust selectors based on the current structure of the Azure events page
    $(".event-card, .card, .column").each((i, element) => { // Example selectors, inspect the page
      const title = $(element).find(".card-title, h3, h4").first().text().trim();
      const description = $(element).find(".card-body, p").first().text().trim();
      // Date might be harder to find consistently, look for specific patterns or elements
      const dateText = $(element).find(".event-date, .date").first().text().trim();
      let link = $(element).find("a").first().attr("href");

      if (title && link) {
        // Ensure link is absolute
        if (link && !link.startsWith("http")) {
          link = `https://azure.microsoft.com${link.startsWith("/") ? "" : "/"}${link}`;
        }

        events.push({
          title,
          description: description || "Microsoft Azure event",
          date: dateText || new Date().toISOString(),
          link: link,
          platform: "Azure",
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    });

    // Filter out potential duplicates
    const uniqueEvents = Array.from(new Map(events.map((e) => [`${e.title}-${e.link}`, e])).values());

    return uniqueEvents;
  } catch (error) {
    logger.error("Error fetching Azure events:", error); // Use logger
    return [];
  }
}


/**
 * Save events to Firestore
 * @param {Array} events Array of event objects to save
 * @returns {Promise<void>}
 */
async function saveEventsToFirestore(events) {
  if (events.length === 0) {
    logger.info("No events provided to saveEventsToFirestore.");
    return;
  }
  const batch = db.batch();
  let savedCount = 0;

  events.forEach((event) => {
    // Create a more robust unique ID based on platform and link (links are usually more unique than titles)
    // Use a simple hash or sanitize the link if it's very long or has many invalid chars
    const idSource = `${event.platform}-${event.link}`;
    // Basic sanitization for Firestore ID
    const eventId = idSource.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 400); // Limit length

    if (!eventId) {
      logger.warn("Could not generate valid eventId for event:", event.title);
      return; // Skip if ID generation failed
    }

    const eventRef = db.collection("communityEvents").doc(eventId); // Changed collection name to match previous suggestion

    // Add event to batch, using merge to update existing events
    batch.set(eventRef, {
      ...event,
      // Add an 'id' field within the document itself for easier client-side access
      id: eventId,
      // Use Timestamp for consistency if needed elsewhere, otherwise serverTimestamp is fine
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
    savedCount++;
  });

  if (savedCount > 0) {
    // Commit the batch
    await batch.commit();
    logger.info(`Attempted to save/update ${savedCount} events to Firestore.`);
  } else {
    logger.info("No valid events were added to the Firestore batch.");
  }
}

/**
 * Notify users about new events based on their preferences
 * @param {Array} newEvents Array of new event objects (assumes they have an 'id' field now)
 * @returns {Promise<void>}
 */
async function notifyUsersAboutEvents(newEvents) {
  if (newEvents.length === 0) return;

  try {
    // Get users with notification preferences
    const usersSnapshot = await db.collection("users")
        .where("preferences.notifications.events", "==", true)
        .get();

    if (usersSnapshot.empty) {
      logger.info("No users with event notification preferences found");
      return;
    }

    const notifications = [];
    const now = Timestamp.now(); // Use Firestore Timestamp

    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      // Default to all platforms if preference not set
      const userPlatformPreferences = userData.preferences && userData.preferences.platforms || ["GCP", "AWS", "Azure"];

      // Filter events based on user platform preferences
      const relevantEvents = newEvents.filter((event) =>
        userPlatformPreferences.includes(event.platform),
      );

      if (relevantEvents.length > 0) {
        // Create notification for this user
        notifications.push({
          userId: userDoc.id,
          title: "New Cloud Events Available",
          // Generate a more specific body if possible
          body: `${relevantEvents.length} new event${relevantEvents.length > 1 ? "s" : ""} matching your preferences.`,
          data: { // Data payload for client-side handling
            type: "events",
            count: relevantEvents.length.toString(), // Data payload values should be strings
            // Pass IDs generated in saveEventsToFirestore
            eventIds: JSON.stringify(relevantEvents.map((e) => e.id || e.title)), // Ensure ID exists, fallback to title
          },
          read: false,
          createdAt: now, // Use consistent timestamp
        });
      }
    });

    // Save notifications in a batch
    if (notifications.length > 0) {
      const batch = db.batch();
      notifications.forEach((notification) => {
        // Store notifications in a subcollection under the user for better querying?
        // Or keep a central collection as is.
        // const notifRef = db.collection("users").doc(notification.userId).collection("notifications").doc();
        const notifRef = db.collection("notifications").doc(); // Central collection
        batch.set(notifRef, notification);
      });
      await batch.commit();
      logger.info(`Created ${notifications.length} notifications for users.`);
    }
  } catch (error) {
    logger.error("Error notifying users about events:", error);
  }
}

// --- V2 Scheduled Function ---
exports.fetchCloudEvents = onSchedule(
    {
      schedule: "0 */12 * * *", // Run twice daily (00:00 and 12:00)
      timeZone: "UTC",
      timeoutSeconds: 540, // Extend timeout for scraping
      memory: "1GiB", // Increase memory for scraping if needed
      // region: 'us-central1' // Specify region if needed
    },
    async (event) => { // V2 uses 'event' argument
      logger.info("Starting cloud events fetch job (v2)"); // Use logger

      try {
      // Fetch events from all platforms in parallel
        const [gcpEvents, awsEvents, azureEvents] = await Promise.all([
          fetchGCPEvents(),
          fetchAWSEvents(),
          fetchAzureEvents(),
        ]);

        // Combine all events
        const allEvents = [...gcpEvents, ...awsEvents, ...azureEvents];

        if (allEvents.length === 0) {
          logger.info("No events found across all platforms."); // Use logger
          return null; // Explicitly return null for success
        }

        logger.info(`Found ${allEvents.length} events (GCP: ${gcpEvents.length}, AWS: ${awsEvents.length}, Azure: ${azureEvents.length})`); // Use logger

        // Save events to database - this function now adds the 'id' field
        await saveEventsToFirestore(allEvents);

        // Prepare events with IDs for notification function
        // Re-read or assume saveEventsToFirestore adds the ID correctly (less efficient but simpler)
        // Or modify saveEventsToFirestore to return the events with IDs
        // For now, we assume the structure passed to notifyUsersAboutEvents is correct
        // (requires saveEventsToFirestore to add the 'id' field reliably)

        // Let's refine this: Fetch the IDs after saving or modify saveEvents to return them
        // Simple approach: Assume saveEventsToFirestore added the 'id' field based on link/platform
        const eventsWithIds = allEvents.map((event) => {
          const idSource = `${event.platform}-${event.link}`;
          const eventId = idSource.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 400);
          return {...event, id: eventId};
        }).filter((e) => e.id); // Filter out any events where ID generation failed


        // Notify users about new events
        await notifyUsersAboutEvents(eventsWithIds);

        logger.info("Cloud events fetch job completed successfully (v2)"); // Use logger
        return null; // Explicitly return null for success
      } catch (error) {
        logger.error("Error in cloud events fetch job (v2):", error); // Use logger
        // V2 scheduled functions don't explicitly return errors like this,
        // logging the error is the primary way to indicate failure.
        // Throwing the error might cause retries depending on configuration.
        return null; // Return null even on error to prevent unwanted retries unless configured
      }
    });

// --- V2 Callable Function ---
exports.manualFetchCloudEvents = onCall(
    {
      timeoutSeconds: 300,
      memory: "1GiB",
      // region: 'us-central1' // Specify region if needed
    },
    async (request) => { // V2 uses 'request' argument
      logger.info("Manual fetch triggered", {auth: request.auth}); // Log auth info if present

      // Check if request is made by an authenticated user (basic check)
      if (!request.auth) {
        // Throwing an HttpsError is the correct way to return errors from onCall functions.
        throw new HttpsError(
            "unauthenticated",
            "The function must be called while authenticated.",
        );
      }

      // Verify admin role if needed (using Firestore read)
      try {
        const userSnapshot = await db.collection("users").doc(request.auth.uid).get();
        const userData = userSnapshot.data();
        if (!userData || userData.role !== "admin") {
          throw new HttpsError(
              "permission-denied",
              "This function can only be called by admins.",
          );
        }
      } catch (error) {
        logger.error("Error verifying admin role:", error);
        throw new HttpsError("internal", "Could not verify user role.");
      }


      logger.info(`Manual fetch requested by admin: ${request.auth.uid}`);

      try {
        // Fetch events from all platforms in parallel
        const [gcpEvents, awsEvents, azureEvents] = await Promise.all([
          fetchGCPEvents(),
          fetchAWSEvents(),
          fetchAzureEvents(),
        ]);

        // Combine all events
        const allEvents = [...gcpEvents, ...awsEvents, ...azureEvents];

        if (allEvents.length === 0) {
          logger.info("Manual fetch found no events.");
          return {success: true, message: "No events found"}; // Return success object
        }

        logger.info(`Manual fetch found ${allEvents.length} events.`);

        // Save events to database
        await saveEventsToFirestore(allEvents);

        // Prepare events with IDs for notification
        const eventsWithIds = allEvents.map((event) => {
          const idSource = `${event.platform}-${event.link}`;
          const eventId = idSource.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 400);
          return {...event, id: eventId};
        }).filter((e) => e.id);

        // Notify users about new events
        await notifyUsersAboutEvents(eventsWithIds);

        logger.info("Manual fetch completed successfully.");
        // Return success object
        return {
          success: true,
          message: `Successfully fetched and processed ${allEvents.length} events`,
          count: {
            total: allEvents.length,
            gcp: gcpEvents.length,
            aws: awsEvents.length,
            azure: azureEvents.length,
          },
        };
      } catch (error) {
        logger.error("Error in manual cloud events fetch:", error);
        // Throw HttpsError for client feedback
        throw new HttpsError(
            "internal", // Generic error code
            "An internal error occurred while fetching cloud events.",
            error.message, // Optionally include details (be careful about leaking info)
        );
      }
    });
