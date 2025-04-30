# Base image for Android builds
FROM openjdk:25-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    wget \
    git \
    nodejs \
    npm

# Install Android SDK
ENV ANDROID_HOME /opt/android-sdk
RUN mkdir -p ${ANDROID_HOME}
RUN wget https://dl.google.com/android/repository/commandlinetools-linux-8512546_latest.zip -O /tmp/commandlinetools.zip && \
    unzip /tmp/commandlinetools.zip -d ${ANDROID_HOME} && \
    rm /tmp/commandlinetools.zip

# Set PATH for Android tools
ENV PATH ${PATH}:${ANDROID_HOME}/cmdline-tools/bin:${ANDROID_HOME}/platform-tools

# Accept licenses and install necessary SDK components
RUN yes | sdkmanager --licenses
RUN sdkmanager "platform-tools" "platforms;android-31" "build-tools;31.0.0"

# Install React Native CLI
RUN npm install -g react-native-cli

# Set working directory
WORKDIR /app

# The container should execute Gradle commands
ENTRYPOINT ["bash"]