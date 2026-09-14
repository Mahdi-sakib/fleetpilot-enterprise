// Registry driving the generic Master Data page (src/pages/MasterData.jsx)
// and the Master Data sidebar section (src/components/Layout.jsx). Adding a
// new master data type only needs an entry here plus an entity definition
// in server/src/entities.js — no new page or route required.

export const MASTER_DATA_TYPES = [
  {
    slug: 'locations',
    entity: 'Location',
    label: 'Locations',
    singular: 'Location',
    description: 'Depots, hubs and customer sites — pick these when setting a vehicle’s current location.',
    fields: [
      { key: 'name', label: 'Name', required: true, placeholder: 'Dhaka Central Depot' },
      { key: 'type', label: 'Type', type: 'select', default: 'depot', options: ['depot', 'hub', 'customer_site', 'warehouse', 'other'] },
      { key: 'address', label: 'Address' },
      { key: 'city', label: 'City' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'type', label: 'Type', format: humanize },
      { key: 'city', label: 'City' },
      { key: 'address', label: 'Address' },
    ],
  },
  {
    slug: 'fuel-stations',
    entity: 'FuelStation',
    label: 'Fuel Stations',
    singular: 'Fuel Station',
    description: 'Named fuel stations to choose from when logging a fuel purchase.',
    fields: [
      { key: 'name', label: 'Name', required: true, placeholder: 'Padma Fuel — Gulshan' },
      { key: 'brand', label: 'Brand', placeholder: 'Padma Oil' },
      { key: 'address', label: 'Address' },
      { key: 'city', label: 'City' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'brand', label: 'Brand' },
      { key: 'city', label: 'City' },
      { key: 'address', label: 'Address' },
    ],
  },
  {
    slug: 'vehicle-types',
    entity: 'VehicleType',
    label: 'Vehicle Types',
    singular: 'Vehicle Type',
    description: 'The vehicle types offered when adding or editing a vehicle.',
    fields: [
      { key: 'name', label: 'Display name', required: true, placeholder: 'Box Truck' },
      { key: 'code', label: 'Code', required: true, placeholder: 'box_truck', hint: 'Lowercase, underscores only — stored on each vehicle record.' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code', mono: true },
    ],
  },
  {
    slug: 'fuel-types',
    entity: 'FuelType',
    label: 'Fuel Types',
    singular: 'Fuel Type',
    description: 'The fuel types offered when adding or editing a vehicle.',
    fields: [
      { key: 'name', label: 'Display name', required: true, placeholder: 'Diesel' },
      { key: 'code', label: 'Code', required: true, placeholder: 'diesel', hint: 'Lowercase, underscores only — stored on each vehicle record.' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code', mono: true },
    ],
  },
  {
    slug: 'cost-centers',
    entity: 'CostCenter',
    label: 'Cost Centers',
    singular: 'Cost Center',
    description: 'Customers, cost centers or departments to tag trips against for billing and chargebacks.',
    fields: [
      { key: 'name', label: 'Name', required: true, placeholder: 'Acme Corp' },
      { key: 'code', label: 'Code', placeholder: 'ACME-01' },
      { key: 'type', label: 'Type', type: 'select', default: 'cost_center', options: ['cost_center', 'customer', 'department'] },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code', mono: true },
      { key: 'type', label: 'Type', format: humanize },
    ],
  },
];

function humanize(value) {
  return value ? value.replace(/_/g, ' ') : value;
}

export const getMasterConfig = (slug) => MASTER_DATA_TYPES.find((m) => m.slug === slug);
