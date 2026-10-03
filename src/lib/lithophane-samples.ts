// Single curated high-resolution sample photo for instant 3D lithophane preview.

export interface SamplePhoto {
  id: string;
  name: string;
  tag: string;
  url: string;
}

export const DEFAULT_SAMPLE_PHOTO: SamplePhoto = {
  id: "couple",
  name: "Golden Sunset Couple",
  tag: "Romantic Keepsake",
  url: "/samples/couple.jpg",
};

export const SAMPLE_PHOTOS: SamplePhoto[] = [DEFAULT_SAMPLE_PHOTO];
