# Cloud Explorer

![Alt](assets/CloudExplorer.png)

## Introduction

Cloud Explorer is a mobile application built using React Native designed to help users learn Google Cloud Platform (GCP) concepts through visually appealing informatics, engaging quizzes, and exams at the end of each certification journey.

## System Architecture

### Application Architecture

- **Frontend**: React Native for building cross-platform mobile applications (iOS and Android).
- **Backend**: Node.js with Express.js for handling API requests.
- **State Management**: Redux for managing application state.
- **Navigation**: React Navigation for handling navigation within the app.
- **Authentication**: Firebase Authentication for user login and registration.

![Alt](assets/CloudExplocer-App-Architecture.svg)

### Cloud Architecture

- **Compute**: Google Compute Engine for running backend services.
- **Storage**: Google Cloud Storage for storing user data and application assets.
- **Database**: Google Firestore for real-time database and data synchronization.
- **Authentication**: Firebase Authentication for secure user authentication.
- **CI/CD**: Google Cloud Build for continuous integration and deployment.
- **Hosting**: Google Cloud Run for deploying and managing containerized applications.

![Alt](assets/CloudExplorer-Cloud-Architecture.svg)

The cloud architecture for the Cloud Explorer application offers several advantages:

1. **Scalability**:
   - **Google Compute Engine** allows the backend services to scale up or down based on demand, ensuring the application can handle varying loads efficiently.
   - **Google Cloud Run** enables automatic scaling of containerized applications, making it easier to manage resources and costs.

2. **Performance**:
   - **Google Firestore** provides real-time data synchronization, ensuring that users have access to the most up-to-date information quickly.
   - **Google Cloud Storage** offers high-performance storage for user data and application assets, ensuring fast access and retrieval times.

3. **Security**:
   - **Firebase Authentication** provides secure user authentication, protecting user data and ensuring only authorized access to the application.
   - Google Cloud services come with built-in security features, such as encryption and identity management, to safeguard data and applications.

4. **Reliability**:
   - Google Cloud Platform (GCP) offers high availability and reliability, ensuring that the application remains accessible and operational even during failures or maintenance.
   - **Google Cloud Build** ensures a reliable CI/CD pipeline, allowing for continuous integration and deployment with minimal downtime.

5. **Ease of Development and Maintenance**:
   - Using managed services like **Google Cloud Run** and **Google Firestore** reduces the operational burden on developers, allowing them to focus on building and improving the application rather than managing infrastructure.
   - **Google Cloud Build** automates the build and deployment process, making it easier to maintain and update the application.

6. **Cost Efficiency**:
   - Pay-as-you-go pricing models for GCP services help manage costs effectively, ensuring that you only pay for the resources you use.
   - Automatic scaling features help optimize resource usage, reducing unnecessary expenses.

7. **Integration with AI and Machine Learning**:
   - The architecture supports integration with AI frameworks and tools like TensorFlow, Hugging Face Transformers, and OpenAI GPT-3, enabling advanced features such as interactive informatics, quizzes, and exams.

Overall, this architecture leverages the strengths of Google Cloud Platform to provide a scalable, secure, and efficient solution for the Cloud Explorer application. If you have any specific questions or need further details, feel free to ask!

## Functional Requirements

1. **User Authentication**: Users should be able to register, log in, and log out.
2. **Dashboard**: Display an overview of the user's cloud resources and learning progress.
3. **Learning Modules**: Provide interactive learning modules for various GCP concepts.
4. **Quizzes**: Include quizzes to test users' understanding of the concepts.
5. **Exams**: Offer exams at the end of each certification journey.
6. **Progress Tracking**: Track and display users' progress through the learning modules.
7. **Notifications**: Send notifications about quiz and exam results, and learning milestones.
8. **Settings**: Allow users to configure app settings and preferences.

## Non-Functional Requirements

1. **Performance**: The app should load quickly and handle a large number of users efficiently.
2. **Scalability**: The backend should be able to scale to handle increasing user load.
3. **Security**: User data should be securely stored and transmitted.
4. **Usability**: The app should have an intuitive and user-friendly interface.
5. **Reliability**: The app should be highly available and handle failures gracefully.

## AI Integration

To develop the interactive informatics, quizzes, and exams, the following AI frameworks and tools will be used:

### AI Frameworks and Tools

1. **TensorFlow**: For various AI tasks, including natural language processing (NLP) and data analysis.
2. **Hugging Face Transformers**: For state-of-the-art NLP models to generate questions and analyze text data.
3. **OpenAI GPT-3**: For generating human-like text, creating quizzes, and providing explanations.

### Data Ingestion and Processing

1. **Data Ingestion**:
   - Use Google Cloud Storage to store raw data (e.g., text, images, videos).
   - Use Google Firestore to store structured data (e.g., user profiles, quiz questions, results).

2. **AI Model Integration**:
   - Use TensorFlow or Hugging Face Transformers to preprocess and analyze the data.
   - Use OpenAI GPT-3 to generate quiz questions, explanations, and interactive content.

## CI/CD Pipeline

1. **Version Control**: Use Git for version control and GitHub for repository hosting.
2. **Continuous Integration**:
   - **Trigger**: Set up a trigger in Google Cloud Build to start the pipeline on code push to the main branch.
   - **Build**: Dockerize the React Native app and backend services.
   - **Test**: Run unit tests and integration tests.
3. **Continuous Deployment**:
   - **Push to Container Registry**: Push the Docker images to Google Container Registry.
   - **Deploy to Cloud Run**: Deploy the containerized application to Google Cloud Run.
   - **Notifications**: Send notifications on build and deployment status via Google Chat or Slack.

## Screenshots

### Register/Login Screen

![Alt](screenshots/Register-Login.png)

### Welcome Page

![Alt](screenshots/Home.png)


## Getting Started

### Prerequisites

- Node.js and npm installed
- React Native CLI installed
- Google Cloud SDK installed and configured
- Firebase project set up

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/220296006/CloudExplorer
   cd cloud-explorer
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up Firebase:
   - Create a Firebase project and enable Authentication and Firestore.
   - Download the `google-services.json` file and place it in the `android/app` directory.
   - Download the `GoogleService-Info.plist` file and place it in the `ios` directory.

4. Start the development server:

   ```bash
   npx react-native start
   ```

5. Run the app on an emulator or physical device:

   ```bash
   npx react-native run-android
   npx react-native run-aios
   ```

## Contributing

Contributions are welcome! Please read the contributing guidelines for more information.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Feel free to customize this README.md file to better suit your project's needs. If you have any specific questions or need further assistance, let me know!