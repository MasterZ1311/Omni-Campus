-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "sso_provider" TEXT NOT NULL,
    "sso_id" TEXT,
    "password_hash" TEXT,
    "last_login" DATETIME,
    "preferences" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacity" INTEGER,
    "location" TEXT NOT NULL,
    "amenities" TEXT,
    "buffer_minutes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Available',
    "managed_by" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "resources_managed_by_fkey" FOREIGN KEY ("managed_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "resource_images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resource_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size_kb" INTEGER NOT NULL,
    "is_floor_plan" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resource_images_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Confirmed',
    "recurrence_pattern" TEXT NOT NULL DEFAULT 'None',
    "recurrence_group_id" TEXT,
    "is_late_cancellation" BOOLEAN NOT NULL DEFAULT false,
    "cancellation_reason" TEXT,
    "cancelled_at" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bookings_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "booking_modifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "booking_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "old_value" TEXT NOT NULL,
    "new_value" TEXT NOT NULL,
    "modified_by" TEXT NOT NULL,
    "modified_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "booking_modifications_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "desired_start_time" DATETIME NOT NULL,
    "desired_end_time" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "notified_at" DATETIME,
    "expires_at" DATETIME,
    "position" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "waitlist_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "waitlist_entries_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "equipment_checkouts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "linked_booking_id" TEXT,
    "checkout_time" DATETIME NOT NULL,
    "expected_return_time" DATETIME NOT NULL,
    "actual_return_time" DATETIME,
    "condition_at_checkout" TEXT,
    "condition_at_return" TEXT,
    "is_overdue" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "equipment_checkouts_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "resources" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "equipment_checkouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "equipment_checkouts_linked_booking_id_fkey" FOREIGN KEY ("linked_booking_id") REFERENCES "bookings" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "iot_sensors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resource_id" TEXT NOT NULL,
    "sensor_type" TEXT NOT NULL,
    "mqtt_topic" TEXT,
    "last_reading" TEXT,
    "last_communication" DATETIME,
    "is_online" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "iot_sensors_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "iot_readings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sensor_id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "recorded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "iot_readings_sensor_id_fkey" FOREIGN KEY ("sensor_id") REFERENCES "iot_sensors" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "maintenance_schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resource_id" TEXT NOT NULL,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "maintenance_schedules_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "sent_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "changes" TEXT,
    "ip_address" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_config" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" DATETIME NOT NULL,
    "updated_by" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_sso_id_key" ON "users"("sso_id");

-- CreateIndex
CREATE INDEX "resources_type_status_idx" ON "resources"("type", "status");

-- CreateIndex
CREATE INDEX "resources_deleted_at_idx" ON "resources"("deleted_at");

-- CreateIndex
CREATE INDEX "bookings_resource_id_start_time_end_time_idx" ON "bookings"("resource_id", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "bookings_user_id_start_time_idx" ON "bookings"("user_id", "start_time");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "waitlist_entries_resource_id_status_position_idx" ON "waitlist_entries"("resource_id", "status", "position");

-- CreateIndex
CREATE INDEX "equipment_checkouts_user_id_actual_return_time_idx" ON "equipment_checkouts"("user_id", "actual_return_time");

-- CreateIndex
CREATE INDEX "iot_readings_sensor_id_recorded_at_idx" ON "iot_readings"("sensor_id", "recorded_at");

-- CreateIndex
CREATE INDEX "notifications_status_created_at_idx" ON "notifications"("status", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");
