"use strict";

const fixedLocationLevels = [1, 2, 3, 4, 5, 6];
const fixedLocationGroups = Array.from("ABCDEFGHIJKL", zone => ({
  zone,
  locations: fixedLocationLevels.map(level => `${zone}-${level}`)
}));
const fixedLocations = fixedLocationGroups.flatMap(group => group.locations);
