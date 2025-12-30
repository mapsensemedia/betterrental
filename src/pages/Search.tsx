import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Filter, SlidersHorizontal, Grid, List, ArrowUpDown } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { VehicleCard } from "@/components/landing/VehicleCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";

import bmwImage from "@/assets/cars/bmw-i4.jpg";
import audiImage from "@/assets/cars/audi-a7.jpg";
import porscheImage from "@/assets/cars/porsche-911.jpg";
import gleImage from "@/assets/cars/mercedes-gle.jpg";

const vehicles = [
  {
    id: "1",
    make: "BMW",
    model: "i4 M50",
    year: 2024,
    category: "Electric",
    dailyRate: 280,
    imageUrl: bmwImage,
    seats: 5,
    fuelType: "Electric",
    transmission: "Automatic",
    isFeatured: true,
  },
  {
    id: "2",
    make: "Audi",
    model: "A7",
    year: 2024,
    category: "Luxury",
    dailyRate: 320,
    imageUrl: audiImage,
    seats: 5,
    fuelType: "Hybrid",
    transmission: "Automatic",
  },
  {
    id: "3",
    make: "Mercedes-Benz",
    model: "GLE 450",
    year: 2024,
    category: "SUV",
    dailyRate: 380,
    imageUrl: gleImage,
    seats: 7,
    fuelType: "Hybrid",
    transmission: "Automatic",
  },
  {
    id: "4",
    make: "Porsche",
    model: "911 Carrera",
    year: 2024,
    category: "Sports",
    dailyRate: 550,
    imageUrl: porscheImage,
    seats: 2,
    fuelType: "Petrol",
    transmission: "Automatic",
    isFeatured: true,
  },
  {
    id: "5",
    make: "Mercedes-Benz",
    model: "AMG GT",
    year: 2024,
    category: "Sports",
    dailyRate: 450,
    seats: 2,
    fuelType: "Petrol",
    transmission: "Automatic",
  },
  {
    id: "6",
    make: "Tesla",
    model: "Model S Plaid",
    year: 2024,
    category: "Electric",
    dailyRate: 420,
    seats: 5,
    fuelType: "Electric",
    transmission: "Automatic",
  },
];

const categories = ["All", "Sports", "Luxury", "SUV", "Electric", "Exotic"];
const makes = ["All", "Mercedes-Benz", "BMW", "Audi", "Porsche", "Tesla"];
const fuelTypes = ["All", "Petrol", "Electric", "Hybrid"];

export default function Search() {
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "All");
  const [priceRange, setPriceRange] = useState([100, 1000]);
  const [sortBy, setSortBy] = useState("recommended");
  const [compareList, setCompareList] = useState<string[]>([]);

  const toggleCompare = (id: string) => {
    setCompareList((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 3
        ? [...prev, id]
        : prev
    );
  };

  const filteredVehicles = vehicles.filter(
    (v) =>
      (selectedCategory === "All" || v.category === selectedCategory) &&
      v.dailyRate >= priceRange[0] &&
      v.dailyRate <= priceRange[1]
  );

  return (
    <CustomerLayout>
      <PageContainer className="pt-28">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="heading-2 mb-2">Browse Vehicles</h1>
            <p className="text-muted-foreground">
              {filteredVehicles.length} vehicles available
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Compare Button */}
            {compareList.length > 1 && (
              <Button variant="default" asChild>
                <Link to={`/compare?ids=${compareList.join(",")}`}>
                  Compare ({compareList.length})
                </Link>
              </Button>
            )}

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="hidden md:flex border border-border rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded ${viewMode === "grid" ? "bg-primary text-primary-foreground" : ""}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${viewMode === "list" ? "bg-primary text-primary-foreground" : ""}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Filter */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>
                    Refine your search results
                  </SheetDescription>
                </SheetHeader>
                <FilterContent
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  priceRange={priceRange}
                  setPriceRange={setPriceRange}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden md:block w-64 shrink-0">
            <div className="sticky top-28 space-y-6">
              <FilterContent
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
              />
            </div>
          </aside>

          {/* Results Grid */}
          <div className="flex-1">
            {/* Category Pills */}
            <div className="flex gap-2 flex-wrap mb-6">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Vehicle Grid */}
            <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
              {filteredVehicles.map((vehicle) => (
                <div key={vehicle.id} className="relative">
                  <VehicleCard {...vehicle} />
                  {/* Compare Checkbox */}
                  <button
                    onClick={() => toggleCompare(vehicle.id)}
                    className={`absolute top-4 right-14 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      compareList.includes(vehicle.id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-card/80 text-foreground hover:bg-card"
                    }`}
                  >
                    <Checkbox checked={compareList.includes(vehicle.id)} />
                  </button>
                </div>
              ))}
            </div>

            {filteredVehicles.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground">No vehicles match your criteria</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSelectedCategory("All");
                    setPriceRange([100, 1000]);
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </CustomerLayout>
  );
}

function FilterContent({
  selectedCategory,
  setSelectedCategory,
  priceRange,
  setPriceRange,
}: {
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  priceRange: number[];
  setPriceRange: (value: number[]) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Price Range */}
      <div className="p-4 bg-card rounded-2xl border border-border">
        <h3 className="font-semibold mb-4">Price Range</h3>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          max={1500}
          min={50}
          step={50}
          className="mb-4"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>${priceRange[0]}/day</span>
          <span>${priceRange[1]}/day</span>
        </div>
      </div>

      {/* Make */}
      <div className="p-4 bg-card rounded-2xl border border-border">
        <h3 className="font-semibold mb-4">Make</h3>
        <div className="space-y-2">
          {makes.map((make) => (
            <label key={make} className="flex items-center gap-2 cursor-pointer">
              <Checkbox />
              <span className="text-sm">{make}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Fuel Type */}
      <div className="p-4 bg-card rounded-2xl border border-border">
        <h3 className="font-semibold mb-4">Fuel Type</h3>
        <div className="space-y-2">
          {fuelTypes.map((fuel) => (
            <label key={fuel} className="flex items-center gap-2 cursor-pointer">
              <Checkbox />
              <span className="text-sm">{fuel}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
