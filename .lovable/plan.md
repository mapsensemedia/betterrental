

## Fix: Young Additional Driver Double-Charging

### Problem
When a young (20-24) additional driver is added, the system charges them the base driver fee AND the young driver fee. The young rate should be the TOTAL daily rate for that driver, not an extra surcharge on top of the base fee.

**Current (wrong):**
- 1 young driver = ($14.99 base + $19.99 young) x 4 days = $139.92

**Expected (correct):**
- 1 young driver = $19.99/day x 4 days = $79.96

### Root Cause
In `calculateAdditionalDriversCost`, `baseFees` counts ALL drivers (including young ones), then `youngDriverFees` adds more on top. Young drivers should be excluded from the base count.

### Changes

#### 1. `src/components/rental/AdditionalDriversCard.tsx`

**`calculateAdditionalDriversCost` function** -- fix the logic so young drivers are only charged the young rate:
```
baseFees = standardDriverCount * baseDriverFee * rentalDays
youngDriverFees = youngDriverCount * youngDriverFee * rentalDays
total = baseFees + youngDriverFees
```

**Card UI** -- update the local totals to match:
```
totalBaseFees = standardDrivers.length * baseDriverFee * rentalDays
totalYoungFees = youngDriverCount * youngDriverFee * rentalDays
```

#### 2. `src/components/rental/BookingSummaryPanel.tsx`

Update the breakdown labels:
- Base fees line: show only standard driver count (not total)
- Young surcharge line: label as "Young drivers" (not "Young surcharge") since it's their full rate

**Before:**
```
1 x $14.99/day x 4 days        $59.96
Young surcharge (1 x $19.99)    $79.96
```

**After:**
```
[only shown if standard drivers exist]
1 x $14.99/day x 4 days        $59.96

[only shown if young drivers exist]  
Young drivers (1 x $19.99/day x 4 days)  $79.96
```

### Files Modified
1. `src/components/rental/AdditionalDriversCard.tsx` -- fix calculation + card display
2. `src/components/rental/BookingSummaryPanel.tsx` -- fix breakdown labels
