import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    title: 'Wardio — LoL companion',
  },
  {
    path: 'champions',
    loadComponent: () =>
      import('./pages/champions/champions').then((m) => m.Champions),
    title: 'Champions — Wardio',
  },
  {
    path: 'champions/:key',
    loadComponent: () =>
      import('./pages/champion-detail/champion-detail').then(
        (m) => m.ChampionDetail,
      ),
    title: 'Champion — Wardio',
  },
  { path: '**', redirectTo: '' },
];
