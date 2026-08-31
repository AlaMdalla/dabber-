import type { LucideIcon } from "lucide-react";
import { Camera, PartyPopper, Tent, Shirt, Stethoscope, Home } from "lucide-react";

export interface Category {
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
  listingCount: number;
  note?: string;
}

export const categories: Category[] = [
  {
    slug: "materiel-medical",
    name: "Matériel médical & mobilité",
    description:
      "Lit médicalisé, fauteuil roulant, concentrateur d'oxygène, déambulateur, béquilles, matelas anti-escarres.",
    icon: Stethoscope,
    listingCount: 0,
    note: "L'adéquation doit être confirmée avec un professionnel qualifié.",
  },
  {
    slug: "audiovisuel",
    name: "Audiovisuel",
    description: "Caméras, objectifs, éclairage et microphones.",
    icon: Camera,
    listingCount: 0,
  },
  {
    slug: "evenementiel",
    name: "Événementiel",
    description: "Chaises, tables, vidéoprojecteurs et décoration.",
    icon: PartyPopper,
    listingCount: 0,
  },
  {
    slug: "camping-loisirs",
    name: "Camping et loisirs",
    description: "Tentes, sacs de couchage et matériel outdoor.",
    icon: Tent,
    listingCount: 0,
  },
  {
    slug: "mode-ceremonies",
    name: "Mode et cérémonies",
    description: "Robes de mariée, robes de soirée et tenues traditionnelles.",
    icon: Shirt,
    listingCount: 0,
  },
  {
    slug: "maison-quotidien",
    name: "Maison et quotidien",
    description: "Équipements du quotidien pour un usage temporaire.",
    icon: Home,
    listingCount: 0,
  },
];
