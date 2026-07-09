-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN "gps_latitude" REAL;
ALTER TABLE "vehicles" ADD COLUMN "gps_longitude" REAL;
ALTER TABLE "vehicles" ADD COLUMN "gps_updated_at" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_transport_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "pickup_location" TEXT NOT NULL,
    "dropoff_location" TEXT NOT NULL,
    "requested_time" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "passenger_count" INTEGER NOT NULL DEFAULT 1,
    "campus_zone" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "transport_requests_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_transport_requests" ("created_at", "dropoff_location", "id", "passenger_count", "pickup_location", "requested_time", "status", "updated_at", "user_id", "vehicle_id") SELECT "created_at", "dropoff_location", "id", "passenger_count", "pickup_location", "requested_time", "status", "updated_at", "user_id", "vehicle_id" FROM "transport_requests";
DROP TABLE "transport_requests";
ALTER TABLE "new_transport_requests" RENAME TO "transport_requests";
CREATE TABLE "new_vehicle_schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicle_id" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "current_stop" TEXT,
    "estimated_arrival" DATETIME,
    "passenger_load" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "vehicle_schedules_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_vehicle_schedules" ("created_at", "end_time", "id", "route", "start_time", "updated_at", "vehicle_id") SELECT "created_at", "end_time", "id", "route", "start_time", "updated_at", "vehicle_id" FROM "vehicle_schedules";
DROP TABLE "vehicle_schedules";
ALTER TABLE "new_vehicle_schedules" RENAME TO "vehicle_schedules";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
