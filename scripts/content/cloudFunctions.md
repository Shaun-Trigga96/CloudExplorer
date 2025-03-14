# Cloud Functions Overview

## Introduction to Cloud Functions

![icon:cloud_functions]

Google Cloud Functions is a serverless compute platform that allows you to run event-driven code without managing servers. It automatically scales, handles infrastructure, and integrates with other GCP services.

- **Key Features**:
  - **Event-Driven**: Triggered by events like HTTP requests, Pub/Sub messages, or Cloud Storage changes.
  - **Zero Server Management**: No need to provision or maintain VMs.
  - **Autoscaling**: Scales from zero to thousands of instances based on load.
  - **Pay-Per-Use**: Charged only for execution time and invocations.

- **Use Cases**:
  - Processing uploaded files (e.g., resizing images).
  - Handling webhooks or API requests.
  - Automating workflows with Pub/Sub or Cloud Scheduler.

## Supported Runtimes

- Node.js, Python, Go, Java, .NET Core, Ruby, and PHP.
- Example: Write a Python function to process a Cloud Storage event.

## Key Concepts

- **Triggers**:
  - **HTTP**: Invoke via a URL (e.g., `https://us-central1-myproject.cloudfunctions.net/myfunc`).
  - **Event**: Respond to GCP service events (e.g., file upload to Cloud Storage).
  - **Pub/Sub**: Trigger on message publication.

- **Execution Environment**:
  - Functions run in isolated containers with limited CPU/memory.
  - Stateless: No persistent state between invocations (use Firestore or Storage for persistence).

- **Deployment**:
  - Deploy via Console, CLI, or CI/CD pipelines.
  - Example: `gcloud functions deploy myfunc --runtime python39 --trigger-http`.

## Getting Started

1. **Write a Function**:
   - Example (Python, HTTP trigger):

     ```python
     def hello_world(request):
         return "Hello, Cloud Functions!"
     ```

## Deploying Functions

### HTTP-Triggered Function

- **Command:** Use the `gcloud` CLI to deploy a function.
- **Example:** Deploy a function named `hello_world` that's triggered by HTTP requests.

    ```bash
    gcloud functions deploy hello_world --runtime python39 --trigger-http --allow-unauthenticated
    ```

  - `gcloud functions deploy`: The command to deploy a function.
  - `hello_world`: The name of the function you are deploying.
  - `--runtime python39`: Specifies that the function will run in a Python 3.9 environment.
  - `--trigger-http`: Configures the function to be invoked via HTTP requests.
  - `--allow-unauthenticated`: Allows the function to be accessed without authentication.

## Testing Functions

### Invoking via cURL

- **Command:** Use `curl` to send an HTTP request to the function's URL.
- **Example:**

    ```bash
    curl <function-url>
    ```

  - Replace `<function-url>` with the actual URL of your deployed function. You can find this in the output of the `gcloud functions deploy` command or in the Google Cloud Console.

## Event-Driven Functions

### Cloud Storage Trigger

- **Scenario:** A function that automatically processes a file uploaded to a Cloud Storage bucket.
- **Code Example (Python):**

    ```python
    def process_file(event, context):
        file_name = event['name']
        bucket = event['bucket']
        print(f"New file uploaded: gs://{bucket}/{file_name}")
    ```

  - `event`: Contains data about the triggering event (e.g., file name, bucket name).
  - `context`: Contains metadata about the execution of the function.
  - The provided code gets the name of the file and the bucket it was uploaded to.
  - The output is the path of the file.
- **Deployment:**

    ```bash
    gcloud functions deploy process_file --runtime python39 --trigger-bucket my-bucket
    ```

  - `process_file`: The name of the function to be deployed.
  - `--trigger-bucket my-bucket`: Specifies that the function should be triggered by events in the `my-bucket` Cloud Storage bucket.

## Advanced Features

### Environment Variables

- **Purpose:** Inject configuration values into your functions.
- **Example:** Set environment variables during deployment.

    ```bash
    gcloud functions deploy myfunc --set-env-vars KEY=VALUE
    ```

  - `myfunc`: The name of your function.
  - `KEY=VALUE`: Replace `KEY` with the environment variable name and `VALUE` with its value.

### Background Functions

- **Use Case:** Handle tasks that take longer than HTTP request timeouts.
- **Triggers:** Use Pub/Sub or Firestore triggers to start these long-running operations.

### VPC Connector

- **Purpose:** Allow functions to access resources within a private Virtual Private Cloud (VPC).

## Best Practices

- **Function Size:** Keep functions small, focused, and single-purpose.
- **Error Handling:** Implement robust error handling, including retries for event triggers.
- **Debugging:** Use Cloud Logging to monitor function execution and debug issues. `print()` statements are logged by default.
- **Resource management**: Limit the amount of resources a function can take.

## Further Reading

- [Google Cloud Functions Documentation](https://cloud.google.com/functions/docs)
