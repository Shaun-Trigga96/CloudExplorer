const admin = require('firebase-admin');
const db = admin.firestore(); // Assuming db is initialized elsewhere and accessible via admin

// Helper function for parsing AI response into structured quiz/exam questions
function parseQuizFromAIResponse(text) {
  if (!text || typeof text !== 'string') {
      console.warn('AI response text is empty or invalid. Returning empty questions array.');
      return [];
  }
  const questions = [];
  const lines = text.trim().split(/\r?\n/); // Split text into lines

  let currentQuestion = null;
  let processingStage = 'question'; // Stages: question, options, answer, explanation

  lines.forEach((line, index) => {
    line = line.trim();
    if (!line) return; // Skip empty lines

    try {
      // --- Detect Start of a New Question ---
      // Look for "Question:", "Q:", or numbered questions like "1.", "1)" etc.
      const newQuestionMatch = line.match(/^(?:question|Q)\s*\d*[:.)]?\s*(.*)/i) || line.match(/^(\d+)[:.)]\s+(.*)/);
      if (newQuestionMatch) {
        // If a previous question exists and is valid, push it
        if (currentQuestion && currentQuestion.question && currentQuestion.answers.length > 0 && currentQuestion.correctAnswer) {
           if (!currentQuestion.explanation) currentQuestion.explanation = `The correct answer is ${currentQuestion.correctAnswer.toUpperCase()}.`;
           questions.push(currentQuestion);
        }
        // Start a new question object
        currentQuestion = {
          id: questions.length, // Assign sequential ID based on order found
          question: (newQuestionMatch[1] || newQuestionMatch[2]).trim(), // Get the actual question text
          answers: [],
          correctAnswer: '',
          explanation: '',
        };
        processingStage = 'options'; // Expect options next
        return; // Move to next line
      }

      // --- Process based on current stage ---
      if (currentQuestion) {
        // Explanation often spans multiple lines, detect start and append
        const explanationMatch = line.match(/^(?:explanation|rationale|reason)[:\s]*(.*)/i);
         if (explanationMatch || processingStage === 'explanation') {
            if (processingStage !== 'explanation') {
                 // Starting explanation
                currentQuestion.explanation = (explanationMatch[1] || '').trim();
            } else {
                 // Continuing explanation
                currentQuestion.explanation += ' ' + line;
            }
            processingStage = 'explanation';
            return; // Continue potentially multi-line explanation
         }


        // Detect Correct Answer (allow various formats)
        const correctMatch = line.match(/^(?:correct\s+answer|answer)[:\s]*(.+)/i);
        if (correctMatch && processingStage !== 'explanation') {
          let correctAnswerText = correctMatch[1].trim();
           // Normalize common formats (a, a), True, False)
          if (correctAnswerText.match(/^[a-d]$/i)) {
              currentQuestion.correctAnswer = correctAnswerText.toLowerCase();
          } else if (correctAnswerText.match(/^[a-d][)\.]/i)) {
              currentQuestion.correctAnswer = correctAnswerText.charAt(0).toLowerCase();
          } else if (correctAnswerText.toLowerCase() === 'true' || correctAnswerText.toLowerCase() === 'false') {
               currentQuestion.correctAnswer = correctAnswerText.toLowerCase();
               // Add default T/F options if missing
               if (currentQuestion.answers.length === 0) {
                    currentQuestion.answers.push({ letter: 'true', answer: 'True', uniqueKey: `q${currentQuestion.id}-true` });
                    currentQuestion.answers.push({ letter: 'false', answer: 'False', uniqueKey: `q${currentQuestion.id}-false` });
               }
          } else {
               // Try extracting letter if embedded (e.g., "The correct answer is B) ...")
               const embeddedLetter = correctAnswerText.match(/(?:option|answer)?\s*['"(]?([a-d])['")\.]?/i);
               if (embeddedLetter) {
                   currentQuestion.correctAnswer = embeddedLetter[1].toLowerCase();
               } else {
                   console.warn(`Could not parse correct answer format: "${correctAnswerText}" for question ID ${currentQuestion.id}`);
                   // Fallback or leave empty? Leaving empty for now.
               }
          }
          processingStage = 'explanation'; // Expect explanation next (or new question)
          return;
        }


         // Detect Multiple Choice Options (must come before explanation/correct answer parsing)
         const optionMatch = line.match(/^([a-d])[:.)]\s+(.*)/i);
         if (optionMatch && processingStage !== 'explanation' && processingStage !== 'answer') {
            const letter = optionMatch[1].toLowerCase();
            const answerText = optionMatch[2].trim();
            if (answerText) {
                currentQuestion.answers.push({
                    letter: letter,
                    answer: answerText,
                    uniqueKey: `q${currentQuestion.id}-${letter}` // Unique key for React lists etc.
                });
            }
            processingStage = 'options'; // Still expecting options or correct answer
            return;
         }

         // If line doesn't match any pattern and we are in 'options' stage,
         // it might be a continuation of the question text or poorly formatted.
         // For simplicity, we'll ignore such lines for now unless it's explanation.
         if(processingStage === 'options') {
            // console.warn(`Ignoring unexpected line during options processing: "${line}"`);
         }

      } else {
           // If we are here, it means we haven't found the start of the first question yet.
           // console.warn(`Ignoring line before first question: "${line}"`);
      }

    } catch(parseError) {
        console.error(`Error parsing line ${index + 1}: "${line}"`, parseError);
        // Reset current question to avoid pushing partial/invalid data
        currentQuestion = null;
    }
  });

  // Add the last processed question if it's valid
  if (currentQuestion && currentQuestion.question && currentQuestion.answers.length > 0 && currentQuestion.correctAnswer) {
    if (!currentQuestion.explanation) currentQuestion.explanation = `The correct answer is ${currentQuestion.correctAnswer.toUpperCase()}.`;
    questions.push(currentQuestion);
  }

  console.log(`Successfully parsed ${questions.length} questions from AI response.`);
  // Add validation/cleanup if needed
  return questions;
}


// Helper to get content for Exam Generation (modified slightly)
async function getExamContent(examId) {
  console.log(`Workspaceing content context for examId: ${examId}`);
  let content = '';

  try {
    // 1. Check if the Exam document itself has content or associated module IDs
    const examDocRef = db.collection('exams').doc(examId);
    const examDoc = await examDocRef.get();
    let associatedModuleIds = [];

    if (examDoc.exists) {
        const examData = examDoc.data();
        if (examData.content && typeof examData.content === 'string') {
             // If exam has direct content (less common, maybe keywords?), use it
             content += examData.content + ' ';
        }
        if (examData.associatedModules && Array.isArray(examData.associatedModules)) {
            associatedModuleIds = examData.associatedModules;
        }
        // Potentially add exam description too
        if(examData.description) content += examData.description + ' ';

    } else {
        console.warn(`Exam document ${examId} not found when fetching content.`);
        // Depending on requirements, either throw an error or proceed with broad content
        // throw new AppError('Exam definition not found', 404, 'EXAM_DEF_NOT_FOUND');
    }

    // 2. Fetch content from associated modules (if any)
    if (associatedModuleIds.length > 0) {
        console.log(`Workspaceing content from associated modules: ${associatedModuleIds.join(', ')}`);
        const modulePromises = associatedModuleIds.map(modId => db.collection('modules').doc(modId).get());
        const moduleDocs = await Promise.all(modulePromises);

        const sectionPromises = [];
        moduleDocs.forEach(modDoc => {
            if (modDoc.exists) {
                const modData = modDoc.data();
                content += (modData.title || '') + ' ' + (modData.description || '') + ' ';
                // Queue fetching sections for this module
                sectionPromises.push(db.collection('modules').doc(modDoc.id).collection('sections').get());
            } else {
                 console.warn(`Associated module ${modDoc.id} not found.`);
            }
        });

        const allSections = await Promise.all(sectionPromises);
        allSections.forEach(sectionsSnapshot => {
            sectionsSnapshot.forEach(sectionDoc => {
                content += (sectionDoc.data().content || '') + ' ';
            });
        });
    }

    // 3. Fallback: If no specific content found yet, use generic content from *all* modules
    if (content.trim() === '') {
        console.warn(`No exam-specific or associated module content found for examId: ${examId}. Falling back to ALL module content.`);
        const modulesSnapshot = await db.collection('modules').get();
        if (!modulesSnapshot.empty) {
            const sectionPromises = [];
            modulesSnapshot.forEach(doc => {
                content += (doc.data().title || '') + ' ' + (doc.data().description || '') + ' ';
                sectionPromises.push(db.collection('modules').doc(doc.id).collection('sections').get());
            });
            const allSections = await Promise.all(sectionPromises);
            allSections.forEach(sections => {
                sections.forEach(section => {
                    content += (section.data().content || '') + ' ';
                });
            });
        }
    }

    // 4. Final fallback if still no content
     if (content.trim() === '') {
        console.warn('No content found for exam generation. Using default placeholder.');
        content = 'General knowledge related to the expected exam topic.';
     }

     // Clean up excessive whitespace
     content = content.replace(/\s+/g, ' ').trim();
     console.log(`Final content context length for exam ${examId}: ${content.length} characters`);

  } catch(error) {
       console.error(`Error fetching content for exam ${examId}:`, error);
       // Return a default or rethrow, depending on desired behavior
       content = 'Error retrieving exam content context.';
       // Or: throw new AppError('Failed to retrieve content for exam generation', 500, 'EXAM_CONTENT_FETCH_FAILED');
  }

  return content;
}


module.exports = {
    parseQuizFromAIResponse,
    getExamContent
};