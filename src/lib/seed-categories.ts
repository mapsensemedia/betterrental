/**
 * Fleet Category Seed Data
 * Contains category definitions and sample VIN/vehicle data
 */

// Category images
import mysteryCar from "@/assets/categories/mystery-car.jpg";
import economyVersa from "@/assets/categories/economy-versa.jpg";
import midsizeCorolla from "@/assets/categories/midsize-corolla.jpg";
import fullsizeCamry from "@/assets/categories/fullsize-camry.jpg";
import midsizeSuvRav4 from "@/assets/categories/midsize-suv-rav4.jpg";
import suvFordEdge from "@/assets/categories/suv-ford-edge.jpg";
import minivanPacifica from "@/assets/categories/minivan-pacifica.jpg";
import largeSuvDurango from "@/assets/categories/large-suv-durango.jpg";

export interface CategorySeedData {
  name: string;
  description: string;
  image: string;
  vehicles: Array<{
    make: string;
    model: string;
    year: number;
    vin: string;
    licensePlate: string;
    acquisitionCost: number;
    currentMileage: number;
  }>;
}

export const FLEET_CATEGORIES: CategorySeedData[] = [
  {
    name: "Mystery Car",
    description: "Surprise vehicle - you won't know what you'll get until pickup!",
    image: mysteryCar,
    vehicles: [
      { make: "Various", model: "Mystery", year: 2024, vin: "MYST001A2024FLEET", licensePlate: "MYS-001", acquisitionCost: 15000, currentMileage: 5200 },
      { make: "Various", model: "Mystery", year: 2023, vin: "MYST002B2023FLEET", licensePlate: "MYS-002", acquisitionCost: 12000, currentMileage: 18500 },
      { make: "Various", model: "Mystery", year: 2024, vin: "MYST003C2024FLEET", licensePlate: "MYS-003", acquisitionCost: 14000, currentMileage: 3100 },
    ],
  },
  {
    name: "Economy Car - Versa or Similar",
    description: "Budget-friendly compact sedan, perfect for city driving and fuel efficiency.",
    image: economyVersa,
    vehicles: [
      { make: "Nissan", model: "Versa", year: 2024, vin: "3N1CN8DV5RL123456", licensePlate: "ECO-101", acquisitionCost: 18500, currentMileage: 12400 },
      { make: "Nissan", model: "Versa", year: 2024, vin: "3N1CN8DV5RL654321", licensePlate: "ECO-102", acquisitionCost: 18500, currentMileage: 8900 },
      { make: "Kia", model: "Rio", year: 2023, vin: "3KPA24AD1PE112233", licensePlate: "ECO-103", acquisitionCost: 17200, currentMileage: 21300 },
      { make: "Hyundai", model: "Accent", year: 2024, vin: "KMHCT4AE7PU445566", licensePlate: "ECO-104", acquisitionCost: 17800, currentMileage: 6700 },
    ],
  },
  {
    name: "Mid Size Car - Corolla or Similar",
    description: "Reliable mid-size sedan with excellent fuel economy and comfort.",
    image: midsizeCorolla,
    vehicles: [
      { make: "Toyota", model: "Corolla", year: 2024, vin: "JTDEPRAE5LJ778899", licensePlate: "MID-201", acquisitionCost: 24000, currentMileage: 15600 },
      { make: "Toyota", model: "Corolla", year: 2024, vin: "JTDEPRAE5LJ998877", licensePlate: "MID-202", acquisitionCost: 24000, currentMileage: 9200 },
      { make: "Honda", model: "Civic", year: 2023, vin: "2HGFC2F59PH556677", licensePlate: "MID-203", acquisitionCost: 25500, currentMileage: 28400 },
      { make: "Mazda", model: "Mazda3", year: 2024, vin: "3MZBPAFM5RM334455", licensePlate: "MID-204", acquisitionCost: 26200, currentMileage: 4300 },
      { make: "Hyundai", model: "Elantra", year: 2024, vin: "5NPLM4AG5RH223344", licensePlate: "MID-205", acquisitionCost: 23800, currentMileage: 11800 },
    ],
  },
  {
    name: "Full Size Car - Camry or Similar",
    description: "Spacious full-size sedan with premium comfort for longer trips.",
    image: fullsizeCamry,
    vehicles: [
      { make: "Toyota", model: "Camry", year: 2024, vin: "4T1BZ1HK5RU112233", licensePlate: "FUL-301", acquisitionCost: 32000, currentMileage: 18200 },
      { make: "Toyota", model: "Camry", year: 2024, vin: "4T1BZ1HK5RU445566", licensePlate: "FUL-302", acquisitionCost: 32000, currentMileage: 7500 },
      { make: "Honda", model: "Accord", year: 2024, vin: "1HGCV1F34RA778899", licensePlate: "FUL-303", acquisitionCost: 33500, currentMileage: 12100 },
      { make: "Nissan", model: "Altima", year: 2023, vin: "1N4BL4DV5RC667788", licensePlate: "FUL-304", acquisitionCost: 29800, currentMileage: 31200 },
    ],
  },
  {
    name: "Mid Size SUV - RAV4 or Similar",
    description: "Versatile crossover SUV with ample cargo space and all-weather capability.",
    image: midsizeSuvRav4,
    vehicles: [
      { make: "Toyota", model: "RAV4", year: 2024, vin: "2T3P1RFV8RC123456", licensePlate: "MSU-401", acquisitionCost: 36000, currentMileage: 14800 },
      { make: "Toyota", model: "RAV4", year: 2024, vin: "2T3P1RFV8RC654321", licensePlate: "MSU-402", acquisitionCost: 36000, currentMileage: 8900 },
      { make: "Honda", model: "CR-V", year: 2024, vin: "7FARS6H51RE112233", licensePlate: "MSU-403", acquisitionCost: 37200, currentMileage: 11200 },
      { make: "Mazda", model: "CX-5", year: 2023, vin: "JM3KFBDM5P1445566", licensePlate: "MSU-404", acquisitionCost: 34500, currentMileage: 24600 },
      { make: "Hyundai", model: "Tucson", year: 2024, vin: "5NMJFDAE5RH778899", licensePlate: "MSU-405", acquisitionCost: 35000, currentMileage: 6100 },
    ],
  },
  {
    name: "SUV - Ford Edge or Similar",
    description: "Full-size two-row SUV with powerful performance and premium features.",
    image: suvFordEdge,
    vehicles: [
      { make: "Ford", model: "Edge", year: 2024, vin: "2FMPK4K98RBA11223", licensePlate: "SUV-501", acquisitionCost: 42000, currentMileage: 16400 },
      { make: "Ford", model: "Edge", year: 2023, vin: "2FMPK4K98RBA44556", licensePlate: "SUV-502", acquisitionCost: 39500, currentMileage: 28900 },
      { make: "Chevrolet", model: "Blazer", year: 2024, vin: "3GNKBKRS4RS778899", licensePlate: "SUV-503", acquisitionCost: 43500, currentMileage: 9800 },
      { make: "Jeep", model: "Grand Cherokee", year: 2024, vin: "1C4RJKBG5R8112233", licensePlate: "SUV-504", acquisitionCost: 48000, currentMileage: 12300 },
    ],
  },
  {
    name: "Minivan - Pacifica or Similar",
    description: "Family-friendly minivan with seating for 7-8 and entertainment options.",
    image: minivanPacifica,
    vehicles: [
      { make: "Chrysler", model: "Pacifica", year: 2024, vin: "2C4RC1EG5RR123456", licensePlate: "VAN-601", acquisitionCost: 45000, currentMileage: 21500 },
      { make: "Chrysler", model: "Pacifica", year: 2024, vin: "2C4RC1EG5RR654321", licensePlate: "VAN-602", acquisitionCost: 45000, currentMileage: 14200 },
      { make: "Honda", model: "Odyssey", year: 2023, vin: "5FNRL6H54PB112233", licensePlate: "VAN-603", acquisitionCost: 47500, currentMileage: 32100 },
      { make: "Toyota", model: "Sienna", year: 2024, vin: "5TDKRKEC5RS445566", licensePlate: "VAN-604", acquisitionCost: 48000, currentMileage: 8700 },
    ],
  },
  {
    name: "Large SUV 7 Seater - Durango or Similar",
    description: "Powerful 3-row SUV with seating for 7 and towing capability.",
    image: largeSuvDurango,
    vehicles: [
      { make: "Dodge", model: "Durango", year: 2024, vin: "1C4RDJDG5RC123456", licensePlate: "LRG-701", acquisitionCost: 52000, currentMileage: 19800 },
      { make: "Dodge", model: "Durango", year: 2024, vin: "1C4RDJDG5RC654321", licensePlate: "LRG-702", acquisitionCost: 52000, currentMileage: 11400 },
      { make: "Chevrolet", model: "Tahoe", year: 2024, vin: "1GNSKBKD5RR778899", licensePlate: "LRG-703", acquisitionCost: 58000, currentMileage: 8200 },
      { make: "Ford", model: "Expedition", year: 2023, vin: "1FMJU1JT8REA11223", licensePlate: "LRG-704", acquisitionCost: 55000, currentMileage: 26500 },
      { make: "Toyota", model: "Sequoia", year: 2024, vin: "5TDBY5G18RS334455", licensePlate: "LRG-705", acquisitionCost: 62000, currentMileage: 5900 },
    ],
  },
];

// Get all category names for quick reference
export const CATEGORY_NAMES = FLEET_CATEGORIES.map((c) => c.name);

// Get total vehicle count
export const TOTAL_FLEET_SIZE = FLEET_CATEGORIES.reduce(
  (sum, cat) => sum + cat.vehicles.length,
  0
);
