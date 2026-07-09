# Design Document: Smart Campus Resource Management System

## Overview

The Smart Campus Resource Management System is a real-time booking platform optimized for rapid hackathon development (48-hour timeline) while maintaining production-ready architecture. The system provides multi-role resource management with conflict prevention, IoT integration, calendar sync, and comprehensive analytics.

### Design Goals

1. **Hackathon-Optimized**: Leverage managed services and proven frameworks to minimize setup time
2. **Real-Time**: WebSocket-based availability updates with sub-2-second latency
3. **Conflict-Free**: Optimistic locking with database-level constraints prevents double bookings
4. **Scalable Architecture**: Support 500 concurrent users with response times under 200ms
5. **Integration-Ready**: Mock-friendly architecture for IoT, calendar, and access control systems
6. **Production-Grade**: Complete observability, error handling, and data retention policies

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Backend Framework** | Node.js + Express | Fast prototyping, rich ecosystem, real-time support via Socket.io |
| **Database** | Self-hosted PostgreSQL 15+ | ACID compliance, optimistic locking, JSON support, FREE and open-source |
| **ORM** | Prisma | Type-safe queries, automatic migrations, hackathon-friendly |
| **Authentication** | Passport.js + OAuth2 | OIDC integration with local fallback, session management |
| **Real-Time** | Socket.io | WebSocket with HTTP long-polling fallback, room-based broadcasting |
| **Caching** | Self-hosted Redis | Session storage, availability caching, rate limiting, FREE and open-source |
| **Queue** | Bull (Redis-based) | Notification retries, async processing, DLQ support, FREE |
| **File Storage** | MinIO (self-hosted) | S3-compatible, 10MB limit enforcement, FREE and open-source |
| **Email** | Mailpit (dev) / Self-hosted SMTP | Development email testing / production delivery, FREE |
| **Monitoring** | Winston + GlitchTip | Structured logging + error tracking, FREE and open-source |
| **API Documentation** | Swagger/OpenAPI | Auto-generated from JSDoc annotations |
| **Deployment** | Docker Compose | Single-command local setup, self-hosted on free cloud tier |

## Architecture

### High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web UI<br/>React + Tailwind]
        MOBILE[Mobile Web<br/>Responsive Design]
    end
    
    subgraph "API Gateway Layer"
        NGINX[NGINX<br/>Reverse Proxy + SSL]
        RL[Rate Limiter<br/>100 req/min]
    end
    
    subgraph "Application Layer"
        API[Express API Server<br/>REST + WebSocket]
        AUTH[Auth Service<br/>Passport.js + OIDC]
        WS[WebSocket Server<br/>Socket.io]
    end
    
    subgraph "Business Logic Layer"
        BOOK[Booking Engine<br/>Conflict Detection]
        NOTIF[Notification Service<br/>Multi-channel + Retry]
        ANAL[Analytics Engine<br/>Utilization Tracking]
        INT[Integration Hub<br/>IoT + Calendar + Access]
    end
    
    subgraph "Data Layer"
        PG[(Self-Hosted PostgreSQL<br/>Primary Database)]
        REDIS[(Self-Hosted Redis<br/>Cache + Sessions)]
        QUEUE[Bull Queue<br/>Async Jobs]
    end
    
    subgraph "External Systems"
        OIDC[Campus SSO<br/>OIDC Provider]
        IOT[IoT Sensors<br/>MQTT/REST]
        CAL[Calendar APIs<br/>Google/Outlook]
        ACCESS[Access Control<br/>Badge System]
        EMAIL[Self-Hosted SMTP<br/>or Mailpit]
    end
    
    subgraph "Storage"
        MINIO[MinIO Self-Hosted<br/>S3-Compatible Storage]
    end
    
    WEB --> NGINX
    MOBILE --> NGINX
    NGINX --> RL
    RL --> API
    RL --> WS
    API --> AUTH
    API --> BOOK
    API --> NOTIF
    API --> ANAL
    API --> INT
    WS --> BOOK
    
    BOOK --> PG
    BOOK --> REDIS
    NOTIF --> QUEUE
    ANAL --> PG
    INT --> IOT
    INT --> CAL
    INT --> ACCESS
    
    AUTH --> OIDC
    AUTH --> REDIS
    NOTIF --> EMAIL
    API --> MINIO
    QUEUE --> EMAIL
    
    style WEB fill:#e1f5ff
    style MOBILE fill:#e1f5ff
    style API fill:#fff4e6
    style PG fill:#f3e5f5
    style REDIS fill:#ffebee
```

### Component Interaction Flow

```mermaid
sequenceDiagram
    participant U as User
    participant W as WebSocket
    participant A as API Server
    participant B as Booking Engine
    participant D as PostgreSQL
    participant R as Redis
    participant Q as Queue
    participant N as Notifier
    
    U->>A: POST /api/bookings (resource, time_slot)
    A->>R: Check cache: resource availability
    alt Cache Hit
        R-->>A: Return cached availability
    else Cache Miss
        A->>D: Query availability with version lock
        D-->>A: Return availability + version
        A->>R: Update cache (TTL: 60s)
    end
    
    A->>B: Validate booking request
    B->>D: BEGIN TRANSACTION
    B->>D: SELECT * FROM bookings WHERE resource_id = ? AND time_slot OVERLAPS ? FOR UPDATE
    D-->>B: Check for conflicts
    
    alt No Conflict
        B->>D: INSERT booking WITH version = 1
        B->>D: COMMIT
        D-->>B: Booking created
        B->>R: Invalidate availability cache
        B->>W: Broadcast availability update to room
        B->>Q: Enqueue confirmation notification
        B-->>A: Success response
        A-->>U: 201 Created + booking details
        Q->>N: Process notification job
        N->>U: Send email/SMS confirmation
    else Conflict Detected
        B->>D: ROLLBACK
        B->>D: Query alternative slots
        D-->>B: Return alternatives
        B-->>A: 409 Conflict + alternatives
        A-->>U: 409 Conflict + suggested times
    end
    
    W-->>U: Real-time availability update
```

## Technology Stack

### Backend Stack

**Runtime & Framework**
- **Node.js 20 LTS**: Latest stable runtime with native ESM support
- **Express 4.18+**: Mature web framework with extensive middleware ecosystem
- **TypeScript 5.3+**: Type safety for rapid development with fewer bugs

**Database & ORM**
- **Self-Hosted PostgreSQL 15+**: Production-grade RDBMS with JSONB, row-level locking, and partitioning (FREE, open-source)
- **Prisma 5.x**: Type-safe ORM with schema migrations and introspection
- **pg**: Native PostgreSQL driver for raw query optimization

**Authentication & Security**
- **Passport.js**: Flexible authentication middleware
- **passport-openidconnect**: OIDC strategy for campus SSO
- **passport-local**: Fallback local authentication for admins
- **bcrypt**: Password hashing (for local accounts)
- **jsonwebtoken**: JWT token generation and validation
- **helmet**: Security headers middleware
- **express-rate-limit**: API rate limiting (100 req/min)

**Real-Time Communication**
- **Socket.io 4.x**: WebSocket server with automatic fallback
- **socket.io-redis**: Redis adapter for horizontal scaling

**Caching & Queuing**
- **Self-Hosted Redis 7+**: In-memory cache and session store (FREE, open-source)
- **ioredis**: Feature-rich Redis client with cluster support
- **Bull**: Redis-backed queue for async jobs and notifications (FREE)

**File Handling**
- **multer**: Multipart form-data parser for file uploads
- **sharp**: Image resizing and format conversion
- **MinIO SDK**: S3-compatible object storage client (FREE, open-source, self-hosted)

**API & Documentation**
- **swagger-jsdoc**: Generate OpenAPI spec from JSDoc
- **swagger-ui-express**: Interactive API documentation UI
- **express-validator**: Request validation middleware

**Testing**
- **Jest**: Test framework and runner
- **Supertest**: HTTP assertion library
- **@faker-js/faker**: Test data generation

### Frontend Stack

**Framework & Libraries**
- **React 18**: UI framework with concurrent rendering
- **React Router 6**: Client-side routing
- **TanStack Query (React Query)**: Server state management and caching
- **Zustand**: Lightweight client state management
- **Socket.io-client**: WebSocket client

**UI & Styling**
- **Tailwind CSS 3**: Utility-first CSS framework
- **Headless UI**: Unstyled accessible components
- **Heroicons**: SVG icon library
- **React Hot Toast**: Notification toasts

**Forms & Validation**
- **React Hook Form**: Performant form state management
- **Zod**: TypeScript-first schema validation

**Date & Time**
- **date-fns**: Modern date utility library
- **date-fns-tz**: Timezone handling (UTC ↔ IST conversion)
- **react-big-calendar**: Calendar component for availability view

**Build Tools**
- **Vite**: Fast build tool with HMR
- **TypeScript**: Type checking
- **ESLint + Prettier**: Code quality and formatting

### Infrastructure & DevOps

**Containerization**
- **Docker 24+**: Container runtime
- **Docker Compose**: Multi-container orchestration for local dev

**Cloud Services (Production Deployment)**
- **Self-Hosted PostgreSQL**: Deploy on free tier cloud (Oracle Cloud Always Free, AWS Free Tier, Railway, Render) or on-premises server
- **Self-Hosted Redis**: Deploy alongside PostgreSQL on free tier infrastructure
- **MinIO Self-Hosted**: S3-compatible object storage, deploy on same infrastructure or separate free tier instance
- **Self-Hosted SMTP / Mailpit**: For email delivery, use configured SMTP server or Mailpit for development
- **Docker Compose / Kubernetes**: Container orchestration for multi-service deployment
- **Free Cloud Hosting Options**: Oracle Cloud Always Free (ARM instances), Railway free tier, Render free tier, Fly.io free tier

**Monitoring & Logging**
- **Winston**: Structured logging library (FREE, open-source)
- **morgan**: HTTP request logger (FREE, open-source)
- **GlitchTip**: Self-hosted error tracking and performance monitoring (FREE, open-source, Sentry-compatible)
- **Prometheus + Grafana**: Metrics collection and visualization (FREE, open-source)

### Development Tools

- **Nodemon**: Auto-restart on file changes
- **Postman / Thunder Client**: API testing
- **Prisma Studio**: Database GUI
- **Redis Commander**: Redis visualization
- **pgAdmin**: PostgreSQL management

## Data Models

### Database Schema

```mermaid
erDiagram
    users ||--o{ bookings : creates
    users ||--o{ waitlist_entries : joins
    users ||--o{ audit_logs : generates
    users {
        uuid id PK
        string email UK
        string name
        enum role "Student,Faculty,Admin,Facility_Manager"
        string sso_provider "oidc,local"
        string sso_id UK
        timestamp last_login
        jsonb preferences
        int version "optimistic lock"
        timestamp created_at
        timestamp updated_at
    }
    
    resources ||--o{ bookings : booked_for
    resources ||--o{ resource_images : has
    resources ||--o{ iot_sensors : monitors
    resources ||--o{ maintenance_schedules : scheduled_for
    resources {
        uuid id PK
        string name
        enum type "Classroom,Lab,Equipment,Meeting_Room,Sports_Facility"
        int capacity
        string location
        jsonb amenities "['Projector','Whiteboard']"
        int buffer_minutes
        enum status "Available,Maintenance,Unavailable"
        uuid managed_by FK
        int version "optimistic lock"
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at "soft delete"
    }
    
    bookings ||--o{ booking_modifications : has_history
    bookings ||--o{ waitlist_entries : triggers
    bookings {
        uuid id PK
        uuid user_id FK
        uuid resource_id FK
        timestamp start_time
        timestamp end_time
        string purpose
        enum status "Confirmed,Completed,Cancelled,No_Show"
        enum recurrence_pattern "None,Daily,Weekly,Custom"
        uuid recurrence_group_id
        boolean is_late_cancellation
        string cancellation_reason
        timestamp cancelled_at
        int version "optimistic lock"
        timestamp created_at
        timestamp updated_at
    }
    
    waitlist_entries ||--|| users : user
    waitlist_entries ||--|| resources : resource
    waitlist_entries {
        uuid id PK
        uuid user_id FK
        uuid resource_id FK
        timestamp desired_start_time
        timestamp desired_end_time
        enum status "Pending,Notified,Confirmed,Declined,Expired"
        timestamp notified_at
        timestamp expires_at "15 min after notification"
        int position "queue order"
        timestamp created_at
    }
    
    equipment_checkouts ||--|| users : checked_out_by
    equipment_checkouts ||--|| resources : equipment
    equipment_checkouts {
        uuid id PK
        uuid equipment_id FK "references resources"
        uuid user_id FK
        uuid linked_booking_id FK "optional room booking"
        timestamp checkout_time
        timestamp expected_return_time
        timestamp actual_return_time
        string condition_at_checkout
        string condition_at_return
        boolean is_overdue
        timestamp created_at
    }
    
    iot_sensors ||--|| resources : monitors
    iot_sensors {
        uuid id PK
        uuid resource_id FK
        string sensor_type "occupancy,temperature,humidity,equipment_status"
        string mqtt_topic
        jsonb last_reading
        timestamp last_communication
        boolean is_online
        timestamp created_at
        timestamp updated_at
    }
    
    iot_readings {
        uuid id PK
        uuid sensor_id FK
        jsonb data
        timestamp recorded_at
    }
    
    maintenance_schedules {
        uuid id PK
        uuid resource_id FK
        timestamp start_time
        timestamp end_time
        string reason
        string notes
        uuid created_by FK
        enum status "Scheduled,In_Progress,Completed,Cancelled"
        timestamp created_at
        timestamp updated_at
    }
    
    notifications {
        uuid id PK
        uuid user_id FK
        enum type "booking_confirmation,booking_reminder,booking_cancelled,waitlist_available,equipment_overdue,maintenance_alert"
        enum channel "email,sms,in_app"
        string recipient
        jsonb payload
        enum status "Pending,Sent,Failed,Dead_Letter"
        int retry_count
        timestamp sent_at
        timestamp created_at
    }
    
    audit_logs {
        uuid id PK
        uuid user_id FK
        string action "CREATE_BOOKING,CANCEL_BOOKING,UPDATE_RESOURCE,etc"
        string entity_type "Booking,Resource,User"
        uuid entity_id
        jsonb changes "before/after snapshot"
        string ip_address
        timestamp created_at
    }
    
    system_config {
        string key PK
        jsonb value
        string description
        timestamp updated_at
        uuid updated_by FK
    }
```

### Prisma Schema Definition


```prisma
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  Student
  Faculty
  Administrator
  Facility_Manager
}

enum SSOProvider {
  oidc
  local
}

enum ResourceType {
  Classroom
  Lab
  Equipment
  Meeting_Room
  Sports_Facility
}

enum ResourceStatus {
  Available
  Maintenance
  Unavailable
}

enum BookingStatus {
  Confirmed
  Completed
  Cancelled
  No_Show
}

enum RecurrencePattern {
  None
  Daily
  Weekly
  Custom
}

enum WaitlistStatus {
  Pending
  Notified
  Confirmed
  Declined
  Expired
}

enum NotificationType {
  booking_confirmation
  booking_reminder
  booking_cancelled
  booking_modified
  waitlist_available
  equipment_overdue
  maintenance_alert
  priority_displaced
}

enum NotificationChannel {
  email
  sms
  in_app
}

enum NotificationStatus {
  Pending
  Sent
  Failed
  Dead_Letter
}

model User {
  id              String    @id @default(uuid())
  email           String    @unique
  name            String
  role            UserRole
  ssoProvider     SSOProvider @map("sso_provider")
  ssoId           String?   @unique @map("sso_id")
  passwordHash    String?   @map("password_hash") // Only for local auth
  lastLogin       DateTime? @map("last_login")
  preferences     Json?     // Notification settings, timezone, etc.
  version         Int       @default(1) // Optimistic locking
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  bookings        Booking[]
  waitlistEntries WaitlistEntry[]
  checkouts       EquipmentCheckout[]
  managedResources Resource[] @relation("ManagedBy")
  auditLogs       AuditLog[]
  notifications   Notification[]
  
  @@map("users")
}

model Resource {
  id              String    @id @default(uuid())
  name            String
  type            ResourceType
  capacity        Int?
  location        String
  amenities       Json?     // Array of strings
  bufferMinutes   Int       @default(0) @map("buffer_minutes")
  status          ResourceStatus @default(Available)
  managedBy       String?   @map("managed_by")
  version         Int       @default(1)
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at") // Soft delete
  
  manager         User?     @relation("ManagedBy", fields: [managedBy], references: [id])
  bookings        Booking[]
  images          ResourceImage[]
  sensors         IoTSensor[]
  maintenance     MaintenanceSchedule[]
  waitlistEntries WaitlistEntry[]
  checkouts       EquipmentCheckout[]
  
  @@map("resources")
  @@index([type, status])
  @@index([deletedAt])
}

model ResourceImage {
  id          String   @id @default(uuid())
  resourceId  String   @map("resource_id")
  fileUrl     String   @map("file_url")
  fileType    String   @map("file_type") // image/png, image/jpeg, application/pdf
  fileSizeKb  Int      @map("file_size_kb")
  isFloorPlan Boolean  @default(false) @map("is_floor_plan")
  uploadedAt  DateTime @default(now()) @map("uploaded_at")
  
  resource    Resource @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  
  @@map("resource_images")
}

model Booking {
  id                  String    @id @default(uuid())
  userId              String    @map("user_id")
  resourceId          String    @map("resource_id")
  startTime           DateTime  @map("start_time")
  endTime             DateTime  @map("end_time")
  purpose             String
  status              BookingStatus @default(Confirmed)
  recurrencePattern   RecurrencePattern @default(None) @map("recurrence_pattern")
  recurrenceGroupId   String?   @map("recurrence_group_id")
  isLateCancellation  Boolean   @default(false) @map("is_late_cancellation")
  cancellationReason  String?   @map("cancellation_reason")
  cancelledAt         DateTime? @map("cancelled_at")
  version             Int       @default(1)
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")
  
  user                User      @relation(fields: [userId], references: [id])
  resource            Resource  @relation(fields: [resourceId], references: [id])
  modifications       BookingModification[]
  linkedCheckouts     EquipmentCheckout[]
  
  @@map("bookings")
  @@index([resourceId, startTime, endTime])
  @@index([userId, startTime])
  @@index([status])
}

model BookingModification {
  id          String   @id @default(uuid())
  bookingId   String   @map("booking_id")
  field       String   // "start_time", "end_time", "status", etc.
  oldValue    String   @map("old_value")
  newValue    String   @map("new_value")
  modifiedBy  String   @map("modified_by")
  modifiedAt  DateTime @default(now()) @map("modified_at")
  
  booking     Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  
  @@map("booking_modifications")
}

model WaitlistEntry {
  id                String    @id @default(uuid())
  userId            String    @map("user_id")
  resourceId        String    @map("resource_id")
  desiredStartTime  DateTime  @map("desired_start_time")
  desiredEndTime    DateTime  @map("desired_end_time")
  status            WaitlistStatus @default(Pending)
  notifiedAt        DateTime? @map("notified_at")
  expiresAt         DateTime? @map("expires_at") // 15 min after notifiedAt
  position          Int       // Queue position
  createdAt         DateTime  @default(now()) @map("created_at")
  
  user              User      @relation(fields: [userId], references: [id])
  resource          Resource  @relation(fields: [resourceId], references: [id])
  
  @@map("waitlist_entries")
  @@index([resourceId, status, position])
}

model EquipmentCheckout {
  id                    String    @id @default(uuid())
  equipmentId           String    @map("equipment_id")
  userId                String    @map("user_id")
  linkedBookingId       String?   @map("linked_booking_id")
  checkoutTime          DateTime  @map("checkout_time")
  expectedReturnTime    DateTime  @map("expected_return_time")
  actualReturnTime      DateTime? @map("actual_return_time")
  conditionAtCheckout   String?   @map("condition_at_checkout")
  conditionAtReturn     String?   @map("condition_at_return")
  isOverdue             Boolean   @default(false) @map("is_overdue")
  createdAt             DateTime  @default(now()) @map("created_at")
  
  equipment             Resource  @relation(fields: [equipmentId], references: [id])
  user                  User      @relation(fields: [userId], references: [id])
  linkedBooking         Booking?  @relation(fields: [linkedBookingId], references: [id])
  
  @@map("equipment_checkouts")
  @@index([userId, actualReturnTime])
}

model IoTSensor {
  id                  String    @id @default(uuid())
  resourceId          String    @map("resource_id")
  sensorType          String    @map("sensor_type") // occupancy, temperature, humidity, equipment_status
  mqttTopic           String?   @map("mqtt_topic")
  lastReading         Json?     @map("last_reading")
  lastCommunication   DateTime? @map("last_communication")
  isOnline            Boolean   @default(true) @map("is_online")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")
  
  resource            Resource  @relation(fields: [resourceId], references: [id])
  readings            IoTReading[]
  
  @@map("iot_sensors")
}

model IoTReading {
  id          String   @id @default(uuid())
  sensorId    String   @map("sensor_id")
  data        Json     // Flexible structure for different sensor types
  recordedAt  DateTime @default(now()) @map("recorded_at")
  
  sensor      IoTSensor @relation(fields: [sensorId], references: [id], onDelete: Cascade)
  
  @@map("iot_readings")
  @@index([sensorId, recordedAt])
}

model MaintenanceSchedule {
  id          String    @id @default(uuid())
  resourceId  String    @map("resource_id")
  startTime   DateTime  @map("start_time")
  endTime     DateTime  @map("end_time")
  reason      String
  notes       String?
  createdBy   String    @map("created_by")
  status      String    @default("Scheduled")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  resource    Resource  @relation(fields: [resourceId], references: [id])
  
  @@map("maintenance_schedules")
}

model Notification {
  id          String    @id @default(uuid())
  userId      String    @map("user_id")
  type        NotificationType
  channel     NotificationChannel
  recipient   String    // Email address or phone number
  payload     Json      // Flexible structure for notification content
  status      NotificationStatus @default(Pending)
  retryCount  Int       @default(0) @map("retry_count")
  sentAt      DateTime? @map("sent_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  
  user        User      @relation(fields: [userId], references: [id])
  
  @@map("notifications")
  @@index([status, createdAt])
}

model AuditLog {
  id          String   @id @default(uuid())
  userId      String?  @map("user_id")
  action      String   // CREATE_BOOKING, CANCEL_BOOKING, etc.
  entityType  String   @map("entity_type")
  entityId    String   @map("entity_id")
  changes     Json?    // Before/after snapshot
  ipAddress   String?  @map("ip_address")
  createdAt   DateTime @default(now()) @map("created_at")
  
  user        User?    @relation(fields: [userId], references: [id])
  
  @@map("audit_logs")
  @@index([entityType, entityId])
  @@index([userId, createdAt])
}

model SystemConfig {
  key         String   @id
  value       Json
  description String?
  updatedAt   DateTime @updatedAt @map("updated_at")
  updatedBy   String?  @map("updated_by")
  
  @@map("system_config")
}
```

### Key Schema Design Decisions



1. **UUID Primary Keys**: Better for distributed systems and prevents enumeration attacks
2. **Optimistic Locking**: `version` column prevents lost updates during concurrent modifications
3. **Soft Deletes**: `deletedAt` on resources preserves historical booking data
4. **JSON Columns**: Flexible storage for preferences, amenities, sensor data (hackathon-friendly)
5. **Indexed Queries**: Strategic indexes on frequently queried columns (resource availability, user bookings)
6. **Timezone Storage**: All timestamps in UTC (converted to IST in application layer)
7. **Audit Trail**: Append-only `audit_logs` table for compliance and debugging

### Index Strategy for Performance

```sql
-- Booking conflict detection (most critical query)
CREATE INDEX idx_bookings_conflict ON bookings(resource_id, start_time, end_time) 
  WHERE status IN ('Confirmed');

-- User dashboard queries
CREATE INDEX idx_bookings_user_upcoming ON bookings(user_id, start_time) 
  WHERE status = 'Confirmed' AND start_time > NOW();

-- Resource search and filtering
CREATE INDEX idx_resources_search ON resources(type, status, capacity) 
  WHERE deleted_at IS NULL;

-- Waitlist processing
CREATE INDEX idx_waitlist_processing ON waitlist_entries(resource_id, status, position) 
  WHERE status = 'Pending';

-- IoT data retention queries
CREATE INDEX idx_iot_readings_retention ON iot_readings(recorded_at) 
  WHERE recorded_at < NOW() - INTERVAL '90 days';

-- Audit log searches
CREATE INDEX idx_audit_logs_search ON audit_logs(entity_type, entity_id, created_at DESC);
```

## Components and Interfaces

### Core Components

#### 1. Authentication Service

**Responsibilities:**
- OIDC integration with campus SSO
- Local admin authentication fallback
- Session management with Redis
- Role-based access control (RBAC)

**Interface:**
```typescript
interface AuthService {
  // OIDC Authentication
  initiateOIDCLogin(): Promise<{ authUrl: string; state: string }>;
  handleOIDCCallback(code: string, state: string): Promise<AuthResult>;
  
  // Local Authentication
  authenticateLocal(email: string, password: string): Promise<AuthResult>;
  
  // Session Management
  createSession(userId: string): Promise<SessionToken>;
  validateSession(token: string): Promise<Session>;
  refreshSession(refreshToken: string): Promise<SessionToken>;
  revokeSession(token: string): Promise<void>;
  
  // Authorization
  hasPermission(userId: string, resource: string, action: string): Promise<boolean>;
  enforceRole(allowedRoles: UserRole[]): Middleware;
}

interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface SessionToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

interface Session {
  userId: string;
  role: UserRole;
  expiresAt: Date;
}
```

**OIDC Flow:**
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as Auth Service
    participant O as OIDC Provider
    participant D as Database
    participant R as Redis
    
    U->>F: Click "Login with SSO"
    F->>A: GET /auth/oidc/login
    A->>A: Generate state & nonce
    A->>R: Store state (TTL: 10min)
    A-->>F: Redirect to OIDC authorize URL
    F->>O: Authorization request
    O-->>U: Show login page
    U->>O: Enter credentials
    O->>O: Authenticate user
    O-->>F: Redirect with authorization code
    F->>A: GET /auth/oidc/callback?code=XXX&state=YYY
    A->>R: Verify state
    A->>O: POST /token (exchange code)
    O-->>A: Access token + ID token
    A->>O: GET /userinfo
    O-->>A: User profile
    A->>D: Find or create user by sso_id
    A->>A: Assign role based on OIDC claims
    A->>R: Create session (TTL: 8h)
    A-->>F: Set session cookie + JWT
    F-->>U: Redirect to dashboard
```

**Fallback Mechanism:**
If OIDC provider is unavailable:
1. Health check detects SSO failure
2. Display "Login with Admin Account" option
3. Local authentication validates against `users` table where `ssoProvider = 'local'`
4. Audit log records fallback authentication event

#### 2. Booking Engine

**Responsibilities:**
- Conflict detection and prevention
- Optimistic locking for concurrent bookings
- Recurrence pattern generation
- Buffer time enforcement
- Priority-based booking (Faculty > Student)

**Interface:**
```typescript
interface BookingEngine {
  // Booking Creation
  createBooking(request: BookingRequest): Promise<BookingResult>;
  createRecurringBooking(request: RecurringBookingRequest): Promise<RecurringBookingResult>;
  
  // Conflict Detection
  checkAvailability(resourceId: string, timeSlot: TimeSlot): Promise<AvailabilityResult>;
  findAlternatives(resourceId: string, timeSlot: TimeSlot, count: number): Promise<TimeSlot[]>;
  
  // Booking Modification
  updateBooking(bookingId: string, updates: BookingUpdate, version: number): Promise<BookingResult>;
  cancelBooking(bookingId: string, reason: string): Promise<void>;
  
  // Priority Handling
  handlePriorityConflict(facultyBooking: BookingRequest, conflictingBooking: Booking): Promise<void>;
}

interface BookingRequest {
  userId: string;
  resourceId: string;
  startTime: Date;
  endTime: Date;
  purpose: string;
}

interface RecurringBookingRequest extends BookingRequest {
  pattern: RecurrencePattern;
  endDate: Date;
  customDays?: number[]; // [0=Sun, 1=Mon, ...]
}

interface TimeSlot {
  startTime: Date;
  endTime: Date;
}

interface AvailabilityResult {
  available: boolean;
  conflicts: Booking[];
  nextAvailable?: TimeSlot;
}

interface BookingResult {
  success: boolean;
  booking?: Booking;
  error?: {
    code: string;
    message: string;
    conflicts?: Booking[];
    alternatives?: TimeSlot[];
  };
}

interface RecurringBookingResult {
  success: boolean;
  created: Booking[];
  skipped: { date: Date; reason: string }[];
}
```

**Conflict Detection Algorithm:**

```typescript
async function checkConflict(
  resourceId: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string
): Promise<Booking[]> {
  // Get resource buffer time
  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    select: { bufferMinutes: true }
  });
  
  const bufferMs = (resource?.bufferMinutes || 0) * 60 * 1000;
  const effectiveStart = new Date(startTime.getTime() - bufferMs);
  const effectiveEnd = new Date(endTime.getTime() + bufferMs);
  
  // PostgreSQL range overlap query with row-level lock
  const conflicts = await db.$queryRaw`
    SELECT * FROM bookings
    WHERE resource_id = ${resourceId}
      AND status = 'Confirmed'
      AND tsrange(start_time, end_time) && tsrange(${effectiveStart}, ${effectiveEnd})
      ${excludeBookingId ? sql`AND id != ${excludeBookingId}` : sql``}
    FOR UPDATE;
  `;
  
  return conflicts;
}
```

**Optimistic Locking Implementation:**

```typescript
async function createBookingWithOptimisticLock(request: BookingRequest): Promise<BookingResult> {
  return await db.$transaction(async (tx) => {
    // 1. Lock resource and check version
    const resource = await tx.resource.findUnique({
      where: { id: request.resourceId },
      select: { id: true, version: true, status: true }
    });
    
    if (!resource) {
      throw new Error('Resource not found');
    }
    
    if (resource.status !== 'Available') {
      return {
        success: false,
        error: { code: 'RESOURCE_UNAVAILABLE', message: 'Resource is not available' }
      };
    }
    
    // 2. Check for conflicts with row-level lock
    const conflicts = await checkConflict(
      request.resourceId,
      request.startTime,
      request.endTime
    );
    
    if (conflicts.length > 0) {
      return {
        success: false,
        error: {
          code: 'BOOKING_CONFLICT',
          message: 'Time slot is already booked',
          conflicts,
          alternatives: await findAlternatives(request.resourceId, {
            startTime: request.startTime,
            endTime: request.endTime
          }, 3)
        }
      };
    }
    
    // 3. Create booking
    const booking = await tx.booking.create({
      data: {
        userId: request.userId,
        resourceId: request.resourceId,
        startTime: request.startTime,
        endTime: request.endTime,
        purpose: request.purpose,
        status: 'Confirmed',
        version: 1
      }
    });
    
    // 4. Increment resource version (optimistic lock)
    await tx.resource.update({
      where: { 
        id: request.resourceId,
        version: resource.version // This will fail if version changed
      },
      data: { version: { increment: 1 } }
    });
    
    return { success: true, booking };
  }, {
    isolationLevel: 'Serializable', // Highest isolation for critical section
    timeout: 5000 // 5 second timeout
  });
}
```

#### 3. Availability Service

**Responsibilities:**
- Real-time availability calculation
- Cache management for frequently accessed resources
- WebSocket broadcasting for live updates

**Interface:**
```typescript
interface AvailabilityService {
  // Query Availability
  getResourceAvailability(resourceId: string, dateRange: DateRange): Promise<AvailabilityCalendar>;
  getMultipleResourceAvailability(resourceIds: string[], date: Date): Promise<Map<string, TimeSlot[]>>;
  
  // Cache Management
  invalidateAvailabilityCache(resourceId: string): Promise<void>;
  warmCache(resourceIds: string[]): Promise<void>;
  
  // Real-Time Updates
  subscribeToAvailabilityUpdates(resourceId: string, socketId: string): void;
  broadcastAvailabilityChange(resourceId: string, change: AvailabilityChange): void;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface AvailabilityCalendar {
  resourceId: string;
  availableSlots: TimeSlot[];
  bookedSlots: BookedSlot[];
  maintenanceSlots: TimeSlot[];
}

interface BookedSlot extends TimeSlot {
  bookingId: string;
  userId: string;
  purpose: string;
}

interface AvailabilityChange {
  resourceId: string;
  action: 'booked' | 'cancelled' | 'modified';
  affectedSlots: TimeSlot[];
  timestamp: Date;
}
```

**Caching Strategy:**

```typescript
// Redis cache key structure
const CACHE_KEYS = {
  availability: (resourceId: string, date: string) => `availability:${resourceId}:${date}`,
  resourceList: (filters: string) => `resources:list:${filters}`,
  userBookings: (userId: string) => `bookings:user:${userId}`
};

const CACHE_TTL = {
  availability: 60, // 60 seconds
  resourceList: 300, // 5 minutes
  userBookings: 120 // 2 minutes
};

async function getAvailabilityWithCache(
  resourceId: string,
  date: Date
): Promise<AvailabilityCalendar> {
  const cacheKey = CACHE_KEYS.availability(resourceId, date.toISOString().split('T')[0]);
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Cache miss - query database
  const availability = await calculateAvailability(resourceId, date);
  
  // Store in cache
  await redis.setex(cacheKey, CACHE_TTL.availability, JSON.stringify(availability));
  
  return availability;
}
```



#### 4. Notification Service

**Responsibilities:**
- Multi-channel delivery (email, SMS, in-app)
- Retry logic with exponential backoff
- Dead letter queue for failed deliveries
- Template rendering

**Interface:**
```typescript
interface NotificationService {
  // Send Notifications
  sendNotification(notification: NotificationRequest): Promise<void>;
  sendBulkNotifications(notifications: NotificationRequest[]): Promise<BulkResult>;
  
  // Queue Management
  enqueueNotification(notification: NotificationRequest, priority?: number): Promise<string>;
  retryFailedNotification(notificationId: string): Promise<void>;
  moveToDeadLetterQueue(notificationId: string): Promise<void>;
  
  // Template Management
  renderTemplate(templateId: string, data: Record<string, any>): Promise<string>;
}

interface NotificationRequest {
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  data: Record<string, any>;
  scheduledFor?: Date;
}

interface BulkResult {
  successful: number;
  failed: number;
  errors: { notificationId: string; error: string }[];
}
```

**Retry Strategy:**

```typescript
const RETRY_CONFIG = {
  maxAttempts: 3,
  backoffMultiplier: 2,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 30000 // 30 seconds
};

async function processNotificationJob(job: Job<NotificationRequest>): Promise<void> {
  const { userId, type, channel, data } = job.data;
  const attemptNumber = job.attemptsMade;
  
  try {
    // Send notification via appropriate channel
    if (channel === 'email') {
      await sendEmail(userId, type, data);
    } else if (channel === 'sms') {
      await sendSMS(userId, type, data);
    } else {
      await sendInApp(userId, type, data);
    }
    
    // Update notification status in database
    await db.notification.update({
      where: { id: data.notificationId },
      data: { status: 'Sent', sentAt: new Date() }
    });
    
  } catch (error) {
    console.error(`Notification failed (attempt ${attemptNumber + 1}):`, error);
    
    if (attemptNumber + 1 >= RETRY_CONFIG.maxAttempts) {
      // Move to dead letter queue
      await db.notification.update({
        where: { id: data.notificationId },
        data: { 
          status: 'Dead_Letter',
          retryCount: attemptNumber + 1
        }
      });
      
      // Alert administrators
      await notifyAdminsOfFailure(data.notificationId);
    } else {
      // Schedule retry with exponential backoff
      const delay = Math.min(
        RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attemptNumber),
        RETRY_CONFIG.maxDelayMs
      );
      
      await job.retry({ delay });
      
      await db.notification.update({
        where: { id: data.notificationId },
        data: { retryCount: { increment: 1 } }
      });
    }
  }
}
```

#### 5. Waitlist Manager

**Responsibilities:**
- Queue management (FIFO)
- Automatic slot offer on cancellation
- 15-minute confirmation timeout
- Cascading offers to next in queue

**Interface:**
```typescript
interface WaitlistManager {
  // Waitlist Operations
  addToWaitlist(entry: WaitlistEntry): Promise<{ position: number }>;
  removeFromWaitlist(entryId: string): Promise<void>;
  
  // Slot Offer Processing
  processSlotAvailable(resourceId: string, timeSlot: TimeSlot): Promise<void>;
  confirmWaitlistBooking(entryId: string): Promise<Booking>;
  declineWaitlistOffer(entryId: string): Promise<void>;
  
  // Timeout Handling
  handleOfferTimeout(entryId: string): Promise<void>;
  scheduleTimeoutCheck(entryId: string, expiresAt: Date): Promise<void>;
}
```

**Waitlist Processing Flow:**

```mermaid
sequenceDiagram
    participant B as Booking Engine
    participant W as Waitlist Manager
    participant D as Database
    participant Q as Queue
    participant N as Notifier
    participant U1 as User 1 (waitlist)
    participant U2 as User 2 (waitlist)
    
    B->>D: Booking cancelled
    B->>W: Slot available event
    W->>D: Query waitlist (ORDER BY position)
    D-->>W: [User1, User2, User3]
    W->>D: Update User1 entry (status=Notified, expiresAt=now+15min)
    W->>Q: Enqueue notification to User1
    W->>Q: Schedule timeout check (15 min)
    Q->>N: Send notification
    N->>U1: "Slot available! Confirm within 15 minutes"
    
    alt User1 Confirms
        U1->>B: POST /waitlist/{entryId}/confirm
        B->>D: Create booking
        B->>D: Update waitlist entry (status=Confirmed)
        B->>N: Send confirmation
        N->>U1: "Booking confirmed!"
    else User1 Declines
        U1->>W: POST /waitlist/{entryId}/decline
        W->>D: Update entry (status=Declined)
        W->>W: Offer to next (User2)
    else Timeout (15 min)
        Q->>W: Timeout job executes
        W->>D: Check entry status
        alt Still Notified (no response)
            W->>D: Update entry (status=Expired)
            W->>W: Offer to next (User2)
        end
    end
```

#### 6. Equipment Manager

**Responsibilities:**
- Check-out/check-in workflows
- Overdue tracking and notifications
- User checkout limits enforcement
- Room booking linkage

**Interface:**
```typescript
interface EquipmentManager {
  // Check-out Operations
  checkOutEquipment(checkout: EquipmentCheckoutRequest): Promise<EquipmentCheckout>;
  checkInEquipment(checkoutId: string, condition: string): Promise<void>;
  linkEquipmentToBooking(equipmentId: string, bookingId: string): Promise<void>;
  
  // Limit Enforcement
  getUserCheckoutCount(userId: string): Promise<number>;
  canCheckOut(userId: string, role: UserRole): Promise<boolean>;
  
  // Overdue Management
  findOverdueCheckouts(): Promise<EquipmentCheckout[]>;
  sendOverdueNotifications(): Promise<void>;
  escalateToAdmins(checkoutId: string): Promise<void>;
}

interface EquipmentCheckoutRequest {
  equipmentId: string;
  userId: string;
  linkedBookingId?: string;
  expectedReturnTime: Date;
  conditionNotes?: string;
}
```

## API Design

### RESTful API Endpoints

#### Authentication Endpoints

```typescript
// OIDC Authentication
GET  /api/auth/oidc/login
  Response: 302 Redirect to OIDC provider

GET  /api/auth/oidc/callback?code={code}&state={state}
  Response: 302 Redirect to dashboard with session cookie

// Local Authentication (Fallback)
POST /api/auth/local/login
  Body: { email: string, password: string }
  Response: { user: User, accessToken: string, refreshToken: string }

// Session Management
POST /api/auth/refresh
  Body: { refreshToken: string }
  Response: { accessToken: string, expiresIn: number }

POST /api/auth/logout
  Headers: Authorization: Bearer {token}
  Response: 204 No Content

GET  /api/auth/me
  Headers: Authorization: Bearer {token}
  Response: { user: User, permissions: string[] }
```

#### Resource Endpoints

```typescript
// Resource CRUD (Admin/Facility_Manager only)
GET    /api/resources
  Query: ?type={type}&status={status}&capacity={min-max}&location={location}&page={page}&limit={limit}
  Response: { resources: Resource[], pagination: PaginationMeta }

GET    /api/resources/:id
  Response: { resource: Resource, images: ResourceImage[], sensors: IoTSensor[] }

POST   /api/resources
  Body: { name, type, capacity, location, amenities, bufferMinutes }
  Response: 201 { resource: Resource }

PUT    /api/resources/:id
  Body: { name?, type?, capacity?, location?, amenities?, bufferMinutes?, status? }
  Headers: If-Match: {version}
  Response: 200 { resource: Resource }
  Errors: 409 Conflict (version mismatch), 412 Precondition Failed

DELETE /api/resources/:id
  Response: 204 No Content (soft delete)

// Resource Images
POST   /api/resources/:id/images
  Body: multipart/form-data (file, isFloorPlan)
  Response: 201 { image: ResourceImage }
  Validation: Max 10MB, PNG/JPG/PDF only

DELETE /api/resources/:id/images/:imageId
  Response: 204 No Content

// Resource Search
GET    /api/resources/search
  Query: ?q={query}&filters={json}&autocomplete={boolean}
  Response: { results: Resource[], took: number }
```

#### Booking Endpoints

```typescript
// Booking Operations
GET    /api/bookings
  Query: ?userId={userId}&resourceId={resourceId}&status={status}&startDate={date}&endDate={date}
  Response: { bookings: Booking[], pagination: PaginationMeta }

GET    /api/bookings/:id
  Response: { booking: Booking, resource: Resource, user: User }

POST   /api/bookings
  Body: { resourceId, startTime, endTime, purpose }
  Response: 201 { booking: Booking }
  Errors: 409 Conflict (time slot unavailable), 400 Bad Request (validation errors)

POST   /api/bookings/recurring
  Body: { resourceId, startTime, endTime, purpose, pattern, endDate, customDays? }
  Response: 201 { created: Booking[], skipped: SkippedBooking[] }

PUT    /api/bookings/:id
  Body: { startTime?, endTime?, purpose?, status? }
  Headers: If-Match: {version}
  Response: 200 { booking: Booking }
  Errors: 409 Conflict, 403 Forbidden (already started)

DELETE /api/bookings/:id
  Body: { reason: string }
  Response: 204 No Content

// Availability Queries
GET    /api/resources/:id/availability
  Query: ?startDate={date}&endDate={date}
  Response: { resourceId, availableSlots: TimeSlot[], bookedSlots: BookedSlot[] }

POST   /api/resources/availability/bulk
  Body: { resourceIds: string[], date: Date }
  Response: { [resourceId: string]: TimeSlot[] }

// Check Conflicts
POST   /api/bookings/check-conflict
  Body: { resourceId, startTime, endTime, excludeBookingId? }
  Response: { hasConflict: boolean, conflicts: Booking[], alternatives: TimeSlot[] }
```

#### Waitlist Endpoints

```typescript
// Waitlist Operations
POST   /api/waitlist
  Body: { resourceId, desiredStartTime, desiredEndTime }
  Response: 201 { entry: WaitlistEntry, position: number }

GET    /api/waitlist/me
  Response: { entries: WaitlistEntry[] }

DELETE /api/waitlist/:id
  Response: 204 No Content

POST   /api/waitlist/:id/confirm
  Response: 200 { booking: Booking }
  Errors: 410 Gone (offer expired), 409 Conflict (already booked)

POST   /api/waitlist/:id/decline
  Response: 204 No Content
```

#### Equipment Endpoints

```typescript
// Equipment Check-out
POST   /api/equipment/checkout
  Body: { equipmentId, expectedReturnTime, linkedBookingId?, conditionNotes? }
  Response: 201 { checkout: EquipmentCheckout }
  Errors: 400 Bad Request (checkout limit exceeded), 409 Conflict (already checked out)

POST   /api/equipment/checkin/:checkoutId
  Body: { conditionNotes: string }
  Response: 200 { checkout: EquipmentCheckout }

GET    /api/equipment/checkouts/me
  Query: ?status={active|completed|overdue}
  Response: { checkouts: EquipmentCheckout[] }

GET    /api/equipment/:id/availability
  Response: { available: boolean, currentCheckout: EquipmentCheckout | null, nextAvailable: Date | null }
```

#### User Dashboard Endpoints

```typescript
// User Dashboard
GET    /api/dashboard
  Response: {
    upcomingBookings: Booking[],
    recentBookings: Booking[],
    activeCheckouts: EquipmentCheckout[],
    waitlistEntries: WaitlistEntry[],
    stats: {
      totalBookings: number,
      cancellationRate: number,
      noShowCount: number,
      favoriteResources: Resource[]
    }
  }

GET    /api/bookings/history
  Query: ?startDate={date}&endDate={date}&format={json|csv}
  Response: { bookings: Booking[] } | CSV file download
```

#### Admin Endpoints

```typescript
// System Configuration (Admin only)
GET    /api/admin/config
  Response: { [key: string]: any }

PUT    /api/admin/config/:key
  Body: { value: any }
  Response: 200 { key, value, updatedAt }

// User Management
GET    /api/admin/users
  Query: ?role={role}&search={query}&page={page}
  Response: { users: User[], pagination: PaginationMeta }

PUT    /api/admin/users/:id/role
  Body: { role: UserRole }
  Response: 200 { user: User }

POST   /api/admin/users/:id/suspend
  Body: { reason: string, duration?: number }
  Response: 204 No Content

// Analytics & Reports
GET    /api/admin/analytics/utilization
  Query: ?startDate={date}&endDate={date}&resourceId={id}&groupBy={day|week|month}
  Response: { data: UtilizationData[], summary: Summary }

GET    /api/admin/analytics/no-shows
  Query: ?startDate={date}&endDate={date}
  Response: { noShows: Booking[], rate: number, byResource: ResourceNoShowStats[] }

POST   /api/admin/reports/generate
  Body: { reportType, filters, format: 'pdf'|'csv'|'json', schedule? }
  Response: 201 { reportId, downloadUrl } | 202 Accepted (async generation)

// Audit Logs
GET    /api/admin/audit-logs
  Query: ?userId={id}&action={action}&entityType={type}&startDate={date}&endDate={date}
  Response: { logs: AuditLog[], pagination: PaginationMeta }

POST   /api/admin/audit-logs/export
  Body: { filters, format: 'csv'|'json' }
  Response: 200 File download
```



#### Integration Endpoints

```typescript
// IoT Sensor Integration
POST   /api/integrations/iot/readings
  Body: { sensorId, sensorType, data: any, timestamp }
  Headers: X-API-Key: {iot_api_key}
  Response: 202 Accepted

GET    /api/integrations/iot/sensors/:id/status
  Response: { sensor: IoTSensor, isOnline: boolean, lastReading: any }

POST   /api/integrations/iot/sensors/:id/alert
  Body: { alertType: 'unauthorized_occupancy'|'no_show'|'offline', details: any }
  Response: 204 No Content

// Calendar Integration
POST   /api/integrations/calendar/connect
  Body: { provider: 'google'|'outlook', authCode: string }
  Response: 200 { connected: boolean, calendarId: string }

POST   /api/integrations/calendar/sync
  Response: 202 Accepted { jobId: string }

GET    /api/integrations/calendar/conflicts
  Query: ?startDate={date}&endDate={date}
  Response: { conflicts: CalendarConflict[] }

// Access Control Integration
POST   /api/integrations/access/grant
  Body: { userId, resourceId, startTime, endTime, accessMethod: 'badge'|'pin'|'mobile' }
  Headers: X-API-Key: {access_api_key}
  Response: 201 { accessGrant: AccessGrant }

POST   /api/integrations/access/revoke
  Body: { grantId: string }
  Response: 204 No Content
```

### API Request/Response Examples

#### Example: Create Booking

**Request:**
```http
POST /api/bookings HTTP/1.1
Host: campus-resources.edu
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "resourceId": "550e8400-e29b-41d4-a716-446655440000",
  "startTime": "2025-02-15T09:00:00.000Z",
  "endTime": "2025-02-15T11:00:00.000Z",
  "purpose": "CS101 Lecture"
}
```

**Success Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /api/bookings/660e8400-e29b-41d4-a716-446655440111

{
  "booking": {
    "id": "660e8400-e29b-41d4-a716-446655440111",
    "userId": "770e8400-e29b-41d4-a716-446655440222",
    "resourceId": "550e8400-e29b-41d4-a716-446655440000",
    "startTime": "2025-02-15T09:00:00.000Z",
    "endTime": "2025-02-15T11:00:00.000Z",
    "purpose": "CS101 Lecture",
    "status": "Confirmed",
    "version": 1,
    "createdAt": "2025-02-01T10:30:00.000Z"
  }
}
```

**Conflict Response:**
```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "Time slot is already booked",
    "conflicts": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440333",
        "startTime": "2025-02-15T08:30:00.000Z",
        "endTime": "2025-02-15T10:30:00.000Z",
        "purpose": "Faculty Meeting"
      }
    ],
    "alternatives": [
      {
        "startTime": "2025-02-15T11:00:00.000Z",
        "endTime": "2025-02-15T13:00:00.000Z"
      },
      {
        "startTime": "2025-02-15T14:00:00.000Z",
        "endTime": "2025-02-15T16:00:00.000Z"
      }
    ]
  }
}
```

### Rate Limiting Configuration

```typescript
const RATE_LIMITS = {
  // Web UI users
  web: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Too many requests, please try again later'
  },
  
  // API clients
  api: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    skipFailedRequests: true,
    skipSuccessfulRequests: false
  },
  
  // IoT endpoints (higher limit for sensor data)
  iot: {
    windowMs: 60 * 1000,
    maxRequests: 1000,
    keyGenerator: (req) => req.headers['x-sensor-id'] || req.ip
  },
  
  // Authentication endpoints (stricter to prevent brute force)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many login attempts, please try again later'
  }
};
```

## Real-Time Features

### WebSocket Architecture

**Socket.io Room Structure:**

```typescript
// Room naming conventions
const ROOMS = {
  resource: (resourceId: string) => `resource:${resourceId}`,
  user: (userId: string) => `user:${userId}`,
  dashboard: () => 'dashboard',
  admin: () => 'admin'
};

// Event types
enum SocketEvent {
  // Client -> Server
  JOIN_RESOURCE = 'join_resource',
  LEAVE_RESOURCE = 'leave_resource',
  JOIN_DASHBOARD = 'join_dashboard',
  
  // Server -> Client
  AVAILABILITY_UPDATED = 'availability_updated',
  BOOKING_CREATED = 'booking_created',
  BOOKING_CANCELLED = 'booking_cancelled',
  BOOKING_MODIFIED = 'booking_modified',
  WAITLIST_OFFER = 'waitlist_offer',
  SYSTEM_ALERT = 'system_alert'
}
```

**WebSocket Server Implementation:**

```typescript
import { Server } from 'socket.io';
import { verifyJWT } from './auth';

export function setupWebSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true
    },
    transports: ['websocket', 'polling']
  });
  
  // Authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const session = await verifyJWT(token);
      socket.data.userId = session.userId;
      socket.data.role = session.role;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });
  
  io.on('connection', (socket) => {
    console.log(`User ${socket.data.userId} connected`);
    
    // Join user's personal room
    socket.join(ROOMS.user(socket.data.userId));
    
    // Join resource room
    socket.on(SocketEvent.JOIN_RESOURCE, (resourceId: string) => {
      socket.join(ROOMS.resource(resourceId));
      console.log(`User ${socket.data.userId} joined resource ${resourceId}`);
    });
    
    // Leave resource room
    socket.on(SocketEvent.LEAVE_RESOURCE, (resourceId: string) => {
      socket.leave(ROOMS.resource(resourceId));
    });
    
    // Join dashboard (get global updates)
    socket.on(SocketEvent.JOIN_DASHBOARD, () => {
      socket.join(ROOMS.dashboard());
    });
    
    socket.on('disconnect', () => {
      console.log(`User ${socket.data.userId} disconnected`);
    });
  });
  
  return io;
}

// Broadcast functions
export function broadcastAvailabilityUpdate(
  io: Server,
  resourceId: string,
  change: AvailabilityChange
): void {
  io.to(ROOMS.resource(resourceId)).emit(SocketEvent.AVAILABILITY_UPDATED, {
    resourceId,
    action: change.action,
    affectedSlots: change.affectedSlots,
    timestamp: change.timestamp
  });
}

export function notifyUserDirectly(
  io: Server,
  userId: string,
  event: SocketEvent,
  data: any
): void {
  io.to(ROOMS.user(userId)).emit(event, data);
}
```

**Client-Side Integration:**

```typescript
import { io, Socket } from 'socket.io-client';

class ResourceWebSocketClient {
  private socket: Socket;
  private listeners: Map<string, Function[]> = new Map();
  
  constructor(accessToken: string) {
    this.socket = io(process.env.VITE_WS_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling']
    });
    
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });
    
    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
  }
  
  subscribeToResource(resourceId: string, callback: (data: any) => void): void {
    this.socket.emit(SocketEvent.JOIN_RESOURCE, resourceId);
    this.socket.on(SocketEvent.AVAILABILITY_UPDATED, callback);
    
    if (!this.listeners.has(resourceId)) {
      this.listeners.set(resourceId, []);
    }
    this.listeners.get(resourceId)!.push(callback);
  }
  
  unsubscribeFromResource(resourceId: string): void {
    this.socket.emit(SocketEvent.LEAVE_RESOURCE, resourceId);
    const callbacks = this.listeners.get(resourceId) || [];
    callbacks.forEach(cb => {
      this.socket.off(SocketEvent.AVAILABILITY_UPDATED, cb);
    });
    this.listeners.delete(resourceId);
  }
  
  disconnect(): void {
    this.socket.disconnect();
  }
}

// Usage in React component
function ResourceCalendar({ resourceId }: { resourceId: string }) {
  const [availability, setAvailability] = useState<AvailabilityCalendar | null>(null);
  const wsClient = useRef<ResourceWebSocketClient | null>(null);
  
  useEffect(() => {
    const token = getAccessToken();
    wsClient.current = new ResourceWebSocketClient(token);
    
    wsClient.current.subscribeToResource(resourceId, (data) => {
      // Update availability in real-time
      setAvailability(prev => {
        if (!prev) return prev;
        return applyAvailabilityChange(prev, data);
      });
      
      // Show toast notification
      toast.info(`Resource availability updated: ${data.action}`);
    });
    
    return () => {
      wsClient.current?.unsubscribeFromResource(resourceId);
      wsClient.current?.disconnect();
    };
  }, [resourceId]);
  
  return (
    <Calendar availability={availability} />
  );
}
```

### Server-Sent Events (SSE) Alternative

For simpler use cases or clients that don't need bidirectional communication:

```typescript
// SSE endpoint
app.get('/api/stream/availability/:resourceId', async (req, res) => {
  const { resourceId } = req.params;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send initial data
  const availability = await getResourceAvailability(resourceId, new Date());
  res.write(`data: ${JSON.stringify(availability)}\n\n`);
  
  // Subscribe to Redis pub/sub for updates
  const subscriber = redis.duplicate();
  await subscriber.subscribe(`availability:${resourceId}`);
  
  subscriber.on('message', (channel, message) => {
    res.write(`data: ${message}\n\n`);
  });
  
  // Cleanup on client disconnect
  req.on('close', () => {
    subscriber.unsubscribe();
    subscriber.quit();
  });
});
```

## Integration Architecture

### IoT Sensor Integration

**Supported Protocols:**
1. **REST API**: Simple HTTP POST for individual readings
2. **MQTT**: Pub/sub for high-frequency sensor data

**MQTT Broker Setup:**

```typescript
import mqtt from 'mqtt';

const MQTT_CONFIG = {
  broker: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  clientId: `campus-resource-system-${Math.random().toString(16).slice(3)}`,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD
};

export function setupMQTTClient(): mqtt.MqttClient {
  const client = mqtt.connect(MQTT_CONFIG.broker, {
    clientId: MQTT_CONFIG.clientId,
    username: MQTT_CONFIG.username,
    password: MQTT_CONFIG.password,
    clean: true,
    reconnectPeriod: 1000
  });
  
  client.on('connect', () => {
    console.log('Connected to MQTT broker');
    
    // Subscribe to all sensor topics
    client.subscribe('campus/sensors/+/+', (err) => {
      if (err) {
        console.error('MQTT subscription error:', err);
      }
    });
  });
  
  client.on('message', async (topic, payload) => {
    try {
      // Topic format: campus/sensors/{resourceId}/{sensorType}
      const parts = topic.split('/');
      const resourceId = parts[2];
      const sensorType = parts[3];
      const data = JSON.parse(payload.toString());
      
      await handleSensorReading(resourceId, sensorType, data);
    } catch (error) {
      console.error('Error processing MQTT message:', error);
    }
  });
  
  return client;
}

async function handleSensorReading(
  resourceId: string,
  sensorType: string,
  data: any
): Promise<void> {
  // Store reading
  await db.ioTReading.create({
    data: {
      sensorId: data.sensorId,
      data,
      recordedAt: new Date(data.timestamp || Date.now())
    }
  });
  
  // Update sensor status
  await db.ioTSensor.update({
    where: { id: data.sensorId },
    data: {
      lastReading: data,
      lastCommunication: new Date(),
      isOnline: true
    }
  });
  
  // Trigger business logic
  if (sensorType === 'occupancy') {
    await checkUnauthorizedOccupancy(resourceId, data);
    await checkNoShow(resourceId, data);
  }
}
```

**Mock IoT Integration (for Hackathon):**

```typescript
// Generate simulated sensor data for demo
export function startMockIoTSimulator(): void {
  const RESOURCES_WITH_SENSORS = ['room-101', 'room-102', 'lab-a'];
  
  setInterval(() => {
    RESOURCES_WITH_SENSORS.forEach(resourceId => {
      const mockReading = {
        sensorId: `sensor-${resourceId}`,
        timestamp: new Date().toISOString(),
        occupancy: Math.random() > 0.5,
        occupantCount: Math.floor(Math.random() * 30),
        temperature: 22 + Math.random() * 4, // 22-26°C
        humidity: 40 + Math.random() * 20 // 40-60%
      };
      
      // Publish to MQTT or call API
      handleSensorReading(resourceId, 'occupancy', mockReading);
    });
  }, 30000); // Every 30 seconds
}
```



### Calendar Integration

**Google Calendar Integration:**

```typescript
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: `${process.env.API_URL}/api/integrations/calendar/google/callback`
};

export async function initGoogleCalendarAuth(userId: string): Promise<string> {
  const oauth2Client = new OAuth2Client(
    GOOGLE_CONFIG.clientId,
    GOOGLE_CONFIG.clientSecret,
    GOOGLE_CONFIG.redirectUri
  );
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    state: userId // Pass userId for callback
  });
  
  return authUrl;
}

export async function handleGoogleCallback(code: string, userId: string): Promise<void> {
  const oauth2Client = new OAuth2Client(
    GOOGLE_CONFIG.clientId,
    GOOGLE_CONFIG.clientSecret,
    GOOGLE_CONFIG.redirectUri
  );
  
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  
  // Store tokens securely (encrypted)
  await db.user.update({
    where: { id: userId },
    data: {
      preferences: {
        ...user.preferences,
        googleCalendar: {
          connected: true,
          accessToken: encrypt(tokens.access_token),
          refreshToken: encrypt(tokens.refresh_token),
          expiryDate: tokens.expiry_date
        }
      }
    }
  });
}

export async function syncBookingToGoogleCalendar(
  booking: Booking,
  action: 'create' | 'update' | 'delete'
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: booking.userId },
    select: { preferences: true }
  });
  
  if (!user?.preferences?.googleCalendar?.connected) {
    return; // Calendar not connected
  }
  
  const oauth2Client = new OAuth2Client(GOOGLE_CONFIG.clientId, GOOGLE_CONFIG.clientSecret);
  oauth2Client.setCredentials({
    access_token: decrypt(user.preferences.googleCalendar.accessToken),
    refresh_token: decrypt(user.preferences.googleCalendar.refreshToken)
  });
  
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const resource = await db.resource.findUnique({ where: { id: booking.resourceId } });
  
  const event = {
    summary: `${resource.name} - ${booking.purpose}`,
    location: resource.location,
    description: `Booking ID: ${booking.id}\nResource: ${resource.name}`,
    start: { dateTime: booking.startTime.toISOString(), timeZone: 'Asia/Kolkata' },
    end: { dateTime: booking.endTime.toISOString(), timeZone: 'Asia/Kolkata' }
  };
  
  try {
    if (action === 'create') {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event
      });
      
      // Store Google event ID for future updates
      await db.booking.update({
        where: { id: booking.id },
        data: {
          externalCalendarEventId: response.data.id
        }
      });
    } else if (action === 'update') {
      await calendar.events.update({
        calendarId: 'primary',
        eventId: booking.externalCalendarEventId,
        requestBody: event
      });
    } else if (action === 'delete') {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: booking.externalCalendarEventId
      });
    }
  } catch (error) {
    console.error('Calendar sync error:', error);
    // Log error but don't fail the booking operation
    await logCalendarSyncError(booking.id, error);
  }
}

export async function checkCalendarConflicts(
  userId: string,
  startTime: Date,
  endTime: Date
): Promise<CalendarConflict[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { preferences: true }
  });
  
  if (!user?.preferences?.googleCalendar?.connected) {
    return []; // No conflicts if calendar not connected
  }
  
  const oauth2Client = new OAuth2Client(GOOGLE_CONFIG.clientId, GOOGLE_CONFIG.clientSecret);
  oauth2Client.setCredentials({
    access_token: decrypt(user.preferences.googleCalendar.accessToken),
    refresh_token: decrypt(user.preferences.googleCalendar.refreshToken)
  });
  
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startTime.toISOString(),
    timeMax: endTime.toISOString(),
    singleEvents: true
  });
  
  return response.data.items?.map(event => ({
    summary: event.summary,
    start: new Date(event.start.dateTime || event.start.date),
    end: new Date(event.end.dateTime || event.end.date),
    location: event.location
  })) || [];
}
```

**Mock Calendar Integration (for Hackathon):**

```typescript
// Simulated calendar conflicts for demo
export async function mockCalendarConflicts(
  userId: string,
  startTime: Date,
  endTime: Date
): Promise<CalendarConflict[]> {
  // Return random conflicts 30% of the time
  if (Math.random() > 0.7) {
    return [{
      summary: 'Team Standup Meeting',
      start: new Date(startTime.getTime() + 30 * 60000),
      end: new Date(endTime.getTime() - 30 * 60000),
      location: 'Virtual - Zoom'
    }];
  }
  return [];
}
```

### Access Control System Integration

**Interface Design:**

```typescript
interface AccessControlAPI {
  grantAccess(grant: AccessGrant): Promise<{ success: boolean; credentialId?: string }>;
  revokeAccess(grantId: string): Promise<void>;
  checkAccessStatus(userId: string, resourceId: string): Promise<AccessStatus>;
}

interface AccessGrant {
  userId: string;
  resourceId: string;
  startTime: Date;
  endTime: Date;
  accessMethod: 'badge' | 'pin' | 'mobile';
  metadata?: Record<string, any>;
}

interface AccessStatus {
  hasAccess: boolean;
  validUntil?: Date;
  method?: string;
}
```

**Mock Access Control (for Hackathon):**

```typescript
export class MockAccessControlSystem implements AccessControlAPI {
  private grants: Map<string, AccessGrant> = new Map();
  
  async grantAccess(grant: AccessGrant): Promise<{ success: boolean; credentialId?: string }> {
    const grantId = `grant-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.grants.set(grantId, grant);
    
    console.log(`[Mock Access Control] Granted access to ${grant.userId} for ${grant.resourceId}`);
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      credentialId: `cred-${Math.random().toString(36).slice(2)}`
    };
  }
  
  async revokeAccess(grantId: string): Promise<void> {
    this.grants.delete(grantId);
    console.log(`[Mock Access Control] Revoked access: ${grantId}`);
  }
  
  async checkAccessStatus(userId: string, resourceId: string): Promise<AccessStatus> {
    const now = new Date();
    
    for (const [grantId, grant] of this.grants.entries()) {
      if (grant.userId === userId && grant.resourceId === resourceId) {
        if (now >= grant.startTime && now <= grant.endTime) {
          return {
            hasAccess: true,
            validUntil: grant.endTime,
            method: grant.accessMethod
          };
        }
      }
    }
    
    return { hasAccess: false };
  }
}
```

## Authentication & Authorization

### OIDC Integration with Fallback

**Authentication Flow:**

```typescript
import passport from 'passport';
import { Strategy as OIDCStrategy } from 'passport-openidconnect';
import { Strategy as LocalStrategy } from 'passport-local';

// OIDC Strategy
passport.use('oidc', new OIDCStrategy({
  issuer: process.env.OIDC_ISSUER,
  authorizationURL: process.env.OIDC_AUTH_URL,
  tokenURL: process.env.OIDC_TOKEN_URL,
  userInfoURL: process.env.OIDC_USERINFO_URL,
  clientID: process.env.OIDC_CLIENT_ID,
  clientSecret: process.env.OIDC_CLIENT_SECRET,
  callbackURL: `${process.env.API_URL}/api/auth/oidc/callback`,
  scope: ['openid', 'profile', 'email']
}, async (issuer, profile, done) => {
  try {
    // Find or create user
    let user = await db.user.findUnique({
      where: { ssoId: profile.id }
    });
    
    if (!user) {
      // Extract role from OIDC claims
      const role = extractRoleFromProfile(profile);
      
      user = await db.user.create({
        data: {
          email: profile.emails[0].value,
          name: profile.displayName,
          ssoProvider: 'oidc',
          ssoId: profile.id,
          role,
          lastLogin: new Date()
        }
      });
      
      await logAuditEvent({
        userId: user.id,
        action: 'USER_CREATED_VIA_SSO',
        entityType: 'User',
        entityId: user.id
      });
    } else {
      // Update last login
      await db.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });
    }
    
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Local Strategy (Fallback)
passport.use('local', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await db.user.findUnique({
      where: { email, ssoProvider: 'local' }
    });
    
    if (!user || !user.passwordHash) {
      return done(null, false, { message: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValid) {
      return done(null, false, { message: 'Invalid credentials' });
    }
    
    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });
    
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Extract role from OIDC claims
function extractRoleFromProfile(profile: any): UserRole {
  // Check custom claims (example for campus SSO)
  const roleClaim = profile._json?.role || profile._json?.['custom:role'];
  
  const roleMapping: Record<string, UserRole> = {
    'student': 'Student',
    'faculty': 'Faculty',
    'admin': 'Administrator',
    'facility': 'Facility_Manager'
  };
  
  return roleMapping[roleClaim] || 'Student'; // Default to Student
}
```

### RBAC Implementation

**Permission Matrix:**

```typescript
enum Permission {
  // Resource permissions
  RESOURCE_VIEW = 'resource:view',
  RESOURCE_CREATE = 'resource:create',
  RESOURCE_UPDATE = 'resource:update',
  RESOURCE_DELETE = 'resource:delete',
  
  // Booking permissions
  BOOKING_CREATE = 'booking:create',
  BOOKING_VIEW_OWN = 'booking:view:own',
  BOOKING_VIEW_ALL = 'booking:view:all',
  BOOKING_UPDATE_OWN = 'booking:update:own',
  BOOKING_UPDATE_ALL = 'booking:update:all',
  BOOKING_DELETE_OWN = 'booking:delete:own',
  BOOKING_DELETE_ALL = 'booking:delete:all',
  BOOKING_PRIORITY = 'booking:priority',
  BOOKING_RECURRING = 'booking:recurring',
  
  // Admin permissions
  USER_MANAGE = 'user:manage',
  CONFIG_UPDATE = 'config:update',
  ANALYTICS_VIEW = 'analytics:view',
  AUDIT_VIEW = 'audit:view',
  
  // Equipment permissions
  EQUIPMENT_CHECKOUT = 'equipment:checkout',
  EQUIPMENT_MANAGE = 'equipment:manage'
}

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  Student: [
    Permission.RESOURCE_VIEW,
    Permission.BOOKING_CREATE,
    Permission.BOOKING_VIEW_OWN,
    Permission.BOOKING_UPDATE_OWN,
    Permission.BOOKING_DELETE_OWN,
    Permission.EQUIPMENT_CHECKOUT
  ],
  
  Faculty: [
    Permission.RESOURCE_VIEW,
    Permission.BOOKING_CREATE,
    Permission.BOOKING_VIEW_OWN,
    Permission.BOOKING_UPDATE_OWN,
    Permission.BOOKING_DELETE_OWN,
    Permission.BOOKING_PRIORITY,
    Permission.BOOKING_RECURRING,
    Permission.EQUIPMENT_CHECKOUT,
    Permission.ANALYTICS_VIEW
  ],
  
  Administrator: Object.values(Permission), // All permissions
  
  Facility_Manager: [
    Permission.RESOURCE_VIEW,
    Permission.RESOURCE_CREATE,
    Permission.RESOURCE_UPDATE,
    Permission.RESOURCE_DELETE,
    Permission.BOOKING_VIEW_ALL,
    Permission.BOOKING_UPDATE_ALL,
    Permission.BOOKING_DELETE_ALL,
    Permission.EQUIPMENT_MANAGE,
    Permission.ANALYTICS_VIEW,
    Permission.AUDIT_VIEW
  ]
};

// Authorization middleware
export function requirePermission(...permissions: Permission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const userPermissions = ROLE_PERMISSIONS[user.role];
    const hasPermission = permissions.every(p => userPermissions.includes(p));
    
    if (!hasPermission) {
      await logAuditEvent({
        userId,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        entityType: 'Permission',
        entityId: permissions.join(','),
        metadata: { requiredPermissions: permissions }
      });
      
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
}

// Usage in routes
app.post('/api/resources',
  authenticate(),
  requirePermission(Permission.RESOURCE_CREATE),
  createResourceHandler
);

app.delete('/api/bookings/:id',
  authenticate(),
  requirePermission(Permission.BOOKING_DELETE_OWN, Permission.BOOKING_DELETE_ALL),
  deleteBookingHandler
);
```

### Session Management

```typescript
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL
});
redisClient.connect();

const SESSION_CONFIG = {
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'campus.sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    sameSite: 'lax' as const
  }
};

app.use(session(SESSION_CONFIG));
```

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}

// Error codes
enum ErrorCode {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_INSUFFICIENT_PERMISSIONS',
  
  // Booking errors
  BOOKING_CONFLICT = 'BOOKING_CONFLICT',
  BOOKING_INVALID_TIME_SLOT = 'BOOKING_INVALID_TIME_SLOT',
  BOOKING_RESOURCE_UNAVAILABLE = 'BOOKING_RESOURCE_UNAVAILABLE',
  BOOKING_ALREADY_STARTED = 'BOOKING_ALREADY_STARTED',
  
  // Resource errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_VERSION_CONFLICT = 'RESOURCE_VERSION_CONFLICT',
  
  // Equipment errors
  EQUIPMENT_ALREADY_CHECKED_OUT = 'EQUIPMENT_ALREADY_CHECKED_OUT',
  EQUIPMENT_CHECKOUT_LIMIT_EXCEEDED = 'EQUIPMENT_CHECKOUT_LIMIT_EXCEEDED',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}
```



### Global Error Handler

```typescript
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  
  // Log error
  logger.error({
    requestId,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    }
  });
  
  // Send to error tracking service (Sentry)
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, {
      user: { id: req.user?.id },
      tags: { requestId }
    });
  }
  
  // Prepare response
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  }
  
  // Unhandled errors
  return res.status(500).json({
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      requestId
    }
  });
});
```

## Testing Strategy

### Unit Testing

**Test Coverage Goals:**
- Booking Engine: 90%
- Authentication: 85%
- Availability Service: 85%
- Notification Service: 80%
- Overall: 70% minimum for hackathon

**Example Unit Tests:**

```typescript
// booking.service.test.ts
import { BookingEngine } from './booking.service';
import { MockDatabase } from '../test/mocks/database';

describe('BookingEngine', () => {
  let bookingEngine: BookingEngine;
  let mockDb: MockDatabase;
  
  beforeEach(() => {
    mockDb = new MockDatabase();
    bookingEngine = new BookingEngine(mockDb);
  });
  
  describe('createBooking', () => {
    it('should create booking when slot is available', async () => {
      const request = {
        userId: 'user-1',
        resourceId: 'resource-1',
        startTime: new Date('2025-02-15T09:00:00Z'),
        endTime: new Date('2025-02-15T11:00:00Z'),
        purpose: 'Test booking'
      };
      
      mockDb.setConflicts([]);
      
      const result = await bookingEngine.createBooking(request);
      
      expect(result.success).toBe(true);
      expect(result.booking).toBeDefined();
      expect(result.booking?.status).toBe('Confirmed');
    });
    
    it('should reject booking when conflict exists', async () => {
      const request = {
        userId: 'user-1',
        resourceId: 'resource-1',
        startTime: new Date('2025-02-15T09:00:00Z'),
        endTime: new Date('2025-02-15T11:00:00Z'),
        purpose: 'Test booking'
      };
      
      mockDb.setConflicts([
        {
          id: 'booking-1',
          startTime: new Date('2025-02-15T08:30:00Z'),
          endTime: new Date('2025-02-15T10:00:00Z'),
          status: 'Confirmed'
        }
      ]);
      
      const result = await bookingEngine.createBooking(request);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('BOOKING_CONFLICT');
      expect(result.error?.conflicts).toHaveLength(1);
      expect(result.error?.alternatives).toBeDefined();
    });
    
    it('should enforce buffer time', async () => {
      mockDb.setResource({
        id: 'resource-1',
        bufferMinutes: 15
      });
      
      mockDb.setConflicts([
        {
          id: 'booking-1',
          startTime: new Date('2025-02-15T08:00:00Z'),
          endTime: new Date('2025-02-15T08:50:00Z'), // Ends 10 min before request
          status: 'Confirmed'
        }
      ]);
      
      const request = {
        userId: 'user-1',
        resourceId: 'resource-1',
        startTime: new Date('2025-02-15T09:00:00Z'),
        endTime: new Date('2025-02-15T11:00:00Z'),
        purpose: 'Test booking'
      };
      
      const result = await bookingEngine.createBooking(request);
      
      // Should conflict due to 15-minute buffer
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('BOOKING_CONFLICT');
    });
  });
  
  describe('handlePriorityConflict', () => {
    it('should displace student booking for faculty', async () => {
      const studentBooking = {
        id: 'booking-student',
        userId: 'student-1',
        resourceId: 'resource-1',
        startTime: new Date('2025-02-15T09:00:00Z'),
        endTime: new Date('2025-02-15T11:00:00Z'),
        status: 'Confirmed'
      };
      
      mockDb.setBookings([studentBooking]);
      mockDb.setUser('student-1', { role: 'Student' });
      
      const facultyRequest = {
        userId: 'faculty-1',
        resourceId: 'resource-1',
        startTime: new Date('2025-02-15T09:00:00Z'),
        endTime: new Date('2025-02-15T11:00:00Z'),
        purpose: 'Lecture'
      };
      
      await bookingEngine.handlePriorityConflict(facultyRequest, studentBooking);
      
      // Verify student booking was cancelled
      const updatedBooking = await mockDb.getBooking('booking-student');
      expect(updatedBooking.status).toBe('Cancelled');
      
      // Verify student was moved to waitlist
      const waitlistEntries = await mockDb.getWaitlistEntries('student-1');
      expect(waitlistEntries).toHaveLength(1);
    });
  });
});
```

### Integration Testing

```typescript
// booking.integration.test.ts
import request from 'supertest';
import { app } from '../src/app';
import { setupTestDatabase, teardownTestDatabase } from '../test/setup';

describe('Booking API Integration', () => {
  let authToken: string;
  let resourceId: string;
  
  beforeAll(async () => {
    await setupTestDatabase();
    
    // Create test user and get auth token
    const authResponse = await request(app)
      .post('/api/auth/local/login')
      .send({ email: 'test@example.com', password: 'test123' });
    
    authToken = authResponse.body.accessToken;
    
    // Create test resource
    const resourceResponse = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Room',
        type: 'Classroom',
        capacity: 30,
        location: 'Building A'
      });
    
    resourceId = resourceResponse.body.resource.id;
  });
  
  afterAll(async () => {
    await teardownTestDatabase();
  });
  
  it('should create and retrieve booking', async () => {
    const bookingData = {
      resourceId,
      startTime: '2025-02-15T09:00:00.000Z',
      endTime: '2025-02-15T11:00:00.000Z',
      purpose: 'Integration test'
    };
    
    // Create booking
    const createResponse = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send(bookingData)
      .expect(201);
    
    expect(createResponse.body.booking).toBeDefined();
    const bookingId = createResponse.body.booking.id;
    
    // Retrieve booking
    const getResponse = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(getResponse.body.booking.id).toBe(bookingId);
    expect(getResponse.body.booking.purpose).toBe('Integration test');
  });
  
  it('should prevent double booking', async () => {
    const bookingData = {
      resourceId,
      startTime: '2025-02-15T14:00:00.000Z',
      endTime: '2025-02-15T16:00:00.000Z',
      purpose: 'First booking'
    };
    
    // Create first booking
    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send(bookingData)
      .expect(201);
    
    // Attempt overlapping booking
    const conflictResponse = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        ...bookingData,
        purpose: 'Conflicting booking'
      })
      .expect(409);
    
    expect(conflictResponse.body.error.code).toBe('BOOKING_CONFLICT');
    expect(conflictResponse.body.error.conflicts).toBeDefined();
  });
});
```

### Performance Testing

```typescript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 }     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.01']    // Error rate < 1%
  }
};

const BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

export default function() {
  // Search resources
  const searchResponse = http.get(`${BASE_URL}/api/resources?type=Classroom`, {
    headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
  });
  
  check(searchResponse, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 500ms': (r) => r.timings.duration < 500
  });
  
  // Check availability
  const resourceId = JSON.parse(searchResponse.body).resources[0]?.id;
  if (resourceId) {
    const availabilityResponse = http.get(
      `${BASE_URL}/api/resources/${resourceId}/availability?startDate=2025-02-15&endDate=2025-02-20`,
      { headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` } }
    );
    
    check(availabilityResponse, {
      'availability status is 200': (r) => r.status === 200,
      'availability response time < 200ms': (r) => r.timings.duration < 200
    });
  }
  
  sleep(1);
}
```

## Deployment Architecture

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: campus_resources
      POSTGRES_USER: campus_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U campus_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # MQTT Broker (for IoT)
  mosquitto:
    image: eclipse-mosquitto:2
    volumes:
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf
      - mosquitto_data:/mosquitto/data
      - mosquitto_log:/mosquitto/log
    ports:
      - "1883:1883"
      - "9001:9001"

  # Backend API
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://campus_user:${DB_PASSWORD}@postgres:5432/campus_resources
      REDIS_URL: redis://redis:6379
      MQTT_BROKER_URL: mqtt://mosquitto:1883
      OIDC_ISSUER: ${OIDC_ISSUER}
      OIDC_CLIENT_ID: ${OIDC_CLIENT_ID}
      OIDC_CLIENT_SECRET: ${OIDC_CLIENT_SECRET}
      JWT_SECRET: ${JWT_SECRET}
      SESSION_SECRET: ${SESSION_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "3000:3000"
    volumes:
      - ./uploads:/app/uploads
    command: npm run start:prod

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      VITE_API_URL: http://localhost:3000
      VITE_WS_URL: ws://localhost:3000
    depends_on:
      - api
    ports:
      - "5173:80"

  # NGINX Reverse Proxy
  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - api
      - frontend

volumes:
  postgres_data:
  redis_data:
  mosquitto_data:
  mosquitto_log:
```

### Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```

### Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```



### Free Cloud Deployment (Self-Hosted on Free Tier)

**Architecture Diagram:**

```mermaid
graph TB
    subgraph "Free Cloud Infrastructure"
        subgraph "Application Layer"
            LB[NGINX Load Balancer<br/>or Caddy]
            APP1[Node.js API<br/>Docker Container 1]
            APP2[Node.js API<br/>Docker Container 2]
        end
        
        subgraph "Data Layer"
            PG[(Self-Hosted PostgreSQL<br/>Single Instance)]
            REDIS[(Self-Hosted Redis<br/>Single Instance)]
            MINIO[MinIO<br/>Object Storage]
        end
        
        subgraph "Monitoring"
            GLITCH[GlitchTip<br/>Error Tracking]
            PROM[Prometheus<br/>Metrics]
            GRAF[Grafana<br/>Dashboards]
        end
    end
    
    subgraph "External"
        USERS[Users]
        OIDC[Campus SSO]
        SMTP[SMTP Server<br/>or Mailpit]
    end
    
    USERS --> LB
    LB --> APP1
    LB --> APP2
    APP1 --> PG
    APP2 --> PG
    APP1 --> REDIS
    APP2 --> REDIS
    APP1 --> MINIO
    APP2 --> MINIO
    APP1 --> SMTP
    APP2 --> SMTP
    APP1 --> OIDC
    APP2 --> OIDC
    
    APP1 --> GLITCH
    APP2 --> GLITCH
    APP1 --> PROM
    APP2 --> PROM
    PROM --> GRAF
    
    style LB fill:#ff9800
    style APP1 fill:#4caf50
    style APP2 fill:#4caf50
    style PG fill:#2196f3
    style REDIS fill:#f44336
```

**Deployment Options (All FREE):**

### Option 1: Oracle Cloud Always Free Tier

**Specs (Forever Free):**
- 2x AMD-based Compute VMs (1/8 OCPU, 1 GB RAM each) OR
- 4x ARM-based Ampere A1 Compute instances (4 OCPU, 24 GB RAM total)
- 200 GB Block Volume storage
- 10 TB outbound data transfer per month

**Deployment Strategy:**
```yaml
# docker-compose.yml for Oracle Cloud
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: campus_resources
      POSTGRES_USER: campus_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - backend

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - backend

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    networks:
      - backend

  api:
    image: campus-resources-api:latest
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://campus_user:${DB_PASSWORD}@postgres:5432/campus_resources
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      MINIO_ENDPOINT: minio:9000
      MINIO_ACCESS_KEY: ${MINIO_ROOT_USER}
      MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
    depends_on:
      - postgres
      - redis
      - minio
    deploy:
      replicas: 2
    networks:
      - backend
      - frontend

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
    networks:
      - frontend

  glitchtip:
    image: glitchtip/glitchtip:latest
    environment:
      DATABASE_URL: postgresql://campus_user:${DB_PASSWORD}@postgres:5432/glitchtip
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      SECRET_KEY: ${GLITCHTIP_SECRET}
    depends_on:
      - postgres
      - redis
    networks:
      - backend
      - frontend

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    networks:
      - backend

  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus
    networks:
      - backend
      - frontend

volumes:
  postgres_data:
  redis_data:
  minio_data:
  prometheus_data:
  grafana_data:

networks:
  frontend:
  backend:
```

### Option 2: Railway Free Tier

**Specs (Free Tier):**
- $5 credit per month (can run small apps)
- Auto-deploy from GitHub
- Built-in PostgreSQL, Redis, and monitoring

**Deployment:**
```yaml
# railway.toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
restartPolicyType = "on-failure"

[[services]]
name = "postgres"
image = "postgres:15"

[[services]]
name = "redis"  
image = "redis:7"

[[services]]
name = "api"
build.context = "."
```

### Option 3: Render Free Tier

**Specs (Free Tier):**
- Free web services (auto-sleep after 15 min inactivity)
- Free PostgreSQL databases (90 days, then expires)
- 750 hours compute per month

**Deployment:**
```yaml
# render.yaml
services:
  - type: web
    name: campus-resources-api
    env: docker
    dockerfilePath: ./Dockerfile
    plan: free
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: campus-resources-db
          property: connectionString
      - key: REDIS_URL
        fromDatabase:
          name: campus-resources-redis
          property: connectionString

databases:
  - name: campus-resources-db
    plan: free
    databaseName: campus_resources
    
  - name: campus-resources-redis
    plan: free
```

### Option 4: Fly.io Free Tier

**Specs (Free Tier):**
- 3 shared-cpu-1x VMs (256MB RAM each)
- 3GB persistent volume storage
- 160GB outbound data transfer

**Deployment:**
```toml
# fly.toml
app = "campus-resources"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "3000"
  NODE_ENV = "production"

[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[[services.http_checks]]
  interval = "10s"
  timeout = "2s"
  grace_period = "5s"
  path = "/health"
```

**Infrastructure as Code (Docker Compose - FREE):**

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: campus_resources
      POSTGRES_USER: campus_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U campus_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - backend
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    networks:
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

  api:
    image: campus-resources-api:latest
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://campus_user:${DB_PASSWORD}@postgres:5432/campus_resources
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      MINIO_ENDPOINT: minio:9000
      MINIO_ACCESS_KEY: ${MINIO_ROOT_USER}
      MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
      GLITCHTIP_DSN: ${GLITCHTIP_DSN}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G
    networks:
      - backend
      - frontend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
    networks:
      - frontend

  glitchtip-web:
    image: glitchtip/glitchtip:latest
    environment:
      DATABASE_URL: postgresql://campus_user:${DB_PASSWORD}@postgres:5432/glitchtip
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/1
      SECRET_KEY: ${GLITCHTIP_SECRET}
      EMAIL_URL: smtp://${SMTP_USER}:${SMTP_PASSWORD}@${SMTP_HOST}:${SMTP_PORT}
    depends_on:
      - postgres
      - redis
    networks:
      - backend
      - frontend

  glitchtip-worker:
    image: glitchtip/glitchtip:latest
    command: celery -A glitchtip worker -l info
    environment:
      DATABASE_URL: postgresql://campus_user:${DB_PASSWORD}@postgres:5432/glitchtip
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/1
      SECRET_KEY: ${GLITCHTIP_SECRET}
    depends_on:
      - postgres
      - redis
    networks:
      - backend

  prometheus:
    image: prom/prometheus:latest
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    networks:
      - backend

  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_SERVER_ROOT_URL: https://${DOMAIN}/grafana/
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
    depends_on:
      - prometheus
    networks:
      - backend
      - frontend

  mailpit:
    image: axllent/mailpit:latest
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
    environment:
      MP_MAX_MESSAGES: 5000
      MP_DATABASE: /data/mailpit.db
    volumes:
      - mailpit_data:/data
    networks:
      - backend

volumes:
  postgres_data:
  redis_data:
  minio_data:
  prometheus_data:
  grafana_data:
  mailpit_data:

networks:
  frontend:
  backend:
```
  depends_on = [aws_lb_listener.api]
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "campus-resources-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = module.vpc.public_subnets
  
  enable_deletion_protection = var.environment == "production"
}

# S3 Bucket for File Uploads
resource "aws_s3_bucket" "uploads" {
  bucket = "campus-resources-uploads-${var.environment}"
  
  tags = {
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  
  rule {
    id     = "delete-old-versions"
    status = "Enabled"
    
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}
```

### Managed Services Recommendations

**For Hackathon (48 hours):**
1. **Database**: Use managed PostgreSQL (AWS RDS, Azure Database, or Supabase)
2. **Cache**: Redis Cloud free tier or ElastiCache
3. **File Storage**: AWS S3 or Cloudinary
4. **Email**: SendGrid free tier (100 emails/day)
5. **SMS**: Twilio trial credits
6. **Hosting**: Vercel (frontend) + Railway/Render (backend)
7. **Monitoring**: Free tier of Sentry + LogRocket

**Quick Setup Option (Single Command):**

```bash
# Using Railway CLI for instant deployment
railway init
railway up

# Or using Render.com (render.yaml)
render deploy
```

### Environment Variables

```bash
# .env.example
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/campus_resources

# Redis
REDIS_URL=redis://localhost:6379

# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883

# Authentication
OIDC_ISSUER=https://sso.campus.edu
OIDC_AUTH_URL=https://sso.campus.edu/authorize
OIDC_TOKEN_URL=https://sso.campus.edu/token
OIDC_USERINFO_URL=https://sso.campus.edu/userinfo
OIDC_CLIENT_ID=your_client_id
OIDC_CLIENT_SECRET=your_client_secret

JWT_SECRET=your_jwt_secret_min_32_chars
SESSION_SECRET=your_session_secret_min_32_chars

# File Upload
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=campus-resources-uploads

# Notification Services
SENDGRID_API_KEY=your_sendgrid_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Monitoring
SENTRY_DSN=your_sentry_dsn

# Application
API_URL=http://localhost:3000
CLIENT_URL=http://localhost:5173
```

## Concurrency Control

### Optimistic Locking Strategy

**Version-Based Locking:**

```typescript
// Update booking with optimistic lock
async function updateBookingWithLock(
  bookingId: string,
  updates: Partial<Booking>,
  expectedVersion: number
): Promise<Booking> {
  try {
    const updatedBooking = await db.booking.update({
      where: {
        id: bookingId,
        version: expectedVersion // This enforces optimistic lock
      },
      data: {
        ...updates,
        version: { increment: 1 }
      }
    });
    
    return updatedBooking;
  } catch (error) {
    if (error.code === 'P2025') {
      // Record not found or version mismatch
      throw new AppError(
        ErrorCode.RESOURCE_VERSION_CONFLICT,
        'Resource was updated by another user. Please refresh and try again.',
        409
      );
    }
    throw error;
  }
}
```

**Timestamp-Based Conflict Detection:**

```typescript
// Detect concurrent modifications
async function checkConcurrentModification(
  entityId: string,
  entityType: string,
  lastKnownUpdate: Date
): Promise<boolean> {
  const current = await db[entityType].findUnique({
    where: { id: entityId },
    select: { updatedAt: true }
  });
  
  if (!current) {
    return false;
  }
  
  // Check if entity was modified since user loaded it
  return current.updatedAt > lastKnownUpdate;
}
```

### Database-Level Locking

**Row-Level Locking for Critical Operations:**

```typescript
async function createBookingWithRowLock(request: BookingRequest): Promise<Booking> {
  return await db.$transaction(
    async (tx) => {
      // Lock the resource row for this transaction
      await tx.$executeRaw`
        SELECT * FROM resources 
        WHERE id = ${request.resourceId}
        FOR UPDATE;
      `;
      
      // Lock conflicting bookings
      const conflicts = await tx.$queryRaw`
        SELECT * FROM bookings
        WHERE resource_id = ${request.resourceId}
          AND status = 'Confirmed'
          AND tsrange(start_time, end_time) && tsrange(${request.startTime}, ${request.endTime})
        FOR UPDATE;
      `;
      
      if (conflicts.length > 0) {
        throw new AppError(
          ErrorCode.BOOKING_CONFLICT,
          'Time slot is already booked',
          409,
          { conflicts }
        );
      }
      
      // Create booking
      return await tx.booking.create({
        data: {
          userId: request.userId,
          resourceId: request.resourceId,
          startTime: request.startTime,
          endTime: request.endTime,
          purpose: request.purpose,
          status: 'Confirmed'
        }
      });
    },
    {
      isolationLevel: 'Serializable',
      timeout: 5000
    }
  );
}
```

### Distributed Locking with Redis

**For Multi-Instance Deployments:**

```typescript
import Redlock from 'redlock';

const redlock = new Redlock([redis], {
  driftFactor: 0.01,
  retryCount: 3,
  retryDelay: 200,
  retryJitter: 200,
  automaticExtensionThreshold: 500
});

async function createBookingWithDistributedLock(
  request: BookingRequest
): Promise<Booking> {
  const lockKey = `booking:resource:${request.resourceId}`;
  const lockTTL = 5000; // 5 seconds
  
  let lock;
  try {
    // Acquire distributed lock
    lock = await redlock.acquire([lockKey], lockTTL);
    
    // Perform booking operation
    const result = await createBookingWithRowLock(request);
    
    return result;
  } finally {
    // Release lock
    if (lock) {
      await lock.release();
    }
  }
}
```

## Performance Optimization

### Database Query Optimization

```typescript
// Efficient query with selective loading
async function getUpcomingBookings(userId: string, limit: number = 10): Promise<Booking[]> {
  return await db.booking.findMany({
    where: {
      userId,
      status: 'Confirmed',
      startTime: { gte: new Date() }
    },
    include: {
      resource: {
        select: {
          id: true,
          name: true,
          type: true,
          location: true
        }
      }
    },
    orderBy: { startTime: 'asc' },
    take: limit
  });
}

// Batch loading to avoid N+1 queries
async function getBookingsWithResources(bookingIds: string[]): Promise<Booking[]> {
  const bookings = await db.booking.findMany({
    where: { id: { in: bookingIds } },
    include: { resource: true }
  });
  
  return bookings;
}
```

### Caching Strategy

```typescript
// Multi-layer caching
class CacheService {
  private memoryCache: Map<string, { data: any; expiresAt: number }> = new Map();
  
  async get<T>(key: string): Promise<T | null> {
    // Layer 1: Memory cache (fastest)
    const memCached = this.memoryCache.get(key);
    if (memCached && memCached.expiresAt > Date.now()) {
      return memCached.data as T;
    }
    
    // Layer 2: Redis (shared across instances)
    const redisCached = await redis.get(key);
    if (redisCached) {
      const data = JSON.parse(redisCached);
      // Populate memory cache
      this.memoryCache.set(key, {
        data,
        expiresAt: Date.now() + 10000 // 10 seconds in memory
      });
      return data as T;
    }
    
    return null;
  }
  
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);
    
    // Set in Redis
    await redis.setex(key, ttlSeconds, serialized);
    
    // Set in memory cache
    this.memoryCache.set(key, {
      data: value,
      expiresAt: Date.now() + Math.min(ttlSeconds * 1000, 10000)
    });
  }
  
  async invalidate(pattern: string): Promise<void> {
    // Clear memory cache
    for (const [key] of this.memoryCache.entries()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }
    
    // Clear Redis cache
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
```

### Connection Pooling

```typescript
// Prisma connection pool configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// PostgreSQL connection pool settings (via DATABASE_URL)
// postgresql://user:password@host:5432/dbname?pool_timeout=10&connect_timeout=10&pool_max_size=50&pool_min_size=10
```

### Response Compression

```typescript
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance between speed and compression ratio
  threshold: 1024 // Only compress responses > 1KB
}));
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection Analysis

After analyzing all acceptance criteria, the following properties were identified as testable via property-based testing. Many integration and infrastructure tests were excluded as they require external systems (OIDC, IoT sensors, calendar APIs, real-time messaging infrastructure).

**Redundancy Eliminated:**
- Timezone conversion properties (1.7, 1.8) can be combined into a single round-trip property
- Role-based advance booking window properties (5.2, 5.3) can be combined into one property that handles both roles
- Rate limiting properties (23.4, 23.5) can be combined into one property with different thresholds per endpoint type
- File validation properties (2.5, 2.6) can be tested together as part of upload validation

### Property 1: OIDC Role Claim Mapping

*For any* OIDC user profile with role claims, the system SHALL correctly extract and map the role claim to one of the four supported user roles (Student, Faculty, Administrator, Facility_Manager), defaulting to Student if the claim is invalid.

**Validates: Requirements 1.2**

### Property 2: Authorization Decision Consistency

*For any* user with a given role attempting any system action, the authorization decision SHALL be consistent with the role's permission set, and unauthorized attempts SHALL be logged to the audit trail.

**Validates: Requirements 1.4**

### Property 3: Timezone Round-Trip Preservation

*For any* timestamp in any timezone, when stored in UTC and displayed in IST, the absolute time point SHALL be preserved (i.e., the UTC storage and IST display SHALL represent the same moment in time).

**Validates: Requirements 1.7, 1.8**

### Property 4: File Upload Validation

*For any* file upload, the system SHALL accept the file if and only if its size is ≤ 10 MB AND its MIME type is one of image/png, image/jpeg, or application/pdf, rejecting all other files.

**Validates: Requirements 2.5, 2.6**

### Property 5: Soft Delete Preservation

*For any* resource with associated booking records, deleting the resource (soft delete) SHALL preserve all historical booking records, making them accessible via the booking history API even though the resource is marked as deleted.

**Validates: Requirements 2.7**

### Property 6: Availability Calculation Correctness

*For any* resource and date range, the calculated availability slots SHALL be the complement of booked slots (accounting for booking status = 'Confirmed'), maintenance windows, and buffer times around bookings.

**Validates: Requirements 3.3, 3.4**

### Property 7: Resource Filtering Accuracy

*For any* set of resources and filter criteria (type, capacity range, location, amenities, status), the filtered results SHALL include only resources that match ALL specified criteria.

**Validates: Requirements 3.5**

### Property 8: Booking Conflict Detection

*For any* two time slots on the same resource, the system SHALL detect a conflict if and only if the time ranges overlap (considering buffer times), where overlap is defined as: `slot1.start < slot2.end AND slot2.start < slot1.end`.

**Validates: Requirements 4.2, 17.3**

### Property 9: Conflict Alternative Generation

*For any* booking request that results in a conflict, the system SHALL return at least one alternative time slot of the same duration that does not conflict with existing bookings, or indicate that no alternatives exist within the search window.

**Validates: Requirements 4.3**

### Property 10: Booking Duration Validation

*For any* booking request, the system SHALL accept the booking if and only if the duration (endTime - startTime) is ≥ 30 minutes AND ≤ 8 hours, rejecting requests outside this range with a clear validation error.

**Validates: Requirements 4.4**

### Property 11: Recurring Booking Generation

*For any* recurring booking request with a pattern (daily, weekly, custom days) and end date, the system SHALL generate booking instances for all dates matching the pattern within the date range, skipping only those dates where conflicts exist.

**Validates: Requirements 5.1, 5.8, 17.7**

### Property 12: Role-Based Advance Booking Window

*For any* booking request, the system SHALL enforce the advance booking window based on the user's role: Faculty users can book up to the configured Faculty window (default 90 days), while Student users can book up to the configured Student window (default 14 days).

**Validates: Requirements 5.2, 5.3**

### Property 13: Faculty Priority Enforcement

*For any* conflicting booking scenario where a Faculty user attempts to book a slot occupied by a Student user, the system SHALL displace the Student booking, cancel it, and move the Student to the waitlist.

**Validates: Requirements 5.4, 5.6**

### Property 14: Late Cancellation Detection

*For any* booking cancellation, the system SHALL flag the cancellation as "late" if and only if the cancellation timestamp is within 2 hours of the booking's start time.

**Validates: Requirements 6.3**

### Property 15: Modification Blocking for Started Bookings

*For any* booking, modification attempts SHALL be rejected if the current system time is greater than or equal to the booking's start time (i.e., the booking has already started or is in progress).

**Validates: Requirements 6.6**

### Property 16: Waitlist FIFO Ordering

*For any* set of waitlist entries for the same resource and time slot, the entries SHALL be ordered by their creation timestamp in ascending order (earliest first), ensuring first-come, first-served processing.

**Validates: Requirements 7.2**

### Property 17: Waitlist Confirmation Timeout

*For any* waitlist entry that transitions to "Notified" status, the entry SHALL automatically transition to "Expired" if no user confirmation is received within 15 minutes of the notification timestamp, making the slot available for the next person in queue.

**Validates: Requirements 7.5, 7.6**

### Property 18: Equipment and Room Atomic Linking

*For any* equipment checkout request that includes a linked room booking, both the equipment checkout and the room booking SHALL be created atomically (both succeed or both fail), preventing partial reservations.

**Validates: Requirements 8.2**

### Property 19: Equipment Availability Blocking

*For any* equipment that has an active checkout record (actualReturnTime is NULL), new booking attempts for that equipment SHALL be rejected until the equipment is checked in.

**Validates: Requirements 8.4**

### Property 20: Equipment Checkout Limits

*For any* user attempting to check out equipment, the system SHALL enforce role-based limits: Students can have at most 3 concurrent checkouts, Faculty can have at most 5, and checkout attempts exceeding these limits SHALL be rejected.

**Validates: Requirements 8.7**

### Property 21: IoT Unauthorized Occupancy Detection

*For any* IoT sensor reading indicating occupancy (occupancy = true) at a specific time, if no confirmed booking exists for that resource covering that time, the system SHALL flag it as unauthorized usage.

**Validates: Requirements 9.2**

### Property 22: IoT No-Show Detection

*For any* confirmed booking, if IoT sensor data shows no occupancy (occupancy = false) for the entire period from start_time to start_time + 15 minutes, the system SHALL flag the booking as a no-show.

**Validates: Requirements 9.3**

### Property 23: iCalendar Export Validity

*For any* booking, the generated iCalendar (.ics) file SHALL be valid according to RFC 5545, including required fields (VEVENT, DTSTART, DTEND, SUMMARY, LOCATION) and proper timezone information.

**Validates: Requirements 10.1**

### Property 24: Calendar Event Data Completeness

*For any* booking exported to a calendar event, the event SHALL include the resource name, location, booking purpose, start time, and end time, with all fields present and non-empty.

**Validates: Requirements 10.4**

### Property 25: Buffer Time Enforcement

*For any* resource with a configured buffer time, consecutive bookings SHALL be separated by at least the buffer duration, with the system rejecting any booking that starts before (previous_booking_end + buffer_minutes).

**Validates: Requirements 17.4**

### Property 26: Optimistic Lock Conflict Detection

*For any* resource or booking modification attempt, if the entity's version number at modification time does not match the version number when the entity was loaded, the system SHALL detect the concurrent modification and reject the update with a version conflict error.

**Validates: Requirements 17A.2**

### Property 27: Comprehensive Audit Logging

*For any* user action in the system (authentication, booking creation/modification/cancellation, resource updates, configuration changes), an audit log entry SHALL be created containing the timestamp, user ID, action type, entity type, entity ID, and a snapshot of changes.

**Validates: Requirements 20.1, 20.2**

### Property 28: Audit Log Export Validity

*For any* set of audit log entries, the system SHALL generate valid CSV and JSON exports where each entry contains all required fields and the file format conforms to the respective specifications (RFC 4180 for CSV, RFC 8259 for JSON).

**Validates: Requirements 20.7**

### Property 29: Rate Limit Enforcement

*For any* API client or user making requests to the system, the system SHALL enforce rate limits of 100 requests per minute, rejecting requests that exceed this threshold with HTTP 429 status code until the rate window resets.

**Validates: Requirements 23.4, 23.5**



## Error Handling

### Error Categories and Recovery Strategies

| Error Category | Example Scenarios | Recovery Strategy | User Experience |
|----------------|-------------------|-------------------|-----------------|
| **Validation Errors** | Invalid booking duration, file too large, missing required fields | Reject with 400, return detailed field-level errors | Show inline validation messages |
| **Conflict Errors** | Double booking, version mismatch, resource unavailable | Reject with 409, provide alternatives or refresh prompt | Show conflict details + alternatives |
| **Authorization Errors** | Insufficient permissions, session expired | Reject with 401/403, log attempt | Redirect to login or show permission denied |
| **Not Found Errors** | Resource/booking doesn't exist | Reject with 404 | Show "not found" message |
| **Rate Limit Errors** | Too many requests | Reject with 429, include Retry-After header | Show "slow down" message with countdown |
| **Integration Errors** | OIDC down, IoT offline, email failed | Use fallback or retry, log error | Graceful degradation, show warning |
| **System Errors** | Database connection lost, OOM | Retry with backoff, alert ops team | Show generic error, provide request ID |

### Graceful Degradation Strategies

**OIDC Authentication Failure:**
```typescript
async function authenticateUser(req: Request): Promise<User> {
  try {
    // Try OIDC authentication
    return await authenticateWithOIDC(req);
  } catch (error) {
    logger.warn('OIDC authentication failed, using local fallback', error);
    
    // Fall back to local authentication for administrators
    if (req.path.includes('/admin')) {
      return await authenticateLocal(req);
    }
    
    throw new AppError(
      ErrorCode.AUTH_SERVICE_UNAVAILABLE,
      'Campus SSO is currently unavailable. Please try again later or contact support.',
      503
    );
  }
}
```

**IoT Sensor Offline:**
```typescript
async function getResourceOccupancy(resourceId: string): Promise<OccupancyData> {
  const sensor = await db.ioTSensor.findFirst({
    where: { resourceId, isOnline: true }
  });
  
  if (!sensor || !sensor.lastCommunication || 
      Date.now() - sensor.lastCommunication.getTime() > 5 * 60 * 1000) {
    // Sensor offline - use booking-based occupancy estimation
    logger.info(`Sensor offline for ${resourceId}, using booking-based occupancy`);
    
    const activeBooking = await db.booking.findFirst({
      where: {
        resourceId,
        status: 'Confirmed',
        startTime: { lte: new Date() },
        endTime: { gte: new Date() }
      }
    });
    
    return {
      isOccupied: !!activeBooking,
      confidence: 'estimated',
      source: 'booking_schedule',
      warning: 'IoT sensor offline - showing estimated occupancy'
    };
  }
  
  return {
    isOccupied: sensor.lastReading?.occupancy || false,
    confidence: 'realtime',
    source: 'iot_sensor',
    lastUpdated: sensor.lastCommunication
  };
}
```

**Calendar Sync Failure:**
```typescript
async function syncBookingToCalendar(booking: Booking): Promise<void> {
  try {
    await googleCalendarSync(booking);
  } catch (error) {
    logger.error('Calendar sync failed', { bookingId: booking.id, error });
    
    // Don't fail the booking - log and notify user
    await db.notification.create({
      data: {
        userId: booking.userId,
        type: 'calendar_sync_failed',
        channel: 'in_app',
        recipient: booking.userId,
        payload: {
          bookingId: booking.id,
          error: 'Calendar sync failed. You can manually download the .ics file from your booking details.'
        },
        status: 'Pending'
      }
    });
    
    // Continue execution - calendar sync is not critical
  }
}
```

## Testing Strategy

### Testing Approach

The testing strategy employs a dual approach combining **property-based testing** for universal correctness properties with **example-based unit tests** for specific scenarios and **integration tests** for external system interactions.

### Property-Based Testing

**Framework:** fast-check (for JavaScript/TypeScript)

**Configuration:**
- **Minimum 100 iterations** per property test (due to randomization and need for comprehensive input coverage)
- **Seed-based reproducibility** for debugging failing cases
- **Shrinking** to find minimal failing examples

**Example Property Test:**

```typescript
import fc from 'fast-check';
import { describe, it, expect } from '@jest/globals';
import { BookingEngine } from './booking.engine';

describe('Booking Engine - Properties', () => {
  // Feature: smart-campus-resource-management, Property 8: Booking Conflict Detection
  it('should detect conflicts for overlapping time slots', () => {
    fc.assert(
      fc.property(
        fc.record({
          resourceId: fc.uuid(),
          slot1Start: fc.date({ min: new Date('2025-01-01'), max: new Date('2025-12-31') }),
          slot1Duration: fc.integer({ min: 30, max: 480 }), // 30 min to 8 hours
          slot2Start: fc.date({ min: new Date('2025-01-01'), max: new Date('2025-12-31') }),
          slot2Duration: fc.integer({ min: 30, max: 480 }),
          bufferMinutes: fc.integer({ min: 0, max: 30 })
        }),
        async ({ resourceId, slot1Start, slot1Duration, slot2Start, slot2Duration, bufferMinutes }) => {
          const slot1End = new Date(slot1Start.getTime() + slot1Duration * 60000);
          const slot2End = new Date(slot2Start.getTime() + slot2Duration * 60000);
          
          // Apply buffer
          const slot1EffectiveStart = new Date(slot1Start.getTime() - bufferMinutes * 60000);
          const slot1EffectiveEnd = new Date(slot1End.getTime() + bufferMinutes * 60000);
          const slot2EffectiveStart = new Date(slot2Start.getTime() - bufferMinutes * 60000);
          const slot2EffectiveEnd = new Date(slot2End.getTime() + bufferMinutes * 60000);
          
          // Expected: overlap if slot1EffectiveStart < slot2EffectiveEnd AND slot2EffectiveStart < slot1EffectiveEnd
          const expectedConflict = slot1EffectiveStart < slot2EffectiveEnd && 
                                   slot2EffectiveStart < slot1EffectiveEnd;
          
          // Test
          const result = await bookingEngine.checkConflict(
            resourceId,
            slot2Start,
            slot2End,
            [{ startTime: slot1Start, endTime: slot1End, status: 'Confirmed' }],
            bufferMinutes
          );
          
          expect(result.hasConflict).toBe(expectedConflict);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: smart-campus-resource-management, Property 10: Booking Duration Validation
  it('should validate booking duration is between 30 minutes and 8 hours', () => {
    fc.assert(
      fc.property(
        fc.record({
          startTime: fc.date({ min: new Date('2025-01-01'), max: new Date('2025-12-31') }),
          durationMinutes: fc.integer({ min: 1, max: 600 }) // 1 min to 10 hours
        }),
        ({ startTime, durationMinutes }) => {
          const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
          const result = bookingEngine.validateDuration(startTime, endTime);
          
          const isValidDuration = durationMinutes >= 30 && durationMinutes <= 480;
          expect(result.isValid).toBe(isValidDuration);
          
          if (!isValidDuration) {
            expect(result.error).toBeDefined();
            expect(result.error?.code).toBe('BOOKING_INVALID_DURATION');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: smart-campus-resource-management, Property 3: Timezone Round-Trip Preservation
  it('should preserve absolute time when converting UTC ↔ IST', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        fc.integer({ min: -12, max: 14 }), // Various timezone offsets
        (originalDate, timezoneOffset) => {
          // Simulate date from various timezones
          const dateInTimezone = new Date(originalDate.getTime() + timezoneOffset * 3600000);
          
          // Store in UTC (our internal format)
          const storedUTC = convertToUTC(dateInTimezone, timezoneOffset);
          
          // Display in IST (UTC+5:30)
          const displayedIST = convertToIST(storedUTC);
          
          // Convert back to UTC for comparison
          const backToUTC = convertToUTC(displayedIST, 5.5);
          
          // The absolute time point should be preserved
          expect(Math.abs(storedUTC.getTime() - backToUTC.getTime())).toBeLessThan(1000); // Allow 1s tolerance
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing

**Framework:** Jest

**Coverage Goals:**
- Booking Engine: 90%
- Authentication Service: 85%
- Availability Service: 85%
- Notification Service: 80%
- Overall: 70% minimum

**Focus Areas:**
- Specific edge cases not covered by property tests
- Error handling paths
- Business logic validation
- Mock-based testing for external dependencies

### Integration Testing

**Framework:** Jest + Supertest (for API testing)

**Test Environment:**
- Docker Compose with test database
- In-memory Redis for faster tests
- Mock external services (OIDC, calendar, IoT)

**Scenarios:**
- End-to-end booking workflows
- Authentication flows
- Concurrent booking attempts
- WebSocket real-time updates
- Notification delivery

### Performance Testing

**Framework:** k6 for load testing

**Benchmarks:**
- API response time: p95 < 500ms
- Booking creation: p95 < 200ms
- Search queries: p95 < 500ms
- WebSocket message latency: < 2 seconds
- Concurrent users: 500 without degradation

### Test Data Generation

**Seed Data Script:**
```typescript
// seed.ts - Generate realistic test data
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding database...');
  
  // Create users
  const users = [];
  for (let i = 0; i < 100; i++) {
    const role = faker.helpers.arrayElement(['Student', 'Faculty', 'Administrator', 'Facility_Manager']);
    users.push(await prisma.user.create({
      data: {
        email: faker.internet.email(),
        name: faker.person.fullName(),
        role,
        ssoProvider: 'oidc',
        ssoId: faker.string.uuid()
      }
    }));
  }
  
  // Create resources
  const resources = [];
  const resourceTypes = ['Classroom', 'Lab', 'Equipment', 'Meeting_Room', 'Sports_Facility'];
  for (let i = 0; i < 50; i++) {
    resources.push(await prisma.resource.create({
      data: {
        name: `${faker.helpers.arrayElement(resourceTypes)} ${faker.number.int({ min: 100, max: 999 })}`,
        type: faker.helpers.arrayElement(resourceTypes),
        capacity: faker.number.int({ min: 10, max: 100 }),
        location: `Building ${faker.string.alpha({ length: 1, casing: 'upper' })}, Floor ${faker.number.int({ min: 1, max: 5 })}`,
        amenities: faker.helpers.arrayElements(['Projector', 'Whiteboard', 'AC', 'WiFi', 'Smartboard'], 3),
        bufferMinutes: faker.helpers.arrayElement([0, 15, 30]),
        status: 'Available',
        managedBy: faker.helpers.arrayElement(users.filter(u => u.role === 'Facility_Manager')).id
      }
    }));
  }
  
  // Create bookings
  const now = new Date();
  for (let i = 0; i < 200; i++) {
    const startTime = faker.date.between({
      from: now,
      to: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
    });
    const duration = faker.helpers.arrayElement([30, 60, 90, 120, 180, 240]); // minutes
    const endTime = new Date(startTime.getTime() + duration * 60000);
    
    try {
      await prisma.booking.create({
        data: {
          userId: faker.helpers.arrayElement(users).id,
          resourceId: faker.helpers.arrayElement(resources).id,
          startTime,
          endTime,
          purpose: faker.lorem.sentence(),
          status: 'Confirmed'
        }
      });
    } catch (error) {
      // Skip conflicting bookings
      console.log('Skipped conflicting booking');
    }
  }
  
  console.log('Seeding complete!');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## Deployment Guide

### Prerequisites

- Docker 24+ and Docker Compose
- Node.js 20 LTS
- PostgreSQL 15+
- Redis 7+
- Git

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/campus-resources.git
cd campus-resources

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# 3. Start infrastructure services
docker-compose up -d postgres redis mosquitto

# 4. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 5. Run database migrations
cd backend
npx prisma migrate dev
npx prisma generate

# 6. Seed database
npm run seed

# 7. Start development servers
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev

# Access application at http://localhost:5173
```

### Production Deployment

**Option 1: Docker Compose (Simple Deployment)**

```bash
# 1. Set production environment variables
export NODE_ENV=production
export DATABASE_URL="postgresql://..."
export REDIS_URL="redis://..."
# ... other variables

# 2. Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# 3. Run migrations
docker-compose exec api npx prisma migrate deploy

# 4. Check health
curl http://localhost:3000/health
```

**Option 2: AWS ECS (Scalable Deployment)**

```bash
# 1. Build and push Docker images
docker build -t campus-resources-api:latest ./backend
docker tag campus-resources-api:latest ${ECR_REPO}/api:latest
docker push ${ECR_REPO}/api:latest

# 2. Deploy infrastructure with Terraform
cd infrastructure/terraform
terraform init
terraform plan
terraform apply

# 3. Deploy ECS service
aws ecs update-service \
  --cluster campus-resources-cluster \
  --service campus-resources-api \
  --force-new-deployment

# 4. Run migrations
aws ecs run-task \
  --cluster campus-resources-cluster \
  --task-definition campus-resources-migrate \
  --launch-type FARGATE
```

**Option 3: Quick Deployment (Hackathon)**

```bash
# Using Railway.app
railway login
railway init
railway up

# Or using Render.com
render deploy

# Or using Vercel (frontend) + Supabase (database)
vercel deploy
# Database is automatically provisioned
```

### Monitoring and Observability

**Metrics to Track:**
- API response times (p50, p95, p99)
- Booking success rate
- Conflict detection rate
- Cache hit ratio
- Database connection pool utilization
- Queue depth (notifications)
- Error rate by endpoint
- WebSocket connection count

**Alerting Thresholds:**
- API p95 > 1 second
- Error rate > 1%
- Database connections > 80% of pool
- Queue depth > 1000 messages
- Disk usage > 85%

### Backup and Recovery

```bash
# Manual database backup
docker-compose exec postgres pg_dump -U campus_user campus_resources > backup.sql

# Restore from backup
docker-compose exec -T postgres psql -U campus_user campus_resources < backup.sql

# Automated daily backups (cron)
0 2 * * * /opt/campus-resources/scripts/backup-db.sh
```

## Hackathon Implementation Timeline

### Phase 1: Core MVP (Hours 0-16)

**Goal:** Working authentication, resource management, and basic booking

- [x] Hour 0-2: Project setup, database schema, Prisma models
- [x] Hour 2-4: OIDC authentication + local fallback
- [x] Hour 4-6: Resource CRUD API endpoints
- [x] Hour 6-10: Booking engine with conflict detection
- [x] Hour 10-12: Basic frontend (resource list, booking form)
- [x] Hour 12-14: Real-time availability (WebSocket)
- [x] Hour 14-16: User dashboard, testing

### Phase 2: Enhanced Features (Hours 16-32)

**Goal:** Faculty features, analytics, notifications

- [x] Hour 16-20: Faculty priority, recurring bookings, advance windows
- [x] Hour 20-24: Notification service with retry logic
- [x] Hour 24-28: Analytics dashboard, utilization reports
- [x] Hour 28-30: Admin panel, system configuration
- [x] Hour 30-32: Audit logging, testing

### Phase 3: Advanced Features (Hours 32-44)

**Goal:** Waitlist, equipment, search, maintenance

- [x] Hour 32-36: Waitlist management with timeout
- [x] Hour 36-38: Equipment checkout system
- [x] Hour 38-40: Search and filtering
- [x] Hour 40-42: Maintenance mode
- [x] Hour 42-44: Buffer time, concurrent modification handling

### Phase 4: Integration & Polish (Hours 44-48)

**Goal:** Demo-ready system with integrations

- [x] Hour 44-45: Mock IoT integration
- [x] Hour 45-46: Calendar export (.ics)
- [x] Hour 46-47: UI/UX polish, responsive design
- [x] Hour 47-48: Demo data, presentation preparation

## Conclusion

This design document provides a comprehensive technical blueprint for the Smart Campus Resource Management System optimized for hackathon development. The architecture balances rapid prototyping with production-ready patterns, leveraging managed services and mock integrations where appropriate.

**Key Success Factors:**
1. **Managed Services**: PostgreSQL (RDS/Supabase), Redis Cloud, SendGrid minimize setup time
2. **Proven Stack**: Node.js + Express + React + Prisma reduces learning curve
3. **Mock Integrations**: IoT, calendar, access control can be simulated for demo
4. **Property-Based Testing**: Automated verification of 29 core correctness properties
5. **Docker Compose**: Single-command deployment for development and demo
6. **Phased Implementation**: Clear 4-phase roadmap ensures working MVP early

The system successfully addresses all critical requirements while maintaining flexibility for future enhancements beyond the hackathon timeline.

