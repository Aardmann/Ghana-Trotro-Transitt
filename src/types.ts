
export interface Stop {
  id: string;
  name: string;
  coords: [number, number];
}

export interface Route {
  id: string;
  from: string;
  to: string;
  fare: number;
  distance?: number;
  intermediates?: Stop[];
}

export interface Route {
  id: string;
  from: string;
  to: string;
  fare: number;
  transport: string;
}
