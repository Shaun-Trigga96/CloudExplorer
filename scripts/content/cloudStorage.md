# Cloud Storage Overview

## **Introduction to Cloud Storage**

![icon:cloud_storage]

Google Cloud Storage (GCS) is a fully managed, scalable object storage service designed for storing unstructured data such as images, videos, backups, and application assets. It provides high durability, availability, and global accessibility.

- **Key Features**:
  - **Unlimited Storage**: No fixed capacity limits; scale as needed.
  - **Durability**: 99.999999999% (11 9s) annual durability with automatic replication.
  - **Storage Classes**: Options for cost vs. access frequency (e.g., Standard, Nearline, Coldline, Archive).
  - **Global Access**: Serve data from a single namespace worldwide via HTTP/HTTPS.
  - **Versioning**: Keep multiple versions of objects for recovery or auditing.

- **Use Cases**:
  - Storing media files (e.g., photos, videos) for web or mobile apps.
  - Archiving data for compliance or disaster recovery.
  - Hosting static websites or distributing software.

## **Storage Classes**

- **Standard**: High-performance storage for frequently accessed data (e.g., website assets).
- **Nearline**: Low-cost storage for data accessed less than once a month (e.g., backups).
- **Coldline**: Very low-cost storage for data accessed less than once a year (e.g., long-term archives).
- **Archive**: Cheapest option for data retained for years (e.g., regulatory compliance).

- **Key Differences**:
  - Access cost increases as retrieval frequency decreases.
  - Minimum storage duration applies (e.g., 30 days for Nearline, 365 days for Archive).

## **Key Concepts**

- **Buckets**:
  - Containers for objects, similar to folders but flat (no true hierarchy).
  - Globally unique names (e.g., `my-app-bucket`).
  - Configurable location (e.g., `us-central1` or multi-region `us`).

- **Objects**:
  - Individual files stored in buckets (e.g., `images/photo.jpg`).
  - Metadata like content type or custom tags can be attached.

- **Access Control**:
  - **IAM**: Role-based access at the project or bucket level (e.g., Storage Admin).
  - **ACLs**: Fine-grained permissions for individual objects or buckets.
  - **Signed URLs**: Temporary access links for private objects.

- **Lifecycle Management**:
  - Automate transitions between storage classes or deletion (e.g., move to Archive after 90 days).

## **Getting Started**

1. **Create a Bucket**:
   - Via Console: Navigate to Storage > Create Bucket.
   - Via CLI: `gsutil mb -l us-central1 gs://my-app-bucket`

2. **Upload an Object**:
   - Via Console: Drag and drop files in the bucket interface.
   - Via CLI: `gsutil cp myfile.txt gs://my-app-bucket`

3. **Download an Object**:
   - Via CLI: `gsutil cp gs://my-app-bucket/myfile.txt .`

4. **Set Lifecycle Rules**:
   - Example: Delete objects older than 365 days:

     ```json
     {
       "rule": [
         {
           "action": {
             "type": "Delete"
           },
           "condition": {
             "age": 365
           }
         }
       ]
     }
     ```

   - Apply: `gsutil lifecycle set lifecycle.json gs://my-app-bucket`

## **Practical Examples**

### **Static Website Hosting**

- Upload HTML/CSS files to a bucket.
- Set the bucket to public.
- Configure a main page (e.g., `index.html`).
- Access via `http://storage.googleapis.com/my-app-bucket/index.html`.

### **Backup Automation**

Use `gsutil` in a cron job to upload daily backups:

```bash
gsutil cp /data/backup.tar.gz gs://my-backup-bucket/$(date +%Y-%m-%d).tar.gz
```
