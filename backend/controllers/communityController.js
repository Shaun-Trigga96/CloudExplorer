// backend/controllers/communityController.js
const admin = require('firebase-admin');
const AppError = require('../utils/appError');
const { serverTimestamp } = require('../utils/firestoreHelpers'); // Assuming you have this helper

const db = admin.firestore();
const usersCollection = db.collection('users');
const postsCollection = db.collection('posts'); // Let's assume a 'posts' collection

/**
 * Fetches user details needed for embedding in posts or member lists.
 * Avoids fetching sensitive data.
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


// GET /api/v1/community/posts
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

// GET /api/v1/community/members
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


// POST /api/v1/community/posts (Example - Needs Authentication)
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

// POST /api/v1/community/posts/:postId/like (Example - Needs Authentication)
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

// DELETE /api/v1/community/posts/:postId/like (Example - Needs Authentication)
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
