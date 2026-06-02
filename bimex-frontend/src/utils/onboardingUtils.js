const TOUR_STORAGE_KEY = "bimex.tour.completed";

export function shouldShowTour() {
  return localStorage.getItem(TOUR_STORAGE_KEY) !== "true";
}

export function restartTour() {
  localStorage.removeItem(TOUR_STORAGE_KEY);
}
