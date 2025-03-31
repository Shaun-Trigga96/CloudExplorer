# Kubernetes Engine Overview

## **Introduction to Kubernetes Engine**

![icon:google_kubernetes_engine]

Google Kubernetes Engine (GKE) is a managed Kubernetes service for deploying, managing, and scaling containerized applications. It automates cluster management, upgrades, and scaling while leveraging Google's infrastructure expertise.

- **Key Features**:
  - **Managed Clusters**: Google handles master node management and upgrades.
  - **Autoscaling**: Scale pods and nodes based on demand.
  - **Auto-Repair**: Automatically repair failed nodes.
  - **Integrated Logging/Monitoring**: Use Cloud Logging and Monitoring for insights.

- **Use Cases**:
  - Running microservices with high availability.
  - Deploying machine learning models in containers.
  - Managing stateless or stateful applications.

## **Kubernetes Basics**

- **Cluster**: A set of nodes (VMs) running Kubernetes, including a control plane (master) and worker nodes.
- **Pod**: The smallest deployable unit, containing one or more containers.
- **Deployment**: Manages a set of pods with desired state (e.g., replicas, updates).
- **Service**: Exposes pods to network traffic (e.g., LoadBalancer, ClusterIP).
- **ConfigMap/Secret**: Manage configuration and sensitive data.

## **Key Concepts**

- **Nodes**:
  - Worker machines (VMs) running pods, managed by Compute Engine.
  - Configurable machine types (e.g., `e2-standard-4`).

- **Control Plane**:
  - Manages the cluster (API server, scheduler, controller manager).
  - Fully managed by GKE in Standard mode.

- **Workload Types**:
  - **Stateless**: e.g., web servers (easy to scale).
  - **Stateful**: e.g., databases (use StatefulSets with Persistent Volumes).

- **Networking**:
  - Pods get unique IPs within the cluster.
  - Use Services for load balancing or external access.

## **Getting Started**

1. **Create a Cluster**:
    - Via Console: GKE > Create Cluster.
    - Via CLI: `gcloud container clusters create my-cluster --zone us-central1-a`.

2. **Deploy an Application**:
    - Example (Nginx deployment):

        ```yaml
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: nginx-deployment
        spec:
          replicas: 3
          selector:
            matchLabels:
              app: nginx
          template:
            metadata:
              labels:
                app: nginx
            spec:
              containers:
              - name: nginx
                image: nginx:latest
                ports:
                 - containerPort: 80
        ```

    Apply:

    ```bash
    kubectl apply -f nginx-deployment.yaml
    ```

    Expose the Application:
    Create a LoadBalancer Service:

    ```yaml
    apiVersion: v1
    kind: Service
    metadata:
      name: nginx-service
    spec:
      selector:
        app: nginx
      ports:
        - port: 80
          targetPort: 80
      type: LoadBalancer
    ```

    Apply:

    ```bash
    kubectl apply -f nginx-service.yaml
    ```

    Access the App:
    Get external IP:

    ```bash
    kubectl get service nginx-service
    ```

## **Advanced Features**

## **Horizontal Pod Autoscaling (HPA)**

- Scale pods based on CPU/memory:

    ```bash
    kubectl autoscale deployment nginx-deployment --cpu-percent=50 --min=1 --max=10
    ```

## **Cluster Autoscaling**

- Automatically add/remove nodes based on resource needs.

## **GKE Autopilot**

- Fully managed mode with no node management required.

## **Best Practices**

- Use namespaces to organize resources (e.g., dev, prod).
- Define resource requests/limits for pods to prevent over-utilization.
- Enable GKE’s built-in security features (e.g., Workload Identity).

## **Further Reading**

- For more details, visit: <https://cloud.google.com/kubernetes-engine/docs>