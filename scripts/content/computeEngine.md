# Compute Engine Overview

## Introduction to Compute Engine

![icon:compute_engine]:

Compute Engine is Google Cloud Platform's Infrastructure-as-a-Service (IaaS) offering, enabling users to create and manage virtual machines (VMs) in the cloud. It provides flexible, scalable, and high-performance computing resources that can be customized to meet specific workload requirements.

- **Key Features**:
  - **Customizable VMs**: Configure CPU, memory, and storage to match your application's needs.
  - **Global Load Balancing**: Distribute traffic across multiple regions for high availability and low latency.
  - **Autoscaling**: Automatically adjust the number of VMs based on demand, optimizing cost and performance.
  - **Preemptible VMs**: Cost-effective, short-lived instances for fault-tolerant or batch-processing tasks.
  - **Live Migration**: Move running VMs between hosts without downtime for maintenance or upgrades.
  - **Sustained Use Discounts**: Automatic discounts for long-running workloads.

- **Use Cases**:
  - Hosting web applications with dynamic scaling needs.
  - Running relational or NoSQL databases.
  - Performing batch processing, such as video rendering or data analysis.
  - Supporting machine learning workloads with GPU-enabled VMs.

## Virtual Machine Types

Compute Engine offers a range of VM types tailored to different workloads:

- **Predefined Machine Types**:
  - **General-purpose**:
    - **E2**: Cost-effective, shared-core or standard machines for lightweight workloads.
    - **N2**: Balanced CPU and memory for general-purpose applications (e.g., web servers).
    - **N1**: Legacy option with customizable CPU/memory ratios.
  - **Compute-optimized (C2)**: High-performance CPUs for compute-intensive tasks like gaming servers or scientific simulations.
  - **Memory-optimized (M2)**: Large memory configurations for in-memory databases (e.g., SAP HANA, Redis).

- **Custom Machine Types**:
  - Specify exact vCPUs and memory (e.g., 4 vCPUs, 16 GB RAM) for precise resource allocation, avoiding over-provisioning.

- **Preemptible VMs**:
  - Up to 80% cheaper than regular VMs but can be terminated with 30 seconds' notice.
  - Ideal for fault-tolerant tasks like batch jobs or distributed computing.

- **GPU-enabled VMs**:
  - Attach NVIDIA GPUs (e.g., Tesla T4, V100) for graphics rendering, AI/ML training, or simulations.

## Key Concepts

- **Zones and Regions**:
  - VMs are deployed in specific zones (e.g., `us-central1-a`) within regions (e.g., `us-central1`).
  - Use multi-zone deployments for redundancy and low-latency access.

- **Disks**:
  - **Persistent Disks**: Network-attached storage (HDD or SSD) for durability and snapshots.
  - **Local SSDs**: Physically attached, high-IOPS storage for temporary data (e.g., caches).
  - **Boot Disks**: Store the OS and are created with each VM.

- **Images**:
  - Use prebuilt images (e.g., Ubuntu 20.04, Windows Server 2019) or create custom images with tools like Packer.
  - Images can be shared across projects or made public.

- **Networking**:
  - Assign VMs to Virtual Private Cloud (VPC) networks with custom subnets and firewall rules.
  - Use external IPs for public access or internal IPs for private communication.

- **Instance Groups**:
  - Managed Instance Groups (MIGs) enable autoscaling and self-healing for groups of identical VMs.

## Getting Started

1. **Create a VM**:
   - Via GCP Console: Navigate to Compute Engine > VM Instances > Create Instance.
   - Via CLI: `gcloud compute instances create my-vm --zone=us-central1-a --machine-type=e2-standard-2`.
   - Configure machine type, disk size, and network settings.

2. **Connect to the VM**:
   - Linux: Use SSH (`gcloud compute ssh my-vm --zone=us-central1-a`).
   - Windows: Use RDP with a client like Remote Desktop.

3. **Deploy an Application**:
   - Example: Install Nginx on Ubuntu:

     ```bash
     sudo apt update && sudo apt install nginx -y
     sudo systemctl start nginx
     ```

   - Access via the VM’s external IP.

4. Manage VMs:

   - Stop, start, or delete VMs via Console, CLI, or API.
   - Use snapshots for backups or cloning.

## Advanced Features

**Autoscaling:**

- Create an Instance Template and Managed Instance Group (MIG).
- Define scaling policies based on CPU usage, load balancing capacity, or custom metrics.

**Load Balancing:**

- Use HTTP(S) Load Balancers to distribute traffic across multiple VMs.
- Example: gcloud compute target-pools create my-pool.

**Preemptible VM Example:**

- Launch: gcloud compute instances create my-preemptible-vm --preemptible.
- Handle termination gracefully in your application.

## Best Practices

- Use labels (e.g., env=prod) for resource organization.
- Enable auto-restart and live migration for high availability.
- Monitor VMs with Google Cloud Monitoring for performance insights.

For more details, visit: <https://cloud.google.com/compute/docs>
