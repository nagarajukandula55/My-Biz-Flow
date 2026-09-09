/**
 * Starter service catalog for the Field Force booking system — seeded into
 * the `Service` table on first read (src/lib/fieldForce/servicesData.ts's
 * ensureServiceCatalogSeeded()) if that table is empty. Editable afterwards
 * from field-force/admin (add/edit/price/deactivate a row) without a schema
 * change.
 *
 * Deliberately spans both trades that need a trained/certified worker
 * (minSkillLevel "skilled" — electrical, plumbing, appliance repair,
 * carpentry, pest control) and everyday help that doesn't (minSkillLevel
 * "unskilled" — cleaning, moving help, laundry, gardening, errands),
 * matching how the Engineer pool onboards both classes of worker
 * (see Engineer.skillLevel). basePrice is in paise (₹1 = 100 paise).
 */
export const STARTER_SERVICES: {
  name: string;
  category: string;
  description: string;
  priceType: "fixed" | "hourly";
  basePrice: number;
  durationMinutes: number;
  minSkillLevel: "unskilled" | "skilled";
}[] = [
  // --- Electrical (skilled) ---
  { name: "Wiring / Rewiring", category: "Electrical", description: "Room or full-home wiring and rewiring.", priceType: "hourly", basePrice: 40000, durationMinutes: 120, minSkillLevel: "skilled" },
  { name: "Switchgear & MCB Installation", category: "Electrical", description: "MCB/distribution board install or replacement.", priceType: "fixed", basePrice: 60000, durationMinutes: 90, minSkillLevel: "skilled" },
  { name: "Inverter / UPS Installation", category: "Electrical", description: "Inverter/UPS setup and battery wiring.", priceType: "fixed", basePrice: 50000, durationMinutes: 90, minSkillLevel: "skilled" },
  { name: "Solar Panel Installation", category: "Electrical", description: "Rooftop solar panel mounting and wiring.", priceType: "fixed", basePrice: 250000, durationMinutes: 240, minSkillLevel: "skilled" },
  { name: "Fan Installation", category: "Electrical", description: "Ceiling/wall fan mounting and wiring.", priceType: "fixed", basePrice: 25000, durationMinutes: 45, minSkillLevel: "skilled" },
  { name: "Geyser Installation & Repair", category: "Electrical", description: "Water heater install, repair, or servicing.", priceType: "fixed", basePrice: 45000, durationMinutes: 60, minSkillLevel: "skilled" },

  // --- Appliance & Electronics (skilled) ---
  { name: "AC Installation", category: "Appliance Repair", description: "Split/window AC installation.", priceType: "fixed", basePrice: 150000, durationMinutes: 120, minSkillLevel: "skilled" },
  { name: "AC Repair & Gas Refill", category: "Appliance Repair", description: "Cooling issues, servicing, and gas top-up.", priceType: "fixed", basePrice: 60000, durationMinutes: 60, minSkillLevel: "skilled" },
  { name: "TV Repair", category: "Appliance Repair", description: "Diagnosis and repair of TV faults.", priceType: "fixed", basePrice: 40000, durationMinutes: 60, minSkillLevel: "skilled" },
  { name: "Refrigerator Repair", category: "Appliance Repair", description: "Cooling, compressor, and gas-related repair.", priceType: "fixed", basePrice: 55000, durationMinutes: 60, minSkillLevel: "skilled" },
  { name: "Washing Machine Repair", category: "Appliance Repair", description: "Diagnosis and repair of washer faults.", priceType: "fixed", basePrice: 45000, durationMinutes: 60, minSkillLevel: "skilled" },
  { name: "Microwave / Oven Repair", category: "Appliance Repair", description: "Diagnosis and repair of microwave/OTG faults.", priceType: "fixed", basePrice: 35000, durationMinutes: 45, minSkillLevel: "skilled" },
  { name: "CCTV Installation", category: "Appliance Repair", description: "Camera mounting, cabling, and DVR setup.", priceType: "fixed", basePrice: 200000, durationMinutes: 180, minSkillLevel: "skilled" },
  { name: "Water Purifier (RO) Installation & Repair", category: "Appliance Repair", description: "RO install, filter change, or repair.", priceType: "fixed", basePrice: 40000, durationMinutes: 45, minSkillLevel: "skilled" },

  // --- Plumbing (skilled) ---
  { name: "Tap & Faucet Repair", category: "Plumbing", description: "Leaky or broken tap repair/replacement.", priceType: "fixed", basePrice: 20000, durationMinutes: 30, minSkillLevel: "skilled" },
  { name: "Pipe Leak Repair", category: "Plumbing", description: "Locating and fixing pipe leaks.", priceType: "fixed", basePrice: 35000, durationMinutes: 60, minSkillLevel: "skilled" },
  { name: "Toilet / Flush Tank Repair", category: "Plumbing", description: "Flush tank, cistern, or toilet fitting repair.", priceType: "fixed", basePrice: 30000, durationMinutes: 45, minSkillLevel: "skilled" },
  { name: "Bathroom Fitting Installation", category: "Plumbing", description: "Sink, shower, or fitting installation.", priceType: "fixed", basePrice: 50000, durationMinutes: 90, minSkillLevel: "skilled" },

  // --- Carpentry (skilled) ---
  { name: "Furniture Assembly", category: "Carpentry", description: "Flat-pack or modular furniture assembly.", priceType: "fixed", basePrice: 30000, durationMinutes: 60, minSkillLevel: "skilled" },
  { name: "Furniture Repair", category: "Carpentry", description: "Repair of doors, drawers, hinges, and joints.", priceType: "fixed", basePrice: 35000, durationMinutes: 60, minSkillLevel: "skilled" },
  { name: "Door / Window Fitting", category: "Carpentry", description: "New door/window fitting or alignment fix.", priceType: "fixed", basePrice: 50000, durationMinutes: 90, minSkillLevel: "skilled" },

  // --- Painting (skilled) ---
  { name: "Wall Painting (per room)", category: "Painting", description: "Full room painting, prep included.", priceType: "fixed", basePrice: 350000, durationMinutes: 480, minSkillLevel: "skilled" },
  { name: "Touch-up Painting", category: "Painting", description: "Small area/patch touch-up painting.", priceType: "fixed", basePrice: 80000, durationMinutes: 120, minSkillLevel: "skilled" },

  // --- Pest Control (skilled) ---
  { name: "General Pest Control", category: "Pest Control", description: "Cockroach/ant/general pest treatment.", priceType: "fixed", basePrice: 90000, durationMinutes: 90, minSkillLevel: "skilled" },
  { name: "Termite Treatment", category: "Pest Control", description: "Anti-termite treatment for home/furniture.", priceType: "fixed", basePrice: 150000, durationMinutes: 120, minSkillLevel: "skilled" },
  { name: "Bed Bug Treatment", category: "Pest Control", description: "Bed bug fumigation/treatment.", priceType: "fixed", basePrice: 120000, durationMinutes: 90, minSkillLevel: "skilled" },

  // --- Home Cleaning (unskilled) ---
  { name: "Home Deep Cleaning", category: "Cleaning", description: "Full-home deep cleaning, kitchen & bathrooms included.", priceType: "fixed", basePrice: 250000, durationMinutes: 240, minSkillLevel: "unskilled" },
  { name: "Bathroom Cleaning", category: "Cleaning", description: "Deep clean of one bathroom.", priceType: "fixed", basePrice: 60000, durationMinutes: 60, minSkillLevel: "unskilled" },
  { name: "Kitchen Cleaning", category: "Cleaning", description: "Deep clean of kitchen, chimney exterior, and cabinets.", priceType: "fixed", basePrice: 80000, durationMinutes: 90, minSkillLevel: "unskilled" },
  { name: "Sofa / Carpet Cleaning", category: "Cleaning", description: "Shampoo cleaning of sofa or carpet.", priceType: "fixed", basePrice: 90000, durationMinutes: 90, minSkillLevel: "unskilled" },
  { name: "Regular Housekeeping (per visit)", category: "Cleaning", description: "Routine sweeping, mopping, dusting.", priceType: "hourly", basePrice: 15000, durationMinutes: 60, minSkillLevel: "unskilled" },

  // --- Home Help / Moving (unskilled) ---
  { name: "Packing & Moving Help", category: "Home Help", description: "Loading/unloading and packing assistance.", priceType: "hourly", basePrice: 20000, durationMinutes: 120, minSkillLevel: "unskilled" },
  { name: "Laundry Pickup & Delivery", category: "Home Help", description: "Wash, fold/iron, and delivery.", priceType: "fixed", basePrice: 30000, durationMinutes: 30, minSkillLevel: "unskilled" },
  { name: "Gardening / Lawn Care", category: "Home Help", description: "Lawn mowing, trimming, and general upkeep.", priceType: "hourly", basePrice: 18000, durationMinutes: 90, minSkillLevel: "unskilled" },
  { name: "Cooking Help (per visit)", category: "Home Help", description: "Meal prep assistance at home.", priceType: "hourly", basePrice: 20000, durationMinutes: 120, minSkillLevel: "unskilled" },
  { name: "Errand / Delivery Assistance", category: "Home Help", description: "Grocery runs, pickups, and small errands.", priceType: "hourly", basePrice: 15000, durationMinutes: 60, minSkillLevel: "unskilled" },

  // --- Beauty & Wellness at Home (skilled) ---
  { name: "Salon at Home — Haircut", category: "Beauty & Wellness", description: "Haircut service at customer's home.", priceType: "fixed", basePrice: 40000, durationMinutes: 45, minSkillLevel: "skilled" },
  { name: "Salon at Home — Facial", category: "Beauty & Wellness", description: "Facial service at customer's home.", priceType: "fixed", basePrice: 70000, durationMinutes: 60, minSkillLevel: "skilled" },
  { name: "Massage Therapy at Home", category: "Beauty & Wellness", description: "Full-body relaxation massage at home.", priceType: "fixed", basePrice: 90000, durationMinutes: 60, minSkillLevel: "skilled" },
];
