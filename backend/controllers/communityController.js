// backend/controllers/communityController.js
const admin = require('firebase-admin');
const AppError = require('../utils/appError');
const { serverTimestamp } = require('../utils/firestoreHelpers'); // Assuming you have this helper

const db = admin.firestore();
const usersCollection = db.collection('users');
const postsCollection = db.collection('posts'); // Let's assume a 'posts' collection
const topicsCollection = db.collection('topics');
const eventsCollection = db.collection('events');
const communityEventsCollection = db.collection('communityEvents');

/**
 * @file communityController.js
 * @description This file contains controller functions for managing community interactions,
 * including posts, members, topics, and events.
 */

/**
 * @private
 * @desc    Fetches minimal user details (displayName, photoURL, level) for embedding in posts or member lists.
 *          Avoids fetching sensitive user data.
 * @param {string[]} userIds - Array of user IDs to fetch.
 * @returns {Promise<Map<string, object>>} - Map of userId -> user details.
 */
const getUsersDetails = async (userIds) => {
    const userDetailsMap = new Map();
    if (!userIds || userIds.length === 0) {
        return userDetailsMap;
    }

    // Firestore 'in' query supports up to 30 elements per query
    const MAX_IDS_PER_QUERY = 30;
    const userPromises = [];

    for (let i = 0; i < userIds.length; i += MAX_IDS_PER_QUERY) {
        const batchIds = userIds.slice(i, i + MAX_IDS_PER_QUERY);
        userPromises.push(
            usersCollection.where(admin.firestore.FieldPath.documentId(), 'in', batchIds).get()
        );
    }

    const snapshots = await Promise.all(userPromises);

    snapshots.forEach(snapshot => {
        snapshot.forEach(doc => {
            const data = doc.data();
            userDetailsMap.set(doc.id, {
                // Match the structure needed by the frontend's CommunityPost['user']
                id: doc.id,
                name: data.displayName || 'Unknown User', // Use displayName
                avatar: data.photoURL || null, // Use photoURL
                level: data.level || 'Beginner', // Assuming 'level' exists on user doc
                // Add any other non-sensitive fields needed
            });
        });
    });

    return userDetailsMap;
};


/**
 * @desc    Get community posts with pagination and sorting.
 * @route   GET /api/v1/community/posts
 * @access  Public (or Private if authentication is needed to view posts)
 * @query   {number} [limit=10] - Number of posts to return (1-50).
 * @query   {string} [lastId] - ID of the last post from the previous page for pagination.
 * @query   {string} [orderBy='timestamp'] - Field to order by (e.g., 'timestamp', 'likes', 'comments').
 * @query   {string} [orderDir='desc'] - Order direction ('asc' or 'desc').
 */
exports.getCommunityPosts = async (req, res, next) => {
    try {
        const {
            limit = 10,
            lastId, // For pagination: ID of the last post fetched
            orderBy = 'timestamp', // Default sort: newest first
            orderDir = 'desc'
        } = req.query;
        const parsedLimit = parseInt(limit, 10);

        if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 50) {
            return next(new AppError('Invalid limit value (must be 1-50)', 400, 'INVALID_LIMIT'));
        }
        const validOrderBy = ['timestamp', 'likes', 'comments']; // Allowed sort fields
        const validOrderDir = ['asc', 'desc'];
        if (!validOrderBy.includes(orderBy) || !validOrderDir.includes(orderDir)) {
            return next(new AppError('Invalid orderBy or orderDir parameter', 400, 'INVALID_SORT'));
        }

        let query = postsCollection.orderBy(orderBy, orderDir).limit(parsedLimit);

        if (lastId) {
            const lastDocSnapshot = await postsCollection.doc(lastId).get();
            if (lastDocSnapshot.exists) {
                query = query.startAfter(lastDocSnapshot);
            } else {
                console.warn(`Pagination lastId '${lastId}' not found for posts. Starting from beginning.`);
            }
        }

        const postsSnapshot = await query.get();

        if (postsSnapshot.empty) {
            return res.json({ posts: [], hasMore: false, lastId: null });
        }

        // Prepare posts and collect user IDs
        const postsData = [];
        const userIdsToFetch = new Set();
        postsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            // Basic validation/defaults
            if (!data.userId) {
                console.warn(`Post ${doc.id} is missing userId. Skipping.`);
                return; // Skip posts without an author ID
            }
            postsData.push({
                id: doc.id,
                userId: data.userId, // Keep userId temporarily
                content: data.content || '',
                topic: data.topic || 'General',
                likes: data.likes || 0,
                comments: data.comments || 0,
                timestamp: data.timestamp?.toDate()?.toISOString() || new Date().toISOString(), // Ensure ISO string
                // Add other fields like 'isLiked' based on requesting user later
            });
            userIdsToFetch.add(data.userId);
        });

        // Fetch user details in batch
        const userDetailsMap = await getUsersDetails(Array.from(userIdsToFetch));

        // Combine post data with user data
        const posts = postsData.map(post => {
            const userDetails = userDetailsMap.get(post.userId) || {
                id: post.userId,
                name: 'Unknown User',
                avatar: null,
                level: 'Beginner'
            };
            // Structure matching frontend's CommunityPost type
            return {
                id: post.id,
                user: userDetails, // Embed user object
                content: post.content,
                topic: post.topic,
                likes: post.likes,
                comments: post.comments,
                timestamp: post.timestamp,
                isLiked: false, // Default to false, needs user context to determine accurately
            };
        });

        const newLastId = posts.length > 0 ? posts[posts.length - 1].id : null;

        res.json({
            posts,
            hasMore: posts.length === parsedLimit,
            lastId: newLastId,
        });

    } catch (error) {
        console.error('Error fetching community posts:', error);
        next(error);
    }
};

/**
 * @desc    Get community members with pagination and sorting.
 * @route   GET /api/v1/community/members
 * @access  Public (or Private if authentication is needed to view members)
 * @query   {number} [limit=15] - Number of members to return (1-50).
 * @query   {string} [lastId] - ID of the last member (user ID) from the previous page for pagination.
 * @query   {string} [orderBy='lastActivity'] - Field to order by (e.g., 'lastActivity', 'displayName', 'createdAt').
 * @query   {string} [orderDir='desc'] - Order direction ('asc' or 'desc').
 */
exports.getCommunityMembers = async (req, res, next) => {
    try {
        const {
            limit = 15, // Different limit for members?
            lastId, // For pagination: ID of the last user fetched
            orderBy = 'lastActivity', // Sort by recent activity? Or 'displayName'?
            orderDir = 'desc'
        } = req.query;
        const parsedLimit = parseInt(limit, 10);

        if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 50) {
            return next(new AppError('Invalid limit value (must be 1-50)', 400, 'INVALID_LIMIT'));
        }
        // Add more valid fields if needed (e.g., 'createdAt', 'displayName')
        const validOrderBy = ['lastActivity', 'displayName', 'createdAt'];
        const validOrderDir = ['asc', 'desc'];
        if (!validOrderBy.includes(orderBy) || !validOrderDir.includes(orderDir)) {
            return next(new AppError('Invalid orderBy or orderDir parameter', 400, 'INVALID_SORT'));
        }

        let query = usersCollection
            // Add filters if needed, e.g., .where('isCommunityMember', '==', true)
            .orderBy(orderBy, orderDir)
            .limit(parsedLimit);

        if (lastId) {
            const lastDocSnapshot = await usersCollection.doc(lastId).get();
            if (lastDocSnapshot.exists) {
                query = query.startAfter(lastDocSnapshot);
            } else {
                console.warn(`Pagination lastId '${lastId}' not found for members. Starting from beginning.`);
            }
        }

        const membersSnapshot = await query.get();

        const members = membersSnapshot.docs.map(doc => {
            const data = doc.data();
            // Structure matching frontend's CommunityMember type
            return {
                id: doc.id,
                name: data.displayName || 'Unknown User',
                avatar: data.photoURL || null,
                level: data.level || 'Beginner', // Assuming 'level' exists
                isOnline: data.isOnline || false, // Assuming 'isOnline' exists (needs presence system)
                // Add other relevant fields
            };
        });

        const newLastId = members.length > 0 ? members[members.length - 1].id : null;

        res.json({
            members,
            hasMore: members.length === parsedLimit,
            lastId: newLastId,
        });

    } catch (error) {
        console.error('Error fetching community members:', error);
        next(error);
    }
};


/**
 * @desc    Create a new community post.
 * @route   POST /api/v1/community/posts
 * @access  Private (Requires user authentication. `userId` should ideally come from `req.user`).
 * @body    {string} userId - The ID of the user creating the post.
 * @body    {string} content - The content of the post.
 * @body    {string} topic - The topic of the post.
 */
exports.createCommunityPost = async (req, res, next) => {
    try {
        // IMPORTANT: Replace with actual authenticated user ID
        const { userId, content, topic } = req.body; // Get userId from authenticated request later

        if (!userId) {
             return next(new AppError('Authentication required to create post', 401, 'AUTH_REQUIRED'));
        }
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return next(new AppError('Post content cannot be empty', 400, 'INVALID_CONTENT'));
        }
        if (content.length > 1000) { // Example limit
             return next(new AppError('Post content exceeds maximum length', 400, 'CONTENT_TOO_LONG'));
        }
        if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
            return next(new AppError('Post topic cannot be empty', 400, 'INVALID_TOPIC'));
        }

        // Verify user exists (optional but good practice)
        const userDoc = await usersCollection.doc(userId).get();
        if (!userDoc.exists) {
            return next(new AppError('User creating post not found', 404, 'USER_NOT_FOUND'));
        }

        const newPostRef = postsCollection.doc(); // Auto-generate ID
        const timestamp = serverTimestamp(); // Use server time

        const newPostData = {
            userId: userId,
            content: content.trim(),
            topic: topic.trim(),
            likes: 0,
            comments: 0,
            timestamp: timestamp,
            createdAt: timestamp, // Add createdAt for potential sorting/filtering
            likedBy: [] // Initialize empty array to track likes per user
        };

        await newPostRef.set(newPostData);

        // Fetch the created post data including the user details to return it
        const userDetails = await getUsersDetails([userId]);
        const createdPost = {
            id: newPostRef.id,
            user: userDetails.get(userId) || { id: userId, name: 'Unknown', avatar: null, level: 'Beginner' },
            content: newPostData.content,
            topic: newPostData.topic,
            likes: newPostData.likes,
            comments: newPostData.comments,
            timestamp: new Date().toISOString(), // Approximate client timestamp
            isLiked: false, // Newly created post isn't liked by creator yet
        };

        res.status(201).json({
            message: 'Post created successfully',
            post: createdPost // Return the newly created post in the correct format
        });

    } catch (error) {
        console.error('Error creating community post:', error);
        next(error);
    }
};

/**
 * @desc    Like a community post.
 * @route   POST /api/v1/community/posts/:postId/like
 * @access  Private (Requires user authentication. `userId` should ideally come from `req.user`).
 * @param   {string} req.params.postId - The ID of the post to like.
 * @body    {string} userId - The ID of the user liking the post.
 */
exports.likePost = async (req, res, next) => {
    try {
        const { postId } = req.params;
        const { userId } = req.body; // Get userId from authenticated request later

        if (!userId) {
            return next(new AppError('Authentication required to like post', 401, 'AUTH_REQUIRED'));
        }

        const postRef = postsCollection.doc(postId);

        // Use a transaction to ensure atomic update
        await db.runTransaction(async (transaction) => {
            const postDoc = await transaction.get(postRef);
            if (!postDoc.exists) {
                throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
            }

            const postData = postDoc.data();
            const likedBy = postData.likedBy || [];

            // Only update if the user hasn't already liked it
            if (!likedBy.includes(userId)) {
                transaction.update(postRef, {
                    likes: admin.firestore.FieldValue.increment(1),
                    likedBy: admin.firestore.FieldValue.arrayUnion(userId)
                });
            } else {
                 // Optional: If already liked, maybe just return success without changing anything
                 // Or throw an error: throw new AppError('Post already liked', 400, 'ALREADY_LIKED');
                 console.log(`User ${userId} already liked post ${postId}. No change made.`);
            }
        });

        res.status(200).json({ message: 'Post liked successfully' });

    } catch (error) {
        console.error(`Error liking post ${req.params.postId}:`, error);
        // Handle specific transaction errors or AppErrors thrown within
        if (error instanceof AppError) {
            return next(error);
        }
        next(error);
    }
};

/**
 * @desc    Unlike a community post.
 * @route   DELETE /api/v1/community/posts/:postId/like (or POST, depending on API design preference)
 * @access  Private (Requires user authentication. `userId` should ideally come from `req.user`).
 * @param   {string} req.params.postId - The ID of the post to unlike.
 * @body    {string} userId - The ID of the user unliking the post.
 */
exports.unlikePost = async (req, res, next) => {
    try {
        const { postId } = req.params;
        const { userId } = req.body; // Get userId from authenticated request later

        if (!userId) {
            return next(new AppError('Authentication required to unlike post', 401, 'AUTH_REQUIRED'));
        }

        const postRef = postsCollection.doc(postId);

        // Use a transaction
        await db.runTransaction(async (transaction) => {
            const postDoc = await transaction.get(postRef);
            if (!postDoc.exists) {
                throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
            }

             const postData = postDoc.data();
             const likedBy = postData.likedBy || [];

            // Only update if the user has actually liked it
            if (likedBy.includes(userId)) {
                transaction.update(postRef, {
                    likes: admin.firestore.FieldValue.increment(-1), // Decrement likes
                    likedBy: admin.firestore.FieldValue.arrayRemove(userId) // Remove user from array
                });
            } else {
                 // Optional: If not liked, return success or throw error
                 console.log(`User ${userId} had not liked post ${postId}. No change made.`);
                 // throw new AppError('Post not liked by user', 400, 'NOT_LIKED');
            }
        });

        res.status(200).json({ message: 'Post unliked successfully' });

    } catch (error) {
        console.error(`Error unliking post ${req.params.postId}:`, error);
         if (error instanceof AppError) {
            return next(error);
        }
        next(error);
    }
};

/**
 * @desc    Get community topics with pagination and sorting.
 * @route   GET /api/v1/community/topics
 * @access  Public
 * @query   {number} [limit=20] - Number of topics to return (1-50).
 * @query   {string} [lastId] - ID of the last topic from the previous page for pagination.
 * @query   {string} [orderBy='count'] - Field to order by (e.g., 'count', 'name').
 * @query   {string} [orderDir='desc'] - Order direction ('asc' or 'desc').
 */
exports.getCommunityTopics = async (req, res, next) => {
    try {
      const { limit = 20, lastId, orderBy = 'count', orderDir = 'desc' } = req.query;
      const parsedLimit = parseInt(limit, 10);
  
      if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 50) {
        return next(new AppError('Invalid limit value (must be 1-50)', 400, 'INVALID_LIMIT'));
      }
      const validOrderBy = ['count', 'name'];
      const validOrderDir = ['asc', 'desc'];
      if (!validOrderBy.includes(orderBy) || !validOrderDir.includes(orderDir)) {
        return next(new AppError('Invalid orderBy or orderDir parameter', 400, 'INVALID_SORT'));
      }
  
      let query = topicsCollection.orderBy(orderBy, orderDir).limit(parsedLimit);
  
      if (lastId) {
        const lastDocSnapshot = await topicsCollection.doc(lastId).get();
        if (lastDocSnapshot.exists) {
          query = query.startAfter(lastDocSnapshot);
        } else {
          console.warn(`Pagination lastId '${lastId}' not found for topics. Starting from beginning.`);
        }
      }
  
      const topicsSnapshot = await query.get();
  
      if (topicsSnapshot.empty) {
        return res.json({ topics: [], hasMore: false, lastId: null });
      }
  
      const topics = topicsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'General',
        count: doc.data().count || 0,
      }));
  
      const newLastId = topics.length > 0 ? topics[topics.length - 1].id : null;
  
      res.json({
        topics,
        hasMore: topics.length === parsedLimit,
        lastId: newLastId,
      });
    } catch (error) {
      console.error('Error fetching community topics:', error);
      next(error);
    }
  };

  /**
   * @desc    Get community events with pagination and sorting.
   * @route   GET /api/v1/community/events
   * @access  Public
   * @query   {number} [limit=10] - Number of events to return (1-50).
   * @query   {string} [lastId] - ID of the last event from the previous page for pagination.
   * @query   {string} [orderBy='date'] - Field to order by (e.g., 'date', 'title').
   * @query   {string} [orderDir='desc'] - Order direction ('asc' or 'desc').
   * @note    Uses the `communityEvents` collection.
   */
  exports.getCommunityEvents = async (req, res, next) => {
    try {
      const { limit = 10, lastId, orderBy = 'date', orderDir = 'desc' } = req.query;
      const parsedLimit = parseInt(limit, 10);
  
      if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 50) {
        return next(new AppError('Invalid limit value (must be 1-50)', 400, 'INVALID_LIMIT'));
      }
      const validOrderBy = ['date', 'title'];
      const validOrderDir = ['asc', 'desc'];
      if (!validOrderBy.includes(orderBy) || !validOrderDir.includes(orderDir)) {
        return next(new AppError('Invalid orderBy or orderDir parameter', 400, 'INVALID_SORT'));
      }
  
      let query = communityEventsCollection.orderBy(orderBy, orderDir).limit(parsedLimit); // <-- Use the correct collection
  
      if (lastId) {
        const lastDocSnapshot = await communityEventsCollection.doc(lastId).get(); // <-- Use the correct collection
        if (lastDocSnapshot.exists) {
          query = query.startAfter(lastDocSnapshot);
        } else {
          console.warn(`Pagination lastId '${lastId}' not found for events. Starting from beginning.`);
        }
      }
  
      const eventsSnapshot = await query.get();
  
      if (eventsSnapshot.empty) {
        return res.json({ events: [], hasMore: false, lastId: null });
      }
  
      const events = eventsSnapshot.docs.map(doc => {
        const data = doc.data();
        const eventDate = data.date;
        const isUpcoming = eventDate && eventDate > new Date();
        return {
          id: doc.id,
          title: data.title || 'Untitled Event',
          date: eventDate,
          time: data.time || '',
          description: data.description || '',
          attending: data.attending || 0,
          interested: data.interested || 0,
          speakers: data.speakers || 0,
          daysLeft: isUpcoming && eventDate ? Math.ceil((eventDate - new Date()) / (1000 * 60 * 60 * 24)) : 0,
          isUpcoming: isUpcoming,
        };
      });
  
      const newLastId = events.length > 0 ? events[events.length - 1].id : null;
  
      res.json({
        events,
        hasMore: events.length === parsedLimit,
        lastId: newLastId,
      });
    } catch (error) {
      console.error('Error fetching community events:', error);
      next(error);
    }
  };