export interface Business {
  slug: string;
  name: string;
  location: string;
  category: string;
  listingCount: number;
  verified: boolean;
  image: string;
}

export const businesses: Business[] = [];
