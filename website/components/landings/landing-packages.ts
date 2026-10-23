export const landingPackages = [
  { name: 'overlay', title: 'Overlay', en: 'A little room above your interface.', ko: '화면 위에, 필요한 만큼의 공간.' },
] as const;

export type LandingPackage = (typeof landingPackages)[number];

export function getLandingPackage(name: string) {
  return landingPackages.find(item => item.name === name);
}
