import { z } from 'zod';

// Single source of truth for every domain entity: its table name, its SQL
// column definitions (for migrations), and the zod schema used to validate
// create/update payloads.

const optionalString = () => z.string().nullable().optional();
const optionalNumber = () => z.number().nullable().optional();
const optionalInt = () => z.number().int().nullable().optional();

export const entities = {
  Vehicle: {
    table: 'vehicles',
    columns: `
      id TEXT PRIMARY KEY,
      plate_number TEXT NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER,
      vin TEXT,
      type TEXT NOT NULL DEFAULT 'van',
      status TEXT NOT NULL DEFAULT 'active',
      odometer INTEGER NOT NULL DEFAULT 0,
      fuel_type TEXT NOT NULL DEFAULT 'diesel',
      purchase_date TEXT,
      purchase_cost REAL,
      last_service_odometer INTEGER NOT NULL DEFAULT 0,
      service_interval_km INTEGER NOT NULL DEFAULT 10000,
      assigned_driver_id TEXT,
      location TEXT,
      fuel_level REAL,
      current_speed REAL,
      engine_temp REAL,
      last_ping TEXT,
      created_date TEXT NOT NULL,
      updated_date TEXT NOT NULL
    `,
    indexes: ['status', 'assigned_driver_id'],
    schema: z.object({
      plate_number: z.string().min(1),
      make: z.string().min(1),
      model: z.string().min(1),
      year: optionalInt(),
      vin: optionalString(),
      // Type/fuel type are backed by the VehicleType/FuelType master data
      // tables (seeded with these same defaults) rather than a fixed enum,
      // so admins can add new ones from Master Data without a code change.
      type: z.string().min(1).optional(),
      status: z.enum(['active', 'idle', 'maintenance', 'retired']).optional(),
      odometer: optionalInt(),
      fuel_type: z.string().min(1).optional(),
      purchase_date: optionalString(),
      purchase_cost: optionalNumber(),
      last_service_odometer: optionalInt(),
      service_interval_km: optionalInt(),
      assigned_driver_id: optionalString(),
      location: optionalString(),
      fuel_level: optionalNumber(),
      current_speed: optionalNumber(),
      engine_temp: optionalNumber(),
      last_ping: optionalString(),
    }),
    defaults: { type: 'van', status: 'active', odometer: 0, fuel_type: 'diesel', last_service_odometer: 0, service_interval_km: 10000 },
  },

  Driver: {
    table: 'drivers',
    columns: `
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      license_number TEXT,
      license_expiry TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      safety_score REAL NOT NULL DEFAULT 100,
      total_trips INTEGER NOT NULL DEFAULT 0,
      created_date TEXT NOT NULL,
      updated_date TEXT NOT NULL
    `,
    indexes: ['status', 'email'],
    schema: z.object({
      full_name: z.string().min(1),
      email: z.string().email(),
      phone: optionalString(),
      license_number: optionalString(),
      license_expiry: optionalString(),
      status: z.enum(['active', 'suspended', 'inactive']).optional(),
      safety_score: optionalNumber(),
      total_trips: optionalInt(),
    }),
    defaults: { status: 'active', safety_score: 100, total_trips: 0 },
  },

  Trip: {
    table: 'trips',
    columns: `
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      driver_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'assigned',
      start_time TEXT,
      end_time TEXT,
      start_odometer INTEGER,
      end_odometer INTEGER,
      distance_km REAL,
      origin TEXT,
      destination TEXT,
      notes TEXT,
      cost_center TEXT,
      created_date TEXT NOT NULL,
      updated_date TEXT NOT NULL
    `,
    indexes: ['vehicle_id', 'driver_id', 'status'],
    schema: z.object({
      vehicle_id: z.string().min(1),
      driver_id: z.string().min(1),
      status: z.enum(['assigned', 'in_progress', 'completed']).optional(),
      start_time: optionalString(),
      end_time: optionalString(),
      start_odometer: optionalInt(),
      end_odometer: optionalInt(),
      distance_km: optionalNumber(),
      origin: optionalString(),
      destination: optionalString(),
      notes: optionalString(),
      cost_center: optionalString(),
    }),
    defaults: { status: 'assigned' },
  },

  FuelLog: {
    table: 'fuel_logs',
    columns: `
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      driver_id TEXT,
      log_date TEXT,
      liters REAL NOT NULL,
      cost REAL NOT NULL,
      odometer INTEGER,
      station TEXT,
      receipt_url TEXT,
      created_date TEXT NOT NULL,
      updated_date TEXT NOT NULL
    `,
    indexes: ['vehicle_id', 'log_date'],
    schema: z.object({
      vehicle_id: z.string().min(1),
      driver_id: optionalString(),
      log_date: optionalString(),
      liters: z.number(),
      cost: z.number(),
      odometer: optionalInt(),
      station: optionalString(),
      receipt_url: optionalString(),
    }),
    defaults: {},
  },

  WorkOrder: {
    table: 'work_orders',
    columns: `
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'preventive',
      status TEXT NOT NULL DEFAULT 'open',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      odometer_due INTEGER,
      completed_date TEXT,
      cost REAL,
      notes TEXT,
      created_date TEXT NOT NULL,
      updated_date TEXT NOT NULL
    `,
    indexes: ['vehicle_id', 'status'],
    schema: z.object({
      vehicle_id: z.string().min(1),
      title: z.string().min(1),
      type: z.enum(['preventive', 'repair', 'inspection']).optional(),
      status: z.enum(['open', 'in_progress', 'completed']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      due_date: optionalString(),
      odometer_due: optionalInt(),
      completed_date: optionalString(),
      cost: optionalNumber(),
      notes: optionalString(),
    }),
    defaults: { type: 'preventive', status: 'open', priority: 'medium' },
  },

  DefectReport: {
    table: 'defect_reports',
    columns: `
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      driver_id TEXT,
      report_date TEXT,
      severity TEXT NOT NULL DEFAULT 'low',
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_date TEXT NOT NULL,
      updated_date TEXT NOT NULL
    `,
    indexes: ['vehicle_id', 'status', 'report_date'],
    schema: z.object({
      vehicle_id: z.string().min(1),
      driver_id: optionalString(),
      report_date: optionalString(),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      title: z.string().min(1),
      description: optionalString(),
      status: z.enum(['open', 'in_progress', 'resolved']).optional(),
    }),
    defaults: { severity: 'low', status: 'open' },
  },

  // --- Master data: admin-managed reference lists, all through the same
  // generic entity CRUD routes as the operational entities above. ---

  Location: {
    table: 'locations',
    columns: `
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'depot',
      address TEXT,
      city TEXT,
      notes TEXT,
      created_date TEXT NOT NULL,
      updated_date TEXT NOT NULL
    `,
    indexes: ['type'],
    schema: z.object({
      name: z.string().min(1),
      type: z.enum(['depot', 'hub', 'customer_site', 'warehouse', 'other']).optional(),
      address: optionalString(),
      city: optionalString(),
      notes: optionalString(),
    }),
    defaults: { type: 'depot' },
  },

  FuelStation: {
    table: 'fuel_stations',
    columns: `
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT,
      address TEXT,
      city TEXT,
      notes TEXT,
      created_date TEXT NOT NULL,
      updated_date TEXT NOT NULL
    `,
    indexes: [],
    schema: z.object({
      name: z.string().min(1),
      brand: optionalString(),
      address: optionalString(),
      city: optionalString(),
      notes: optionalString(),
    }),
    defaults: {},
  },

  VehicleType: {
    table: 'vehicle_types',
    columns: `
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      notes TEXT,
      created_date TEXT NOT NULL,
      updated_date TEXT NOT NULL
    `,
    indexes: ['code'],
    schema: z.object({
      name: z.string().min(1),
      code: z.string().min(1),
      notes: optionalString(),
    }),
    defaults: {},
  },

  FuelType: {
    table: 'fuel_types',
    columns: `
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      notes TEXT,
      created_date TEXT NOT NULL,
      updated_date TEXT NOT NULL
    `,
    indexes: ['code'],
    schema: z.object({
      name: z.string().min(1),
      code: z.string().min(1),
      notes: optionalString(),
    }),
    defaults: {},
  },

  CostCenter: {
    table: 'cost_centers',
    columns: `
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT,
      type TEXT NOT NULL DEFAULT 'cost_center',
      notes TEXT,
      created_date TEXT NOT NULL,
      updated_date TEXT NOT NULL
    `,
    indexes: ['type'],
    schema: z.object({
      name: z.string().min(1),
      code: optionalString(),
      type: z.enum(['cost_center', 'customer', 'department']).optional(),
      notes: optionalString(),
    }),
    defaults: { type: 'cost_center' },
  },
};

export const entityNames = Object.keys(entities);

// Seeds so existing vehicle type/fuel type values (previously a fixed enum)
// keep resolving to a real master row after the switch to admin-editable
// lists — inserted once, only when the table is empty.
export const seedData = {
  VehicleType: [
    { name: 'Van', code: 'van' },
    { name: 'Box Truck', code: 'box_truck' },
    { name: 'Semi Truck', code: 'semi_truck' },
    { name: 'Reefer Truck', code: 'reefer_truck' },
    { name: 'Sedan', code: 'sedan' },
    { name: 'SUV', code: 'suv' },
  ],
  FuelType: [
    { name: 'Diesel', code: 'diesel' },
    { name: 'Gasoline', code: 'gasoline' },
    { name: 'Electric', code: 'electric' },
    { name: 'Hybrid', code: 'hybrid' },
  ],
};
