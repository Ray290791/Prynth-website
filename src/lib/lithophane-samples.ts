// High-resolution curated sample photos for instant 3D lithophane previews.

export interface SamplePhoto {
  id: string;
  name: string;
  tag: string;
  url: string;
}

export const SAMPLE_PHOTOS: SamplePhoto[] = [
  {
    id: "couple",
    name: "Golden Sunset Couple",
    tag: "Romantic Gift",
    url: "/samples/couple.jpg",
  },
  {
    id: "pet",
    name: "Golden Retriever Pet",
    tag: "Pet Keepsake",
    url: "/samples/pet-dog.jpg",
  },
  {
    id: "family",
    name: "Beach Family Moment",
    tag: "Family Memories",
    url: "/samples/family.jpg",
  },
];
