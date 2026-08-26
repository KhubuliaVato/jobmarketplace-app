// ბეიჯები — სურათები assets/badges/ ფოლდერიდან
// ახლის დასამატებლად: PNG assets/badges/-ში + ობიექტი BADGES-ში
//                      + პირობა SQL ფუნქციაში award_badges()

import { ImageSourcePropType } from 'react-native';

export interface Badge {
  id: string;
  name: string;
  description: string;
  image: ImageSourcePropType;
  adminOnly?: boolean;   // მხოლოდ ადმინი ანიჭებს
}

export const BADGES: Badge[] = [
  // ---------- შესრულებული საქმეები ----------
  {
    id: 'first_job_completed',
    name: 'პირველი ნაბიჯი',
    description: 'შეასრულა პირველი საქმე',
    image: require('../../assets/badges/first_job_completed.png'),
  },
  {
    id: 'third_job_completed',
    name: 'დაწყებული გზა',
    description: 'შეასრულა 3 საქმე',
    image: require('../../assets/badges/third_job_completed.png'),
  },
  {
    id: 'tenth_job_completed',
    name: 'გამოცდილი',
    description: 'შეასრულა 10 საქმე',
    image: require('../../assets/badges/tenth_job_completed.png'),
  },
  {
    id: 'fiftieth_job_completed',
    name: 'ოსტატი',
    description: 'შეასრულა 50 საქმე',
    image: require('../../assets/badges/fiftieth_job_completed.png'),
  },
  {
    id: 'hundredth_job_completed',
    name: 'ლეგენდა',
    description: 'შეასრულა 100 საქმე',
    image: require('../../assets/badges/hundredth_job_completed.png'),
  },

  // ---------- დაპოსტილი საქმეები ----------
  {
    id: 'first_job_posted',
    name: 'პირველი შეკვეთა',
    description: 'დაასრულა პირველი დაპოსტილი საქმე',
    image: require('../../assets/badges/first_job_posted.png'),
  },
  {
    id: 'third_job_posted',
    name: 'აქტიური დამკვეთი',
    description: 'დაასრულა 3 დაპოსტილი საქმე',
    image: require('../../assets/badges/third_job_posted.png'),
  },
  {
    id: 'tenth_job_posted',
    name: 'გამოცდილი დამკვეთი',
    description: 'დაასრულა 10 დაპოსტილი საქმე',
    image: require('../../assets/badges/tenth_job_posted.png'),
  },
  {
    id: 'fiftieth_job_posted',
    name: 'დიდი დამკვეთი',
    description: 'დაასრულა 50 დაპოსტილი საქმე',
    image: require('../../assets/badges/fiftieth_job_posted.png'),
  },
  {
    id: 'hundredth_job_posted',
    name: 'ტოპ დამკვეთი',
    description: 'დაასრულა 100 დაპოსტილი საქმე',
    image: require('../../assets/badges/hundredth_job_posted.png'),
  },

  // ---------- სპეციალური ----------
  {
    id: 'verified_company',
    name: 'ვერიფიცირებული კომპანია',
    description: 'ადმინისტრაციის მიერ დადასტურებული',
    image: require('../../assets/badges/verified_company.png'),
  },
  {
    id: 'client_favorite',
    name: 'დამკვეთების ფავორიტი',
    description: 'აირჩიეს 20-ჯერ კონკურენციაში',
    image: require('../../assets/badges/client_favorite.png'),
  },
  {
    id: 'top_quality',
    name: 'მაღალი ხარისხი',
    description: '8 საქმე ზედიზედ 4+ ვარსკვლავით',
    image: require('../../assets/badges/top_quality.png'),
  },
  {
    id: 'trusted_professional',
    name: 'სანდო პროფესიონალი',
    description: '50 საქმე 5 ვარსკვლავით',
    image: require('../../assets/badges/trusted_professional.png'),
  },
  {
    id: 'fast_responder',
    name: 'სწრაფი რეაგირება',
    description: 'შეასრულა 20 სასწრაფო საქმე',
    image: require('../../assets/badges/fast_responder.png'),
  },
  {
    id: 'excellent_communication',
    name: 'უნაკლო კომუნიკაცია',
    description: '20 საქმე ზედიზედ, შეწყვეტის გარეშე',
    image: require('../../assets/badges/excellent_communication.png'),
  },
  {
    id: 'one_year_member',
    name: 'ერთი წელი ჩვენთან',
    description: '1 წელია რეგისტრირებული',
    image: require('../../assets/badges/one_year_member.png'),
  },
  {
    id: 'early_supporter',
    name: 'ადრეული მხარდამჭერი',
    description: 'პირველი 1000 მომხმარებელი',
    image: require('../../assets/badges/early_supporter.png'),
  },

  // ---------- ადმინის მიერ (კომპანიები) ----------
  {
    id: 'trusted_employer',
    name: 'სანდო დამსაქმებელი',
    description: 'ადმინისტრაციის მიერ მინიჭებული',
    image: require('../../assets/badges/trusted_employer.png'),
    adminOnly: true,
  },
  {
    id: 'reliable_company',
    name: 'საიმედო კომპანია',
    description: 'ადმინისტრაციის მიერ მინიჭებული',
    image: require('../../assets/badges/reliable_company.png'),
    adminOnly: true,
  },
  {
    id: 'premium_employer',
    name: 'პრემიუმ დამსაქმებელი',
    description: 'ადმინისტრაციის მიერ მინიჭებული',
    image: require('../../assets/badges/premium_employer.png'),
    adminOnly: true,
  },
  {
    id: 'active_hiring',
    name: 'აქტიურად ეძებს',
    description: 'ადმინისტრაციის მიერ მინიჭებული',
    image: require('../../assets/badges/active_hiring.png'),
    adminOnly: true,
  },
];

const BADGE_MAP: Record<string, Badge> = BADGES.reduce((acc, b) => {
  acc[b.id] = b;
  return acc;
}, {} as Record<string, Badge>);

export function getBadge(id: string): Badge | undefined {
  return BADGE_MAP[id];
}

// მოწესრიგებული სია — displayed_badges-ის რიგით
export function getBadgesByIds(ids?: string[] | null): Badge[] {
  if (!ids || ids.length === 0) return [];
  return ids.map(id => BADGE_MAP[id]).filter(Boolean) as Badge[];
}

// ადმინის მიერ მისანიჭებელი
export const ADMIN_BADGES = BADGES.filter(b => b.adminOnly);

// მაქსიმუმ რამდენი ჩანს ფონზე
export const MAX_DISPLAYED = 14;