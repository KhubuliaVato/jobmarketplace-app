// პროფილის ფონები — ჩვენს მიერ შეთავაზებული პრესეტები
// ახლის დასამატებლად უბრალოდ ჩაამატე ობიექტი სიაში

export interface Cover {
  id: string;
  name: string;
  colors: string[];   // გრადიენტის ფერები
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  dark?: boolean;     // ღია ტექსტი სჭირდება?
}

export const COVERS: Cover[] = [
  {
    id: 'default',
    name: 'იისფერი',
    colors: ['#5B42F5', '#8B7BFF'],
    start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
    dark: true,
  },
  {
    id: 'midnight',
    name: 'შუაღამე',
    colors: ['#0f2027', '#203a43', '#2c5364'],
    start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
    dark: true,
  },
  {
    id: 'sunset',
    name: 'მზის ჩასვლა',
    colors: ['#ff9500', '#ff453a'],
    start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
    dark: true,
  },
  {
    id: 'ocean',
    name: 'ოკეანე',
    colors: ['#00c7be', '#0080ff'],
    start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
    dark: true,
  },
  {
    id: 'forest',
    name: 'ტყე',
    colors: ['#134e5e', '#71b280'],
    start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
    dark: true,
  },
  {
    id: 'rose',
    name: 'ვარდი',
    colors: ['#ee9ca7', '#ffdde1'],
    start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
    dark: false,
  },
  {
    id: 'gold',
    name: 'ოქრო',
    colors: ['#f7971e', '#ffd200'],
    start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
    dark: false,
  },
  {
    id: 'grape',
    name: 'ყურძენი',
    colors: ['#8e2de2', '#4a00e0'],
    start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
    dark: true,
  },
  {
    id: 'graphite',
    name: 'გრაფიტი',
    colors: ['#232526', '#414345'],
    start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
    dark: true,
  },
  {
    id: 'mint',
    name: 'პიტნა',
    colors: ['#11998e', '#38ef7d'],
    start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
    dark: true,
  },
  {
    id: 'cherry',
    name: 'ალუბალი',
    colors: ['#eb3349', '#f45c43'],
    start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
    dark: true,
  },
  {
    id: 'sky',
    name: 'ცა',
    colors: ['#2980b9', '#6dd5fa', '#ffffff'],
    start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
    dark: false,
  },
];

export function getCover(id?: string | null): Cover {
  return COVERS.find(c => c.id === id) || COVERS[0];
}