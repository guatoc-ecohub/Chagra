/**
 * App — entry root del Oracle frontend.
 *
 * Routing minimal sin react-router (overhead innecesario):
 *   /        → MainHud (full Jarvis)
 *   /lite    → LiteView (Nest Hub friendly)
 *   /cinema  → CinemaView (fullscreen demo)
 */
import { useEffect, useState } from 'react';
import { MainHud } from './scenes/MainHud';
import { LiteView } from './scenes/LiteView';

type Route = 'main' | 'lite' | 'cinema';

function getRouteFromPath(): Route {
  const p = location.pathname;
  if (p.startsWith('/lite')) return 'lite';
  if (p.startsWith('/cinema')) return 'cinema';
  return 'main';
}

export default function App() {
  const [route, setRoute] = useState<Route>(getRouteFromPath());

  useEffect(() => {
    const onPop = () => setRoute(getRouteFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (route === 'lite') return <LiteView />;
  return <MainHud />;
}
