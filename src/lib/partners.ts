export type CityPartner = {
  label: string;
  href: string;
  headerPrefix?: string;
  headerLabel?: string;
};

export const CITY_PARTNERS: CityPartner[] = [
  {
    label: "San Jose Parks, Recreation, and Neighborhood Services",
    headerPrefix: "San Jose ",
    headerLabel: "Parks, Recreation, and Neighborhood Services",
    href: "https://www.sanjoseca.gov/your-government/departments-offices/parks-recreation-neighborhood-services",
  },
  {
    label: "Public Works",
    href: "https://www.sanjoseca.gov/your-government/departments-offices/public-works",
  },
  {
    label: "Department of Transportation",
    href: "https://www.sanjoseca.gov/your-government/departments-offices/transportation",
  },
];
