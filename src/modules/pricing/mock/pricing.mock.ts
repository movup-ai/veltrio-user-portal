import type { PricingTuple } from '../types/pricing.types'

export const PRICING: PricingTuple[] = [
  ['Peak season uplift', 'Dec 15 → Jan 5', 'All classes · all locations', '+22%', 'Active', true],
  ['Weekend surcharge', 'Fri 16:00 → Mon 10:00', 'SUV, Luxury SUV', '+15%', 'Active', true],
  ['Weekly discount', '7+ day rentals', 'All classes', '−12%', 'Active', true],
  ['Spring break uplift', 'Mar 1 → Mar 24', 'Miami Beach only', '+28%', 'Scheduled', true],
  ['Airport surcharge', 'Always', 'Orlando Intl. pickups', '+$18/day', 'Active', true],
  ['EV promo rate', 'Sep 1 → Oct 31', 'Electric sedan', '−8%', 'Active', true],
  ['Corporate account rate', 'Always', 'Economy, Sedan', '−15%', 'Paused', false],
  ['Young driver fee', 'Drivers under 25', 'All classes', '+$29/day', 'Active', true],
]
